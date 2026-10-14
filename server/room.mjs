import {randomBytes,createHash} from 'node:crypto';
import {createSeededRandom,movePlayer,PLAYER_SPEED,MAZE_TILE_SIZE,positionToCell,findShortestPath,reachedExit,createVirusState,createChallengeDeck,takeNextChallenge,applyCorrectAnswer,applyWrongAnswer,resumeAfterChallenge,validateChallengeResponse,pickPowerChoices} from '../shared/maze-core.mjs';
import {DEFAULT_CONFIG,teams,powers,labels} from '../shared/online-catalog.mjs';
import {mazeChallenges,challengeById} from './challenges.mjs';
import {validateBrowserResponse} from './extra-challenges.mjs';
import {generateArena,teamSpawnCells,center,effectiveMaze,cellDistance,distanceField,findSafeTeleportDestination} from './maps.mjs';
import {bonusChests,choosePower,teleport,randomEvent} from './powers.mjs';
export const token=()=>randomBytes(32).toString('base64url');
export const hashToken=value=>createHash('sha256').update(String(value)).digest('hex');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validateConfig(input,base=DEFAULT_CONFIG){
 const config={...base};
 for(const key of Object.keys(DEFAULT_CONFIG))if(input?.[key]!==undefined)config[key]=input[key];
 config.name=String(config.name).trim().slice(0,60)||DEFAULT_CONFIG.name;
 for(const [key,min,max] of [['maxPlayers',2,24],['teamCount',2,4],['width',31,131],['height',31,101],['timeLimit',0,7200]]){
  const value=Number(config[key]);if(!Number.isInteger(value)||value<min||value>max)throw new Error(`Configuração inválida: ${key}.`);config[key]=value;
 }
 if(config.maxPlayers<config.teamCount)throw new Error('As vagas precisam comportar todas as equipes.');
 if(!['auto','custom'].includes(config.mapSize)||(config.mapSize==='custom'&&(config.width%2===0||config.height%2===0)))throw new Error('Use dimensões ímpares válidas para o mapa.');
 for(const key of ['powers','controlledViruses','allowJoin'])if(typeof config[key]!=='boolean')throw new Error('Configuração inválida.');
 return config;
}
export class Room{
 constructor({code,config={},teacherHash,seed=token(),saved}={}){
  Object.assign(this,{code,config:validateConfig(config),teacherHash,seed,status:'LOBBY',clock:0,version:0,eventId:0,randomCount:0,players:[],maze:null,exitDistances:[],maximumDistance:0,viruses:[],walls:[],events:[],commands:[],nextEventAt:60000,activeEvent:null,lastEventId:null,result:null,lastActiveAt:Date.now(),createdAt:Date.now(),lastMeteorAt:0,teacherConnected:false,recovering:false});
  if(saved)Object.assign(this,saved);
  const seeded=createSeededRandom(this.seed);for(let i=0;i<this.randomCount;i++)seeded();
  this.random=()=>{this.randomCount++;return seeded();};this.notify=()=>{};this.broadcast=()=>{};this.onCritical=()=>{};
 }
 critical(type,data={}){this.version++;const event={id:++this.eventId,version:this.version,type,clock:this.clock,...data};this.events.push(event);if(this.events.length>1000)this.events.shift();this.onCritical(event);}
 addPlayer(name){
  if(this.status!=='LOBBY'||!this.config.allowJoin)throw new Error('A sala não está aceitando novos participantes.');
  if(this.players.filter(p=>!p.removed).length>=this.config.maxPlayers)throw new Error('A sala está cheia.');
  const clean=String(name??'').trim().normalize('NFC');if(clean.length<2||clean.length>30||/[\x00-\x1f]/.test(clean))throw new Error('Informe um nome de 2 a 30 caracteres.');
  const sessionToken=token(),active=teams.slice(0,this.config.teamCount),counts=active.map(t=>this.players.filter(p=>!p.removed&&p.team===t.id).length),team=active[counts.indexOf(Math.min(...counts))].id;
  const p={id:randomBytes(8).toString('hex'),tokenHash:hashToken(sessionToken),name:clean,team,state:'EXPLORING',connected:true,removed:false,position:center({x:1,y:1}),remainingTime:20,currentFreeTime:20,correctStreak:0,highestStreak:0,questionsAnswered:0,wrongAnswers:0,correctAnswers:0,effects:{shieldCharges:0},chests:[],nextChest:0,bits:[],meteors:[],deck:[],lastChallengeId:null,challenge:null,questionUntil:0,questionExpired:false,questionSerial:0,powerChoice:null,interaction:null,input:{x:0,y:0},lastInputAt:0,lastInputSeq:0,teleportVersion:0,virusSpeed:148,infectedAt:null,escapedAt:null,disconnectBudget:120000,disconnectAt:null,receipts:[]};
  this.players.push(p);this.critical('join',{playerId:p.id});return {player:p,sessionToken};
 }
 redistribute(){let index=0;for(const p of this.players.filter(p=>!p.removed))p.team=teams[index++%this.config.teamCount].id;this.critical('teams');}
 configure(input){if(this.status!=='LOBBY')throw new Error('A configuração está fechada.');const next=validateConfig(input,this.config);if(this.players.filter(p=>!p.removed).length>next.maxPlayers)throw new Error('Há mais participantes que vagas.');this.config=next;this.redistribute();}
 start(){
  if(this.status!=='LOBBY')throw new Error('A partida já foi iniciada.');
  const participants=this.players.filter(p=>!p.removed);
  if(participants.length<this.config.teamCount||participants.some(p=>!p.connected))throw new Error('Conecte pelo menos um aluno por equipe e aguarde todos os participantes.');
  this.status='STARTING';
  try{Object.assign(this,generateArena(this.config,participants.length,this.seed));
   const occupied=[];for(let index=0;index<this.config.teamCount;index++){
    const group=participants.filter(p=>p.team===teams[index].id),cells=teamSpawnCells(this.maze,this.maze.teamStarts[index],group.length,occupied);
    for(let i=0;i<group.length;i++){const p=group[i];p.position=center(cells[i]);occupied.push(cells[i]);p.deck=createChallengeDeck(mazeChallenges,null,this.random);}
   }
   const virus=createVirusState(this.maze,{random:this.random,now:0,avoid:occupied,minDistance:18});virus.id='npc-original';this.viruses=[virus];
   if(this.config.powers)for(const p of participants)bonusChests(this,p,16);
   this.status='PLAYING';this.critical('start');
  }catch(error){this.status='LOBBY';throw error;}
 }
 disconnect(p){if(!p.connected)return;p.connected=false;p.input={x:0,y:0};p.disconnectAt=this.clock;this.critical('disconnect',{playerId:p.id});}
 reconnect(p){if(p.removed)throw new Error('Sua participação foi encerrada pelo professor.');this.consumeGrace(p);p.connected=true;p.disconnectAt=null;p.input={x:0,y:0};p.lastInputSeq=0;this.critical('reconnect',{playerId:p.id});}
 consumeGrace(p){if(p.disconnectAt!==null)p.disconnectBudget=Math.max(0,p.disconnectBudget-(this.clock-p.disconnectAt));}
 protectedDisconnect(p){return !p.connected&&p.disconnectAt!==null&&this.clock-p.disconnectAt<p.disconnectBudget;}
 setInput(p,{seq,x,y}){
  if(!Number.isSafeInteger(seq)||seq<=p.lastInputSeq||seq>p.lastInputSeq+10000||![-1,0,1].includes(x)||![-1,0,1].includes(y))return false;
  p.lastInputSeq=seq;p.lastInputAt=this.clock;p.input=p.connected&&this.status==='PLAYING'&&!p.removed&&['EXPLORING','INFECTED'].includes(p.state)&&!p.interaction?{x,y}:{x:0,y:0};return true;
 }
 openQuestion(p){
  const selection=takeNextChallenge({deck:p.deck,challenges:mazeChallenges,lastChallengeId:p.lastChallengeId,random:this.random});
  p.deck=selection.deck;p.challenge=selection.challenge.id;p.lastChallengeId=p.challenge;p.state='ANSWERING';p.input={x:0,y:0};p.questionUntil=this.clock+90000;p.questionExpired=false;p.questionSerial++;this.critical('question',{playerId:p.id});
 }
 answer(p,{challengeId,questionSerial,response}){
  if(this.status!=='PLAYING'||p.state!=='ANSWERING'||challengeId!==p.challenge||questionSerial!==p.questionSerial||p.successAt)throw new Error('Este desafio não está disponível.');
  const challenge=challengeById.get(p.challenge),correct=challenge.template==='browser-sim'?validateBrowserResponse(challenge,response):validateChallengeResponse(challenge,response);
  const next=correct?applyCorrectAnswer(p):applyWrongAnswer(p);
  for(const key of ['currentFreeTime','remainingTime','correctStreak','highestStreak','questionsAnswered','wrongAnswers'])p[key]=next[key];
  if(correct){p.correctAnswers++;p.successAt=this.clock+700;p.effects.immuneUntil=p.successAt+500;}
  this.critical('answer',{playerId:p.id,correct});
  const accepted=challenge.solution&&typeof challenge.solution==='object'?Object.fromEntries(Object.entries(response||{}).filter(([key,value])=>challenge.solution[key]===value)):undefined;
  return {correct,accepted,message:correct?`Você ganhou ${p.currentFreeTime} segundos para explorar!`:'Sequência interrompida. Tente novamente.'};
 }
 release(p){if(this.status!=='PLAYING'||p.state!=='ANSWERING')throw new Error('O aluno não está respondendo um desafio.');Object.assign(p,{state:'EXPLORING',challenge:null,successAt:null,questionExpired:false,remainingTime:30,currentFreeTime:30,correctStreak:0});p.effects.immuneUntil=this.clock+1000;this.critical('release',{playerId:p.id});}
 choose(p,{powerId,choiceId}){if(this.status!=='PLAYING'||p.state!=='EXPLORING'||!p.powerChoice||p.powerChoice.id!==choiceId||!p.powerChoice.ids.includes(powerId))throw new Error('Escolha de poder inválida.');choosePower(this,p,powerId);}
 remove(p){p.removed=true;p.connected=false;p.input={x:0,y:0};this.critical('remove',{playerId:p.id});if(this.status==='LOBBY')this.redistribute();else this.checkVictory();}
 immune(p){return this.protectedDisconnect(p)||p.effects.immuneUntil>this.clock||p.effects.freezeUntil>this.clock||(p.state==='ANSWERING'&&!p.questionExpired)||p.interaction==='power';}
 infect(p,attacker){
  if(!['EXPLORING','ANSWERING'].includes(p.state)||p.removed||this.immune(p))return false;
  if(p.effects.shieldCharges>0){p.effects.shieldCharges--;p.effects.immuneUntil=this.clock+1500;if(attacker.position)attacker.effects.stunUntil=this.clock+3000;else attacker.respawnAt=this.clock+3000;this.critical('shield',{playerId:p.id});return false;}
  p.state='INFECTED';p.infectedAt=this.clock;p.effects={shieldCharges:0};p.chests=[];p.bits=[];p.challenge=null;p.successAt=null;p.powerChoice=null;p.interaction=null;p.fakeExit=null;p.input={x:0,y:0};this.notify(p.id,'infection',{playerId:p.id});this.critical('infection',{playerId:p.id});return true;
 }
 advanceVirus(v,dt,always=false){
  if(v.respawnAt>this.clock||v.frozenUntil>this.clock)return;
  if(always)v.sprinting=true;
  if(!v.sprinting&&this.clock>=v.nextSprintAt){v.sprinting=true;v.sprintEndsAt=this.clock+4000;v.pathRefreshAt=0;}
  if(!always&&v.sprinting&&this.clock>=v.sprintEndsAt){v.sprinting=false;v.nextSprintAt=this.clock+5500+this.random()*6500;}
  if(!v.sprinting)return;
  if(this.clock>=v.pathRefreshAt||!v.path?.length){
   const targets=this.players.filter(p=>['EXPLORING','ANSWERING'].includes(p.state)&&!p.removed&&!this.immune(p)&&!(p.effects.invisibleUntil>this.clock));
   const nearby=targets.filter(p=>Math.abs(p.position.x-v.x)+Math.abs(p.position.y-v.y)<=MAZE_TILE_SIZE*50);
   // Uma BFS encontra a distância de todos os alvos; só o alvo mais próximo precisa de um caminho.
   let target=null,shortest=Infinity;
   if(nearby.length){const distances=distanceField(this.maze,positionToCell(v));for(const p of nearby){const distance=cellDistance(distances,this.maze,p.position);if(distance>=0&&distance<shortest){target=p;shortest=distance;}}}
   v.path=target?findShortestPath(this.maze,positionToCell(v),positionToCell(target.position)):[];v.pathRefreshAt=this.clock+400;
  }
  const current=positionToCell(v);while(v.path?.[0]?.x===current.x&&v.path?.[0]?.y===current.y)v.path.shift();
  const target=v.path?.[0];if(!target){v.moving=false;return;}
  const dest=center(target),dx=dest.x-v.x,dy=dest.y-v.y,m=Math.hypot(dx,dy)||1;
  Object.assign(v,movePlayer({maze:this.maze,position:v,input:{x:dx/m,y:dy/m},deltaSeconds:Math.min(dt,m/v.speed),speed:v.speed,radius:9}));
 }
 tick(dt){
  if(this.status!=='PLAYING'||this.recovering)return;
  this.clock+=dt*1000;this.version++;
  this.walls=this.walls.filter(w=>w.until>this.clock);this.viruses=this.viruses.filter(v=>!v.temporary||v.until>this.clock);
  for(const p of this.players){
   if(p.removed||p.state==='ESCAPED')continue;
   if(this.protectedDisconnect(p)){if(p.state==='ANSWERING')p.questionUntil+=dt*1000;if(p.powerChoice)p.powerChoice.until+=dt*1000;continue;}
   if(p.state==='ANSWERING'){
    if(p.successAt&&this.clock>=p.successAt){p.successAt=null;p.challenge=null;p.state='EXPLORING';p.input={x:0,y:0};this.critical('resume',{playerId:p.id});}
    else if(!p.questionExpired&&this.clock>=p.questionUntil){const next=applyWrongAnswer(p);p.correctStreak=0;p.questionsAnswered=next.questionsAnswered;p.wrongAnswers=next.wrongAnswers;p.questionExpired=true;this.notify(p.id,'timeout',{});this.critical('question-timeout',{playerId:p.id});}
    continue;
   }
   if(p.interaction==='power'){if(this.clock>=p.powerChoice.until)choosePower(this,p,p.powerChoice.ids[0]);continue;}
   if(p.state==='EXPLORING'){p.remainingTime=Math.max(0,p.remainingTime-dt);if(!p.remainingTime){this.openQuestion(p);continue;}}
   const maze=p.state==='INFECTED'?this.maze:effectiveMaze(this,p);
   let input=p.connected&&this.clock-p.lastInputAt<500?p.input:{x:0,y:0};
   if(p.effects.invertUntil>this.clock)input={x:-input.x,y:-input.y};
   let speed=p.state==='INFECTED'?p.virusSpeed:PLAYER_SPEED*(p.effects.speedUntil>this.clock?2:1)*(p.effects.slowUntil>this.clock?.5:1);
   if(p.effects.freezeUntil>this.clock||p.effects.stunUntil>this.clock)speed=0;
   if(p.state==='INFECTED'&&!this.config.controlledViruses){const v={...p.position,speed:p.virusSpeed,path:p.aiPath||[],pathRefreshAt:p.aiPathAt||0,respawnAt:0,frozenUntil:p.effects.stunUntil};this.advanceVirus(v,dt,true);p.position={x:v.x,y:v.y,direction:v.direction,moving:v.moving};p.aiPath=v.path;p.aiPathAt=v.pathRefreshAt;}
   else p.position=movePlayer({maze,position:p.position,input,deltaSeconds:dt,speed});
   if(p.state==='EXPLORING'){
    if(reachedExit(p.position,this.maze)){p.state='ESCAPED';p.escapedAt=this.clock;p.input={x:0,y:0};p.chests=[];this.notify(p.id,'escape',{});this.critical('escape',{playerId:p.id});continue;}
    if(p.fakeExit&&p.fakeExit.until>this.clock&&Math.hypot(p.position.x-center(p.fakeExit).x,p.position.y-center(p.fakeExit).y)<20){teleport(this,p,findSafeTeleportDestination(this,p));p.fakeExit=null;this.notify(p.id,'trap',{});this.critical('trap',{playerId:p.id});}
    const chest=p.chests.find(c=>!c.opened&&Math.hypot(p.position.x-center(c).x,p.position.y-center(c).y)<24);
    if(chest){chest.opened=true;p.interaction='power';p.input={x:0,y:0};p.powerChoice={id:token().slice(0,12),ids:pickPowerChoices(powers,this.random,4).map(v=>v.id),until:this.clock+15000};this.critical('chest',{playerId:p.id});}
    if(p.effects.bitsUntil>this.clock)p.bits=p.bits.filter(bit=>{if(Math.hypot(p.position.x-center(bit).x,p.position.y-center(bit).y)<24){p.remainingTime+=2;return false;}return true;});else p.bits=[];
   }
  }
  for(const v of this.viruses)this.advanceVirus(v,dt,v.temporary);
  const attackers=[...this.viruses.filter(v=>v.respawnAt<=this.clock&&!(v.frozenUntil>this.clock)),...this.players.filter(p=>p.state==='INFECTED'&&!p.removed&&this.clock-p.infectedAt>=1000&&!(p.effects.stunUntil>this.clock)&&!this.protectedDisconnect(p))];
  // Apenas os vírus existentes no começo desta etapa podem infectar neste tick.
  for(const p of this.players.filter(p=>!p.removed&&['EXPLORING','ANSWERING'].includes(p.state)))for(const attacker of attackers){const pos=attacker.position||attacker;if(Math.hypot(pos.x-p.position.x,pos.y-p.position.y)<=23){this.infect(p,attacker);break;}}
  if(this.clock>=this.nextEventAt){this.nextEventAt+=60000;randomEvent(this);}
  if(this.activeEvent?.id==='chuva-meteoros'&&this.activeEvent.until>this.clock){
   for(const p of this.players.filter(p=>p.state==='EXPLORING'&&!p.removed)){
    if(this.clock-this.lastMeteorAt>=900){const c=positionToCell(p.position);const possibilities=[];for(let y=c.y-5;y<=c.y+5;y++)for(let x=c.x-5;x<=c.x+5;x++)if(this.maze.grid[y]?.[x]===0)possibilities.push({x,y});if(possibilities.length)p.meteors.push({...possibilities[Math.floor(this.random()*possibilities.length)],id:`m-${this.eventId}-${this.clock}`,hitAt:this.clock+1200,until:this.clock+1600});}
    for(const meteor of p.meteors)if(!meteor.hit&&meteor.hitAt<=this.clock){meteor.hit=true;if(!this.immune(p)&&Math.hypot(p.position.x-center(meteor).x,p.position.y-center(meteor).y)<30){p.remainingTime=Math.max(0,p.remainingTime-3);this.notify(p.id,'meteor',{});if(!p.remainingTime)this.openQuestion(p);}}
    p.meteors=p.meteors.filter(m=>m.until>this.clock);
   }
   if(this.clock-this.lastMeteorAt>=900)this.lastMeteorAt=this.clock;
  }else for(const p of this.players)p.meteors=[];
  this.checkVictory();
 }
 scoreboard(){return teams.slice(0,this.config.teamCount).map(team=>{const all=this.players.filter(p=>p.team===team.id);return {...team,total:all.length,escaped:all.filter(p=>p.state==='ESCAPED').length,infected:all.filter(p=>p.state==='INFECTED').length,exploring:all.filter(p=>!p.removed&&['EXPLORING','ANSWERING'].includes(p.state)).length,lastEscape:Math.max(-1,...all.filter(p=>p.state==='ESCAPED').map(p=>p.escapedAt))};});}
 checkVictory(){
  if(this.status!=='PLAYING')return;
  const board=this.scoreboard(),remaining=board.reduce((s,t)=>s+t.exploring,0),leader=[...board].sort((a,b)=>b.escaped-a.escaped||a.lastEscape-b.lastEscape)[0];
  if(remaining===0||this.config.timeLimit>0&&this.clock>=this.config.timeLimit*1000||leader.escaped>0&&board.filter(t=>t.id!==leader.id).every(t=>t.escaped+t.exploring<leader.escaped))this.finish('automatic');
 }
 finish(reason='manual'){
  if(['FINISHED','CANCELLED'].includes(this.status))return;
  const board=this.scoreboard(),total=board.reduce((sum,t)=>sum+t.escaped,0),sorted=[...board].sort((a,b)=>b.escaped-a.escaped||a.lastEscape-b.lastEscape);
  const cancelled=reason==='manual'&&!total;this.status=cancelled?'CANCELLED':'FINISHED';
  this.result={reason,duration:this.clock/1000,winner:cancelled?null:total?sorted[0].id:'virus',tie:total>0&&sorted[0].escaped===sorted[1]?.escaped,tieRule:'Vence quem atingiu a pontuação final primeiro.',scoreboard:board,arrivals:this.players.filter(p=>p.state==='ESCAPED').sort((a,b)=>a.escapedAt-b.escapedAt).map(p=>({id:p.id,name:p.name,team:p.team,at:p.escapedAt})),players:this.players.map(p=>({id:p.id,name:p.name,team:p.team,state:p.state,correctAnswers:p.correctAnswers,wrongAnswers:p.wrongAnswers,removed:p.removed}))};
  for(const p of this.players)p.input={x:0,y:0};this.critical('finish',{result:this.result});
 }
 publicChallenge(p){
  const challenge=challengeById.get(p.challenge);if(!challenge)return null;
  const {solution,...safe}=challenge;return {...safe,questionSerial:p.questionSerial};
 }
 snapshot(viewer,{includeMap=false,teacher=false}={}){
  const hidden=viewer?.state==='INFECTED';
  const players=this.players.filter(p=>!p.removed||p.state==='ESCAPED').filter(p=>!hidden||p.id===viewer.id||p.state==='INFECTED'||!(p.effects.invisibleUntil>this.clock)).map(p=>({id:p.id,name:p.name,team:p.team,state:p.state,connected:p.connected,position:p.position,teleportVersion:p.teleportVersion,infectedAt:p.infectedAt,shielded:p.effects.shieldCharges>0,protected:this.immune(p)}));
  const me=viewer?{...players.find(p=>p.id===viewer.id),remainingTime:viewer.remainingTime,currentFreeTime:viewer.currentFreeTime,correctStreak:viewer.correctStreak,correctAnswers:viewer.correctAnswers,effects:viewer.effects,chests:viewer.chests,bits:viewer.bits,meteors:viewer.meteors,challenge:this.publicChallenge(viewer),questionUntil:viewer.questionUntil,questionExpired:viewer.questionExpired,powerChoice:viewer.powerChoice,interaction:viewer.interaction,successAt:viewer.successAt,fakeExit:viewer.fakeExit?.until>this.clock?viewer.fakeExit:null,phantoms:viewer.effects.phantomUntil>this.clock?viewer.phantoms:[],lastInputSeq:viewer.lastInputSeq,virusSpeed:viewer.virusSpeed}:null;
  return {code:this.code,config:this.config,status:this.status,clock:this.clock,version:this.version,eventId:this.eventId,recovering:this.recovering,teacherConnected:this.teacherConnected,players,me,scoreboard:this.scoreboard(),viruses:this.viruses.map(({path,...v})=>v),walls:teacher?this.walls:viewer?.state==='INFECTED'?[]:this.walls.filter(w=>w.team===viewer?.team),activeEvent:this.activeEvent?.until>this.clock?this.activeEvent:null,result:this.result,...includeMap?{maze:this.maze}:{}};
 }
 serialize(){const {random,notify,broadcast,onCritical,commands,services,commandQueue,joinQueue,...data}=this;return JSON.parse(JSON.stringify(data));}
}
