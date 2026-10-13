import express from 'express';
import {createServer} from 'node:http';
import {performance} from 'node:perf_hooks';
import {Server} from 'socket.io';
import {Room,token,hashToken} from './room.mjs';
import {Persistence} from './persistence.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export async function startServer({port=Number(process.env.PORT)||3000,persistenceUrl=process.env.REDIS_URL,quiet=false}={}){
 const app=express(),http=createServer(app),origins=(process.env.CLIENT_ORIGIN||'https://fernandobalbino.github.io,http://localhost:3000,http://127.0.0.1:3000').split(',');
 let closing=false;const rooms=new Map(),store=new Persistence(persistenceUrl),connections=new Map(),creationRates=new Map();
 const originAllowed=origin=>!origin||origins.includes(origin);
 const io=new Server(http,{cors:{origin:(origin,cb)=>cb(null,originAllowed(origin)),methods:['GET','POST']},allowRequest:(request,cb)=>cb(null,originAllowed(request.headers.origin)),maxHttpBufferSize:32768,pingInterval:10000,pingTimeout:20000});
 const metrics={ticks:0,tickTotal:0,tickMax:0,packets:0,bytes:0,started:Date.now()};let lastCpu=process.cpuUsage(),cpuAt=performance.now(),cpuPercent=0;
 await store.connect();
 function wire(room){
  room.onCritical=event=>{store.save(room);for(const socket of connections.values())if(socket.data.code===room.code)socket.emit('critical',{id:event.id,version:event.version,type:event.type,clock:room.clock});};
  room.notify=(id,type,data)=>{for(const socket of connections.values())if(socket.data.code===room.code&&socket.data.playerId===id)socket.emit('notice',{type,...data});};
  room.broadcast=(type,data)=>io.to(room.code).emit('notice',{type,...data});return room;
 }
 for(const saved of await store.restore()){
  const room=wire(new Room({saved}));room.teacherConnected=false;
  for(const p of room.players){p.connected=false;p.disconnectAt=room.clock;p.input={x:0,y:0};p.lastInputSeq=0;}
  room.recovering=room.status==='PLAYING';rooms.set(room.code,room);
 }
 app.get('/health',(req,res)=>res.status(closing?503:200).json({ready:!closing,persistence:store.ready?'available':store.client?'unavailable':'not-configured',restartRecovery:store.ready,uptime:process.uptime(),version:'1.0.0'}));
 const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
 app.use('/shared',express.static(path.join(root,'shared')));app.use(express.static(path.join(root,'client')));
 function sendSnapshot(socket,includeMap=false){
  const room=rooms.get(socket.data.code);if(!room)return;
  const p=room.players.find(p=>p.id===socket.data.playerId),snapshot=room.snapshot(p,{includeMap,teacher:socket.data.role==='teacher'});snapshot.persistence=store.ready;
  const staticPlayer=({position,...actor})=>actor;
  const fingerprint=JSON.stringify({...snapshot,clock:0,version:0,viruses:undefined,players:snapshot.players.map(staticPlayer),me:snapshot.me?{...snapshot.me,position:undefined,remainingTime:0,lastInputSeq:0}:null,maze:undefined});
  const previous=socket.data.lastSnapshot;
  let kind='delta',packet;
  if(includeMap||!previous||socket.data.fingerprint!==fingerprint||room.clock-(socket.data.fullAt||0)>5000){kind='snapshot';packet=snapshot;socket.data.fingerprint=fingerprint;socket.data.fullAt=room.clock;}
  else{
   const positions=snapshot.players.map((actor,index)=>{const old=previous.players[index]?.position,pos=actor.position;return !old||pos.x!==old.x||pos.y!==old.y||pos.direction!==old.direction||pos.moving!==old.moving?[index,Math.round(pos.x*100)/100,Math.round(pos.y*100)/100,['down','left','right','up'].indexOf(pos.direction),Number(pos.moving)]:null;}).filter(Boolean);
   packet={clock:snapshot.clock,version:snapshot.version,positions,viruses:snapshot.viruses,me:snapshot.me?{position:snapshot.me.position,remainingTime:Math.round(snapshot.me.remainingTime*10)/10,lastInputSeq:snapshot.me.lastInputSeq}:null};
  }
  socket.data.lastSnapshot=snapshot;socket.emit(kind,packet);metrics.packets++;metrics.bytes+=Buffer.byteLength(JSON.stringify(packet));
 }
 function attach(socket,room,role,p){
  const key=`${room.code}:${role==='teacher'?'teacher':p.id}`,old=connections.get(key);
  socket.data={code:room.code,role,playerId:p?.id,rate:[]};connections.set(key,socket);if(old&&old!==socket)old.disconnect(true);
  socket.join(room.code);if(role==='teacher'){room.teacherConnected=true;}else room.reconnect(p);
  room.lastActiveAt=Date.now();sendSnapshot(socket,true);
 }
 io.on('connection',socket=>{
  socket.data.rate=[];
  socket.lobbyReceipts=[];
  function action(name,handler,{teacher=false,player=false,critical=true}={}){
   socket.on(name,(payload={},ack=()=>{})=>{
    const now=Date.now();socket.data.rate=socket.data.rate.filter(t=>t>now-1000);if(socket.data.rate.length>=40){ack({ok:false,error:'Muitas mensagens. Aguarde um instante.'});return;}socket.data.rate.push(now);
    const room=rooms.get(socket.data.code),p=room?.players.find(p=>p.id===socket.data.playerId);
    if(teacher&&socket.data.role!=='teacher'||player&&(!p||p.removed)){ack({ok:false,error:'Operação não autorizada.'});return;}
    const run=async()=>{
     try{
      if(closing)throw new Error('Servidor reiniciando. Reconecte em instantes.');
      const receiptId=payload.requestId;
      if(['room:create','room:join'].includes(name)){const cached=socket.lobbyReceipts.find(r=>r.key===`${name}:${receiptId}`);if(cached){ack(cached.result);return;}}
      if(critical&&room&&(!receiptId||typeof receiptId!=='string'||receiptId.length>80))throw new Error('Identificador de operação inválido.');
      const receiptOwner=p||room,receiptKey=`${name}:${receiptId}`;
      const cached=receiptOwner?.receipts?.find(r=>r.key===receiptKey);if(cached){ack(cached.result);return;}
      const data=await handler(payload,room,p);
      const result={ok:true,...data,version:room?.version};
      if(['room:create','room:join'].includes(name)){socket.lobbyReceipts.push({key:`${name}:${receiptId}`,result});if(socket.lobbyReceipts.length>10)socket.lobbyReceipts.shift();}
      if(critical&&room){receiptOwner.receipts||=[];receiptOwner.receipts.push({key:receiptKey,result});if(receiptOwner.receipts.length>128)receiptOwner.receipts.shift();await store.save(room);}
      ack(result);if(room&&critical)for(const s of connections.values())if(s.data.code===room.code)sendSnapshot(s,name==='teacher:start');
     }catch(error){ack({ok:false,error:error.message});}
    };
    if(room&&critical){room.commandQueue=(room.commandQueue||Promise.resolve()).then(run,run);}else run();
   });
  }
  action('room:create',async payload=>{
   const ip=socket.handshake.address,rate=(creationRates.get(ip)||[]).filter(t=>t>Date.now()-60000);if(rate.length>=10||rooms.size>=100)throw new Error('Limite temporário de salas. Aguarde.');rate.push(Date.now());creationRates.set(ip,rate);
   let code;do{code=token().replace(/[^A-Z0-9]/gi,'').slice(0,6).toUpperCase();}while(code.length!==6||rooms.has(code));
   const secret=token(),room=wire(new Room({code,config:payload.config,teacherHash:hashToken(secret)}));rooms.set(code,room);attach(socket,room,'teacher');await store.save(room);return {code,token:secret,role:'teacher'};
  },{critical:false});
  action('room:join',async payload=>{
   if(socket.data.code)throw new Error('Você já está em uma sala.');
   const room=rooms.get(String(payload.code).trim().toUpperCase());if(!room)throw new Error('Sala não encontrada. Confira o código.');
   // Serializa inscrições para impedir ultrapassar a capacidade.
   let joined;const operation=(room.joinQueue||Promise.resolve()).then(()=>{joined=room.addPlayer(payload.name);});room.joinQueue=operation.catch(()=>{});await operation;
   attach(socket,room,'student',joined.player);await store.save(room);return {code:room.code,token:joined.sessionToken,playerId:joined.player.id,role:'student'};
  },{critical:false});
  action('room:resume',async payload=>{
   const room=rooms.get(String(payload.code).toUpperCase());if(!room)throw new Error('Esta sala não está mais disponível.');const digest=hashToken(payload.token);
   if(digest===room.teacherHash)attach(socket,room,'teacher');else{const p=room.players.find(p=>p.tokenHash===digest);if(!p)throw new Error('Sessão inválida.');attach(socket,room,'student',p);}
   return {code:room.code,role:socket.data.role,playerId:socket.data.playerId};
  },{critical:false});
  action('teacher:config',payload=>{rooms.get(socket.data.code).configure(payload.config);return {};},{teacher:true});
  action('teacher:redistribute',(_,room)=>{if(room.status!=='LOBBY')throw new Error('As equipes já estão definidas.');room.redistribute();return {};},{teacher:true});
  action('teacher:start',(_,room)=>{room.start();return {};},{teacher:true});
  action('teacher:continue',(_,room)=>{if(!room.recovering)throw new Error('A sala já está em andamento.');room.recovering=false;room.critical('recovered');return {};},{teacher:true});
  action('teacher:finish',(_,room)=>{room.finish('manual');return {};},{teacher:true});
  action('teacher:remove',(payload,room)=>{const p=room.players.find(p=>p.id===payload.playerId);if(!p)throw new Error('Aluno não encontrado.');room.remove(p);const s=connections.get(`${room.code}:${p.id}`);s?.emit('removed',{});s?.disconnect(true);return {};},{teacher:true});
  action('teacher:release',(payload,room)=>{const p=room.players.find(p=>p.id===payload.playerId&&!p.removed);if(!p)throw new Error('Aluno não encontrado.');room.release(p);return {};},{teacher:true});
  action('player:input',(payload,room,p)=>({accepted:room.setInput(p,payload)}),{player:true,critical:false});
  action('player:answer',(payload,room,p)=>room.answer(p,payload),{player:true});
  action('player:power',(payload,room,p)=>{room.choose(p,payload);return {};},{player:true});
  action('room:snapshot',(_,room)=>{sendSnapshot(socket,true);return {};},{critical:false});
  action('teacher:metrics',()=>({metrics:{...metrics,cpuPercent,memory:process.memoryUsage(),tickMean:metrics.tickTotal/Math.max(1,metrics.ticks),rooms:rooms.size}}),{teacher:true,critical:false});
  socket.on('disconnect',()=>{const room=rooms.get(socket.data.code);if(!room)return;const key=`${room.code}:${socket.data.role==='teacher'?'teacher':socket.data.playerId}`;if(connections.get(key)!==socket)return;connections.delete(key);if(socket.data.role==='teacher'){room.teacherConnected=false;room.critical('teacher-disconnect');}else{const p=room.players.find(p=>p.id===socket.data.playerId);if(p)room.disconnect(p);}});
 });
 const hz=clampHz(process.env.TICK_RATE,20),networkHz=clampHz(process.env.SNAPSHOT_RATE,10);let previous=performance.now();
 const tickTimer=setInterval(()=>{const now=performance.now(),dt=Math.min(.15,(now-previous)/1000);previous=now;const started=performance.now();for(const room of rooms.values())room.tick(dt);const elapsed=performance.now()-started;metrics.ticks++;metrics.tickTotal+=elapsed;metrics.tickMax=Math.max(metrics.tickMax,elapsed);},1000/hz);
 const snapshots=setInterval(()=>{for(const socket of connections.values())sendSnapshot(socket);},1000/networkHz);
 const checkpoints=setInterval(()=>{for(const room of rooms.values()){if([...connections.values()].some(s=>s.data.code===room.code))room.lastActiveAt=Date.now();if(Date.now()-room.lastActiveAt>7200000){rooms.delete(room.code);store.remove(room.code);}else store.save(room);}const usage=process.cpuUsage(lastCpu),now=performance.now();cpuPercent=(usage.user+usage.system)/((now-cpuAt)*1000)*100;lastCpu=process.cpuUsage();cpuAt=now;},2000);
 await new Promise(resolve=>http.listen(port,'0.0.0.0',resolve));if(!quiet)console.log(`LabirintoOnline pronto na porta ${http.address().port}. Persistência: ${store.ready?'ativa':'indisponível'}.`);
 async function close(){if(closing)return;closing=true;clearInterval(tickTimer);clearInterval(snapshots);clearInterval(checkpoints);for(const room of rooms.values())await store.save(room);await store.close();await new Promise(resolve=>io.close(resolve));if(http.listening)await new Promise(resolve=>http.close(resolve));}
 return {http,io,rooms,store,metrics,close,port:http.address().port};
}
function clampHz(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>=5&&n<=60?n:fallback;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=await startServer();for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await server.close();process.exit(0);});
}
