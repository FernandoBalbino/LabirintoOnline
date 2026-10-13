import test from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {startServer} from '../server/index.mjs';
const request=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(10000).emit(event,{requestId:crypto.randomUUID(),...payload},(error,result)=>error?reject(error):resolve(result)));
const connect=url=>new Promise(resolve=>{const socket=io(url,{transports:['websocket']});socket.once('connect',()=>resolve(socket));});
test('24 clientes reais: limite, autorização, snapshots privados, comandos e reconexão',async()=>{
 const server=await startServer({port:0,quiet:true}),url=`http://127.0.0.1:${server.port}`,sockets=[];
 try{
  const teacher=await connect(url);sockets.push(teacher);const created=await request(teacher,'room:create',{config:{name:'QA rede'}});assert.ok(created.ok);
  const joined=[];for(let i=0;i<24;i++){const socket=await connect(url);sockets.push(socket);const data=await request(socket,'room:join',{code:created.code,name:`Aluno ${i+1}`});assert.ok(data.ok);joined.push(data);}
  const extra=await connect(url);sockets.push(extra);assert.equal((await request(extra,'room:join',{code:created.code,name:'Aluno extra'})).ok,false);
  assert.equal((await request(sockets[1],'teacher:start')).ok,false);
  assert.equal((await request(teacher,'teacher:start')).ok,true);const room=server.rooms.get(created.code);assert.deepEqual(room.scoreboard().map(t=>t.total),[12,12]);
  const player=room.players[0];const seq=await request(sockets[1],'player:input',{seq:1,x:0,y:1});assert.ok(seq.accepted);assert.equal((await request(sockets[1],'player:input',{seq:1,x:0,y:1})).accepted,false);
  const original=joined[0];sockets[1].disconnect();await new Promise(r=>setTimeout(r,100));const replacement=await connect(url);sockets.push(replacement);assert.ok((await request(replacement,'room:resume',{code:created.code,token:original.token})).ok);assert.equal(room.players.length,24);assert.equal(room.players[0].id,original.playerId);
  const bad=await request(extra,'room:resume',{code:created.code,token:'inventado'});assert.equal(bad.ok,false);
  room.openQuestion(player);const challengeId=player.challenge,serial=player.questionSerial,challenge=(await import('../server/challenges.mjs')).challengeById.get(challengeId);const requestId=crypto.randomUUID();const answer=await request(replacement,'player:answer',{requestId,challengeId,questionSerial:serial,response:challenge.solution});assert.ok(answer.correct);const again=await request(replacement,'player:answer',{requestId,challengeId,questionSerial:serial,response:challenge.solution});assert.ok(again.correct);assert.equal(player.correctAnswers,1);
  const health=await (await fetch(`${url}/health`)).json();assert.ok(health.ready);const diagnostics=await request(teacher,'teacher:metrics');assert.ok(diagnostics.metrics.memory.rss>0);
 }finally{for(const socket of sockets)socket.disconnect();await server.close();}
});
