import {io} from 'socket.io-client';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {findShortestPath,positionToCell} from '../shared/maze-core.mjs';
import {challengeById} from '../server/challenges.mjs';
const args=process.argv.slice(2),option=(name,fallback)=>{const index=args.indexOf(`--${name}`);return index>=0?args[index+1]:fallback;};
const url=option('url','http://localhost:3000'),duration=Number(option('seconds','1800')),output=option('output','docs/load-report.json');
const started=performance.now(),stats={url,requestedSeconds:duration,startedAt:new Date().toISOString(),rounds:0,inputs:0,answers:0,chests:0,powers:{},inflections:0,escapes:0,intentionalDisconnects:0,unexpectedDisconnects:0,reconnections:0,reconnectMs:[],latencies:[],syncDelayMs:[],packets:0,packetBytes:0,errors:[],samples:[],finishedRounds:[]};
let running=true,roundBusy=false,clients=[],teacher=null,currentCode=null,roundStarted=0;
function request(socket,event,payload={}){const time=performance.now();return new Promise((resolve,reject)=>socket.timeout(10000).emit(event,{requestId:crypto.randomUUID(),...payload},(error,result)=>{stats.latencies.push(performance.now()-time);if(stats.latencies.length>100000)stats.latencies.shift();if(error)return reject(error);if(!result?.ok)return reject(new Error(result?.error||'Falha de comando'));resolve(result);}));}
function merge(client,d){if(!client.state)return;const s={...client.state,clock:d.clock,version:d.version,viruses:d.viruses,players:client.state.players.map(p=>({...p,position:{...p.position}})),me:{...client.state.me,...d.me}};for(const [index,x,y,direction,moving]of d.positions)if(s.players[index])s.players[index].position={x,y,direction:['down','left','right','up'][direction],moving:!!moving};client.state=s;}
async function connectClient(role,index=0){
 const socket=io(url,{autoConnect:false,reconnection:true,reconnectionDelay:300,reconnectionDelayMax:2000,timeout:20000,transports:['websocket','polling']});
 const client={socket,index,state:null,maze:null,seq:0,busy:false,planned:false,goal:null,path:[],pathAt:0,token:null,role};
 socket.on('snapshot',s=>{observeCadence(client,s);const old=client.state;client.state=s;if(s.maze)client.maze=s.maze;if(old?.me?.state!==s.me?.state){if(s.me?.state==='INFECTED')stats.inflections++;if(s.me?.state==='ESCAPED')stats.escapes++;}if(client.state.me?.teleportVersion!==old?.me?.teleportVersion)client.path=[];countPacket(s);});
 socket.on('delta',d=>{observeCadence(client,d);merge(client,d);countPacket(d);});
 socket.on('disconnect',()=>{if(!running||roundBusy)return;if(client.planned)stats.intentionalDisconnects++;else stats.unexpectedDisconnects++;client.lostAt=performance.now();});
 socket.on('connect',async()=>{client.seq=0;if(client.token&&running&&!roundBusy){try{await request(socket,'room:resume',{code:currentCode,token:client.token});if(client.lostAt){stats.reconnections++;stats.reconnectMs.push(performance.now()-client.lostAt);client.lostAt=null;client.planned=false;}}catch(e){stats.errors.push(e.message);}}});
 socket.connect();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Conexão não estabelecida')),90000);socket.once('connect',()=>{clearTimeout(timer);resolve();});});return client;
}
function countPacket(data){stats.packets++;stats.packetBytes+=Buffer.byteLength(JSON.stringify(data));}
function observeCadence(client,data){const now=performance.now();if(client.lastArrival&&data.clock>client.lastClock){stats.syncDelayMs.push(Math.max(0,(now-client.lastArrival)-(data.clock-client.lastClock)));if(stats.syncDelayMs.length>100000)stats.syncDelayMs.shift();}client.lastArrival=now;client.lastClock=data.clock;}
async function newRound(){
 roundBusy=true;for(const c of clients)c.socket.disconnect();teacher?.socket.disconnect();clients=[];
 teacher=await connectClient('teacher');const created=await request(teacher.socket,'room:create',{config:{name:'Carga automatizada • 24 clientes',maxPlayers:24,teamCount:2,timeLimit:150}});currentCode=created.code;teacher.token=created.token;
 for(let i=0;i<24;i++){const c=await connectClient('student',i),joined=await request(c.socket,'room:join',{code:currentCode,name:`Carga ${String(i+1).padStart(2,'0')}`});c.token=joined.token;clients.push(c);}
 await request(teacher.socket,'teacher:start');stats.rounds++;roundStarted=performance.now();roundBusy=false;console.log(`Rodada ${stats.rounds}: 24 clientes conectados.`);
}
function steer(c){
 const s=c.state,p=s?.me;if(!p||!c.maze||s.status!=='PLAYING')return;
 if(p.state==='ANSWERING'&&!p.successAt){if(c.busy)return;c.busy=true;const question=challengeById.get(p.challenge.id);request(c.socket,'player:answer',{challengeId:question.id,questionSerial:p.challenge.questionSerial,response:question.solution}).then(()=>stats.answers++).catch(e=>{if(!/disponível|Conexão/.test(e.message))stats.errors.push(e.message);}).finally(()=>c.busy=false);return;}
 if(p.powerChoice){if(c.busy)return;c.busy=true;const ids=p.powerChoice.ids,powerId=[...ids].sort((a,b)=>(stats.powers[a]||0)-(stats.powers[b]||0))[0];request(c.socket,'player:power',{choiceId:p.powerChoice.id,powerId}).then(()=>{stats.chests++;stats.powers[powerId]=(stats.powers[powerId]||0)+1;}).catch(e=>{if(!/inválida/.test(e.message))stats.errors.push(e.message);}).finally(()=>c.busy=false);return;}
 if(p.state==='ESCAPED'||p.state==='ANSWERING')return;
 let destination=c.maze.exit;
 if(p.state==='INFECTED'){
  const target=s.players.filter(a=>['EXPLORING','ANSWERING'].includes(a.state)).sort((a,b)=>Math.hypot(a.position.x-p.position.x,a.position.y-p.position.y)-Math.hypot(b.position.x-p.position.x,b.position.y-p.position.y))[0];if(target)destination=positionToCell(target.position);
 }else if(c.index%3!==0){const chest=p.chests.filter(chest=>!chest.opened).sort((a,b)=>Math.hypot(a.x*36-p.position.x,a.y*36-p.position.y)-Math.hypot(b.x*36-p.position.x,b.y*36-p.position.y))[0];if(chest)destination=chest;}
 const now=performance.now();if(now-c.pathAt>800||!c.path.length||c.goal!==`${destination.x},${destination.y}`){let grid=c.maze.grid;if(s.walls.length){grid=grid.map(r=>[...r]);for(const w of s.walls)grid[w.y][w.x]=1;}c.path=findShortestPath({...c.maze,grid},positionToCell(p.position),destination);c.goal=`${destination.x},${destination.y}`;c.pathAt=now;}
 let target=c.path[0];while(target&&Math.abs((target.x+.5)*36-p.position.x)<=8&&Math.abs((target.y+.5)*36-p.position.y)<=8){c.path.shift();target=c.path[0];}
 let x=0,y=0;if(target){const dx=(target.x+.5)*36-p.position.x,dy=(target.y+.5)*36-p.position.y;if(Math.abs(dx)>8)x=Math.sign(dx);else if(Math.abs(dy)>8)y=Math.sign(dy);}
 if(p.effects.invertUntil>s.clock){x=-x;y=-y;}c.socket.volatile.emit('player:input',{seq:++c.seq,x,y});stats.inputs++;
}
try{
 await newRound();
 const inputTimer=setInterval(()=>{if(!roundBusy)for(const c of clients)if(c.socket.connected)steer(c);},100);
 let lastReconnect=performance.now(),lastSample=0,lastProgress=0;
 while(performance.now()-started<duration*1000){
  await new Promise(resolve=>setTimeout(resolve,500));const now=performance.now();
  if(!roundBusy&&['FINISHED','CANCELLED'].includes(teacher.state?.status)){stats.finishedRounds.push(teacher.state.result);await newRound();}
  if(!roundBusy&&now-lastReconnect>45000){const c=clients[Math.floor(Math.random()*clients.length)];if(c.socket.connected){c.planned=true;c.socket.disconnect();setTimeout(()=>{if(running)c.socket.connect();},1500);}lastReconnect=now;}
  if(!roundBusy&&now-lastSample>10000){try{const sample=await request(teacher.socket,'teacher:metrics');stats.samples.push({elapsedSeconds:(now-started)/1000,connected:clients.filter(c=>c.socket.connected).length,...sample.metrics});}catch(e){stats.errors.push(e.message);}lastSample=now;}
  if(now-lastProgress>60000){console.log(`${Math.floor((now-started)/1000)}s: ${stats.inputs} comandos, ${stats.answers} respostas, ${stats.chests} baús, ${stats.inflections} infecções.`);lastProgress=now;}
 }
 clearInterval(inputTimer);running=false;await request(teacher.socket,'teacher:finish').catch(()=>{});
 stats.elapsedSeconds=(performance.now()-started)/1000;stats.completed=stats.elapsedSeconds>=duration;stats.finishedAt=new Date().toISOString();
 const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;};
 stats.summary={latencyMedianMs:percentile(stats.latencies,.5),latencyP95Ms:percentile(stats.latencies,.95),syncCadenceDelayP95Ms:percentile(stats.syncDelayMs,.95),reconnectP95Ms:percentile(stats.reconnectMs,.95),averagePacketBytes:stats.packetBytes/Math.max(1,stats.packets),tickMaxMs:Math.max(...stats.samples.map(s=>s.tickMax)),cpuPeakPercent:Math.max(...stats.samples.map(s=>s.cpuPercent)),memoryFirstRss:stats.samples[0]?.memory.rss,memoryLastRss:stats.samples.at(-1)?.memory.rss};
 // Nunca salvar tokens das sessões no relatório.
 await mkdir('docs',{recursive:true});await writeFile(output,JSON.stringify(stats,null,2));console.log(JSON.stringify({completed:stats.completed,elapsedSeconds:stats.elapsedSeconds,rounds:stats.rounds,summary:stats.summary,errors:stats.errors.length},null,2));
}catch(error){running=false;stats.completed=false;stats.errors.push(error.message);await writeFile(output,JSON.stringify(stats,null,2));console.error(error.message);process.exitCode=1;}finally{for(const c of clients)c.socket.disconnect();teacher?.socket.disconnect();}
