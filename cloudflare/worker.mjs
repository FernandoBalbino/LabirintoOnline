import {DurableObject} from 'cloudflare:workers';
import {Room,token,hashToken} from '../server/room.mjs';
const ALLOWED=['https://fernandobalbino.github.io','http://localhost:3000','http://127.0.0.1:3000','http://localhost:3001','http://127.0.0.1:3001','http://localhost:8787'];
const json=(data,status=200,origin)=>Response.json(data,{status,headers:origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}});
export default{
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if(origin&&!ALLOWED.includes(origin))return json({ok:false,error:'Origem não autorizada.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin||ALLOWED[0],'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}});
  if(url.pathname==='/health')return json({ready:true,persistence:'sqlite',restartRecovery:true,platform:'cloudflare',version:'1.1.0'},200,origin);
  if(request.method==='GET'&&/^\/ws\/[A-Z0-9]{6}$/.test(url.pathname))return env.ROOMS.get(env.ROOMS.idFromName(url.pathname.slice(4)),{locationHint:'sam'}).fetch(request);
  if(request.method!=='POST'||!/^\/room\/(create|join|resume)$/.test(url.pathname))return json({ok:false,error:'Rota não encontrada.'},404,origin);
  if(Number(request.headers.get('Content-Length'))>32768)return json({ok:false,error:'Mensagem muito grande.'},413,origin);
  let payload;try{payload=await request.json();}catch{return json({ok:false,error:'Dados inválidos.'},400,origin);}
  if(!payload.requestId||typeof payload.requestId!=='string'||payload.requestId.length>80)return json({ok:false,error:'Identificador inválido.'},400,origin);
  const code=url.pathname.endsWith('create')?parseInt(hashToken(payload.requestId).slice(0,10),16).toString(36).slice(-6).toUpperCase().padStart(6,'0'):String(payload.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}$/.test(code))return json({ok:false,error:'Código da sala inválido.'},400,origin);
  const stub=env.ROOMS.get(env.ROOMS.idFromName(code),{locationHint:'sam'});
  const response=await stub.fetch(new Request(`https://room.internal${url.pathname}`,{method:'POST',headers:{'Content-Type':'application/json','X-Room-Code':code},body:JSON.stringify(payload)}));
  return json(await response.json(),response.status,origin);
 }
};
export class ArenaRoom extends DurableObject{
 constructor(ctx,env){
  super(ctx,env);this.peers=new Map();this.metrics={ticks:0,packets:0,bytes:0,tickDelayMaxMs:0};this.lastActiveAt=Date.now();this.timer=null;this.lastCheckpoint=0;this.dirty=false;
  ctx.blockConcurrencyWhile(async()=>{
   const saved=await ctx.storage.get('state');
   if(saved&&Date.now()-saved.lastActiveAt<7200000){this.room=new Room({saved:saved.room});this.createReceipt=saved.createReceipt;this.joinReceipts=saved.joinReceipts||[];this.lastActiveAt=saved.lastActiveAt;this.wire();
    for(const ws of ctx.getWebSockets()){const info=ws.deserializeAttachment();if(info?.role)this.peers.set(ws,{...info,rate:[]});}
    this.room.teacherConnected=[...this.peers.values()].some(p=>p.role==='teacher');
    for(const p of this.room.players){p.connected=[...this.peers.values()].some(peer=>peer.playerId===p.id);p.input={x:0,y:0};p.lastInputSeq=0;if(!p.connected)p.disconnectAt=this.room.clock;}
    this.room.recovering=this.room.status==='PLAYING';
   }else if(saved)await ctx.storage.deleteAll();
  });
 }
 wire(){const r=this.room;r.onCritical=event=>{this.dirty=true;this.broadcast('critical',{id:event.id,version:event.version,type:event.type,clock:r.clock});};r.notify=(id,type,data)=>{for(const [ws,p]of this.peers)if(p.playerId===id)this.send(ws,'notice',{type,...data});};r.broadcast=(type,data)=>this.broadcast('notice',{type,...data});}
 async save(){if(!this.room)return;this.dirty=false;await this.ctx.storage.put('state',{room:this.room.serialize(),createReceipt:this.createReceipt,joinReceipts:this.joinReceipts||[],lastActiveAt:this.lastActiveAt});await this.ctx.storage.setAlarm(this.lastActiveAt+7200000);}
 async alarm(){if(Date.now()-this.lastActiveAt>=7200000&&!this.peers.size){this.stop();this.room=null;await this.ctx.storage.deleteAll();}else await this.ctx.storage.setAlarm(this.lastActiveAt+7200000);}
 async fetch(request){
  const url=new URL(request.url);let payload;
  if(request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   if(!this.room)return json({ok:false,error:'Sala não encontrada.'},404);
   if(this.peers.size>=32)return json({ok:false,error:'Limite de conexões desta sala.'},429);
   const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);const peer={rate:[],unauthenticated:true};this.peers.set(server,peer);
   peer.authTimer=setTimeout(()=>{if(peer.unauthenticated){this.peers.delete(server);server.close(1008,'Autenticação necessária');}},10000);
   return new Response(null,{status:101,webSocket:client});
  }
  try{
   payload=await request.json();let result;
   if(url.pathname==='/room/create'){
    if(this.room){if(this.createReceipt?.id!==payload.requestId)throw new Error('Código ocupado. Crie a sala novamente.');return json(this.createReceipt.result);}
    const secret=token();this.room=new Room({code:request.headers.get('X-Room-Code'),teacherHash:hashToken(secret),config:payload.config});this.wire();this.joinReceipts=[];
    result={ok:true,code:this.room.code,token:secret,role:'teacher'};this.createReceipt={id:payload.requestId,result};
   }else{
    if(!this.room)throw new Error('Sala não encontrada. Confira o código.');
    if(url.pathname==='/room/join'){
     const cached=this.joinReceipts.find(r=>r.id===payload.requestId);if(cached)return json(cached.result);
     const joined=this.room.addPlayer(payload.name);result={ok:true,code:this.room.code,token:joined.sessionToken,playerId:joined.player.id,role:'student'};this.joinReceipts.push({id:payload.requestId,result});
     if(this.joinReceipts.length>128)this.joinReceipts.shift();
    }else{const identity=this.identify(payload.token);result={ok:true,code:this.room.code,token:payload.token,role:identity.role,playerId:identity.playerId};}
   }
   this.lastActiveAt=Date.now();await this.save();return json(result);
  }catch(error){return json({ok:false,error:error.message},400);}
 }
 identify(secret){const digest=hashToken(secret);if(digest===this.room.teacherHash)return {role:'teacher'};const p=this.room.players.find(p=>!p.removed&&p.tokenHash===digest);if(!p)throw new Error('Sessão inválida.');return {role:'student',playerId:p.id};}
 send(ws,event,data,id){try{const packet=JSON.stringify({event,data,...id?{id}:{}});ws.send(packet);this.metrics.packets++;this.metrics.bytes+=packet.length;}catch{}}
 broadcast(event,data){for(const [ws,peer]of this.peers)if(peer.role)this.send(ws,event,data);}
 snapshots(includeMap=false){for(const [ws,p]of this.peers)if(p.role)this.snapshot(ws,p,includeMap);}
 snapshot(ws,peer,includeMap=false){
  const r=this.room,p=r.players.find(p=>p.id===peer.playerId),snapshot=r.snapshot(p,{teacher:peer.role==='teacher',includeMap});snapshot.persistence=true;snapshot.hosting='cloudflare';
  const fingerprint=JSON.stringify({...snapshot,clock:0,version:0,viruses:undefined,players:snapshot.players.map(({position,...actor})=>actor),me:snapshot.me?{...snapshot.me,position:undefined,remainingTime:0,lastInputSeq:0}:null,maze:undefined});
  const previous=peer.previous;
  if(includeMap||!previous||peer.fingerprint!==fingerprint||r.clock-(peer.fullAt||0)>5000){this.send(ws,'snapshot',snapshot);peer.fingerprint=fingerprint;peer.fullAt=r.clock;}
  else{
   const positions=snapshot.players.map((actor,index)=>{const old=previous.players[index]?.position,pos=actor.position;return !old||pos.x!==old.x||pos.y!==old.y||pos.direction!==old.direction||pos.moving!==old.moving?[index,Math.round(pos.x*100)/100,Math.round(pos.y*100)/100,['down','left','right','up'].indexOf(pos.direction),Number(pos.moving)]:null;}).filter(Boolean);
   this.send(ws,'delta',{clock:snapshot.clock,version:snapshot.version,positions,viruses:snapshot.viruses,me:p?{position:p.position,remainingTime:Math.round(p.remainingTime*10)/10,lastInputSeq:p.lastInputSeq}:null});
  }peer.previous=snapshot;
 }
 startTimer(){
  if(this.timer||this.room.status!=='PLAYING'||this.room.recovering)return;this.previousAt=Date.now();this.networkAt=Date.now();this.lastCheckpoint=Date.now();
  this.timer=setInterval(()=>{
   const now=Date.now(),gap=now-this.previousAt;this.previousAt=now;this.metrics.tickDelayMaxMs=Math.max(this.metrics.tickDelayMaxMs,Math.max(0,gap-50));
   let dt=Math.min(.15,gap/1000);while(dt>0){const step=Math.min(.05,dt);this.room.tick(step);dt-=step;}this.metrics.ticks++;
   if(now-this.networkAt>=100){this.networkAt=now;this.snapshots();}
   if(this.peers.size)this.lastActiveAt=now;
   if(this.dirty||now-this.lastCheckpoint>=2000){this.lastCheckpoint=now;this.ctx.waitUntil(this.save());}
   if(this.room.status!=='PLAYING'){this.snapshots();this.stop();}
  },50);
 }
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
 async webSocketMessage(ws,raw){
  const peer=this.peers.get(ws);if(!peer||typeof raw!=='string'||raw.length>32768){ws.close(1008,'Mensagem inválida');return;}
  let message;try{message=JSON.parse(raw);}catch{return;}
  const now=Date.now();peer.rate=(peer.rate||[]).filter(t=>t>now-1000);if(peer.rate.length>=40)return;peer.rate.push(now);
  const {event,id,payload={}}=message;
  if(event==='session'){
   try{const identity=this.identify(payload.token);clearTimeout(peer.authTimer);for(const [old,other]of this.peers)if(old!==ws&&other.role===identity.role&&other.playerId===identity.playerId){this.peers.delete(old);old.close(4009,'Sessão retomada em outro dispositivo');}
    Object.assign(peer,identity,{unauthenticated:false});ws.serializeAttachment(identity);if(identity.role==='teacher')this.room.teacherConnected=true;else this.room.reconnect(this.room.players.find(p=>p.id===identity.playerId));
    this.lastActiveAt=now;await this.save();this.send(ws,'ack',{ok:true},id);this.snapshot(ws,peer,true);this.snapshots();this.startTimer();
   }catch(error){this.send(ws,'ack',{ok:false,error:error.message},id);ws.close(1008,'Sessão inválida');}return;
  }
  if(!peer.role)return;
  if(event==='player:input'){if(peer.role==='student')this.room.setInput(this.room.players.find(p=>p.id===peer.playerId),payload);return;}
  const run=async()=>{
   try{
    if(typeof id!=='string'||id.length>80)throw new Error('Identificador inválido.');
    const r=this.room,p=r.players.find(p=>p.id===peer.playerId),owner=p||r,key=`${event}:${id}`,cached=owner.receipts?.find(v=>v.key===key);if(cached){this.send(ws,'ack',cached.result,id);return;}
    if(event.startsWith('teacher:')&&peer.role!=='teacher')throw new Error('Operação não autorizada.');
    if(event.startsWith('player:')&&(!p||p.removed))throw new Error('Operação não autorizada.');
    let data={};
    if(event==='teacher:config')r.configure(payload.config);
    else if(event==='teacher:redistribute'){if(r.status!=='LOBBY')throw new Error('As equipes já estão definidas.');r.redistribute();}
    else if(event==='teacher:start')r.start();
    else if(event==='teacher:continue'){if(!r.recovering)throw new Error('A sala já está em andamento.');r.recovering=false;r.critical('recovered');}
    else if(event==='teacher:finish')r.finish('manual');
    else if(event==='teacher:release'){const pupil=r.players.find(a=>a.id===payload.playerId&&!a.removed);if(!pupil)throw new Error('Aluno não encontrado.');r.release(pupil);}
    else if(event==='teacher:remove'){const pupil=r.players.find(a=>a.id===payload.playerId);if(!pupil)throw new Error('Aluno não encontrado.');r.remove(pupil);for(const [socket,person]of this.peers)if(person.playerId===pupil.id){this.send(socket,'removed',{});this.peers.delete(socket);socket.close(1000,'Participação encerrada');}}
    else if(event==='player:answer')data=r.answer(p,payload);
    else if(event==='player:power')r.choose(p,payload);
    else if(event==='room:snapshot'){this.snapshot(ws,peer,true);this.send(ws,'ack',{ok:true},id);return;}
    else if(event==='teacher:metrics'){this.send(ws,'ack',{ok:true,metrics:{...this.metrics,clock:r.clock,platform:'cloudflare',rooms:1,tickMax:null,tickMean:null,cpuPercent:null,memory:{rss:null,heapUsed:null}}},id);return;}
    else throw new Error('Operação desconhecida.');
    const result={ok:true,...data,version:r.version};owner.receipts||=[];owner.receipts.push({key,result});if(owner.receipts.length>128)owner.receipts.shift();this.lastActiveAt=Date.now();await this.save();this.send(ws,'ack',result,id);this.snapshots(event==='teacher:start');this.startTimer();
   }catch(error){this.send(ws,'ack',{ok:false,error:error.message},id);}
  };this.commandQueue=(this.commandQueue||Promise.resolve()).then(run,run);await this.commandQueue;
 }
 async webSocketClose(ws){const peer=this.peers.get(ws);clearTimeout(peer?.authTimer);this.peers.delete(ws);if(peer?.role&&this.room){if(peer.role==='teacher')this.room.teacherConnected=false;else{const p=this.room.players.find(p=>p.id===peer.playerId);if(p)this.room.disconnect(p);}this.lastActiveAt=Date.now();await this.save();this.snapshots();}if(!this.peers.size){this.stop();if(this.room?.status==='PLAYING')this.room.recovering=true;}}
 async webSocketError(ws){await this.webSocketClose(ws);}
}
