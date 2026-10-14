import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaSocket} from '../shared/arena-socket.mjs';
const url=process.env.CLOUDFLARE_TEST_URL||'http://127.0.0.1:8787';
function request(socket,event,payload={}){return new Promise((resolve,reject)=>socket.timeout(10000).emit(event,{requestId:crypto.randomUUID(),...payload},(error,result)=>error?reject(error):resolve(result)));}
async function connect(){const socket=new ArenaSocket(url);socket.latest=null;socket.on('snapshot',s=>socket.latest=s);socket.connect();await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',()=>reject(new Error('Servidor indisponível')));});return socket;}
test('Cloudflare: 24 sessões, permissões, deduplicação e reconexão na sala real',async()=>{
 const sockets=[];try{
  const teacher=await connect();sockets.push(teacher);const created=await request(teacher,'room:create',{config:{name:'Integração Cloudflare'}});assert.ok(created.ok);
  const pupils=[];
  for(let i=0;i<24;i++){const socket=await connect();sockets.push(socket);const joined=await request(socket,'room:join',{code:created.code,name:`Aluno CF ${i+1}`});assert.ok(joined.ok);pupils.push({socket,joined});}
  await request(teacher,'room:snapshot');assert.deepEqual(teacher.latest.scoreboard.map(t=>t.total),[12,12]);
  const extra=await connect();sockets.push(extra);assert.equal((await request(extra,'room:join',{code:created.code,name:'Aluno excedente'})).ok,false);
  assert.equal((await request(pupils[0].socket,'teacher:start')).ok,false);
  const id=crypto.randomUUID();const first=await request(teacher,'teacher:start',{requestId:id});assert.ok(first.ok);const second=await request(teacher,'teacher:start',{requestId:id});assert.deepEqual(second,first);
  await request(pupils[0].socket,'room:snapshot');const snapshot=pupils[0].socket.latest;assert.equal(snapshot.players.length,24);assert.ok(snapshot.me.chests.length===16);assert.equal(JSON.stringify(snapshot).includes('tokenHash'),false);assert.equal(JSON.stringify(snapshot).includes('solution'),false);
  const {socket,joined}=pupils[0];socket.disconnect();const resumed=await connect();sockets.push(resumed);const result=await request(resumed,'room:resume',{code:created.code,token:joined.token});assert.ok(result.ok);assert.equal(result.playerId,joined.playerId);await request(resumed,'room:snapshot');assert.equal(resumed.latest.me.team,snapshot.me.team);assert.equal(resumed.latest.players.length,24);
  assert.equal((await request(extra,'room:resume',{code:created.code,token:'inválido'})).ok,false);
  assert.ok((await request(teacher,'teacher:finish')).ok);
 }finally{for(const socket of sockets)socket.disconnect();}
});
