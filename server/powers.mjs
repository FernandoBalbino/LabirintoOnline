import {MAZE_TILE_SIZE,positionToCell,findShortestPath,createPowerChests,createPrizeTrail,pickPowerChoices,createVirusClones} from '../shared/maze-core.mjs';
import {powers,powerById,mazeEvents} from '../shared/online-catalog.mjs';
import {center,effectiveMaze,findSafeTeleportDestination,addSafeWall,distanceField,cellDistance} from './maps.mjs';
const explorer=p=>!p.removed&&['EXPLORING','ANSWERING'].includes(p.state);
const extend=(room,p,key,seconds)=>p.effects[key]=Math.max(p.effects[key]||0,room.clock+seconds*1000);
export function teleport(room,p,destination){if(!destination)return false;p.position=destination;p.input={x:0,y:0};p.teleportVersion++;extend(room,p,'immuneUntil',1);room.notify(p.id,'teleport',{});return true;}
export function bonusChests(room,p,count=2){
 const field=room.exitDistances;let added=0;
 for(let attempt=0;attempt<12&&added<count;attempt++){
  const generated=createPowerChests(room.maze,{count:count-added,random:room.random,existing:p.chests});
  const accepted=generated.filter(c=>field[c.y*room.maze.width+c.x]>7&&!room.viruses.some(v=>Math.hypot(v.x-center(c).x,v.y-center(c).y)<MAZE_TILE_SIZE*2));
  p.chests.push(...accepted.map(c=>({...c,id:`${p.id}:chest:${p.nextChest++}`})));added+=accepted.length;
 }
 return added;
}
export function choosePower(room,p,powerId){
 const power=powerById.get(powerId);if(!power)throw new Error('Poder inválido.');
 const enemies=room.players.filter(other=>explorer(other)&&other.team!==p.team);
 const addTime=seconds=>{p.remainingTime+=seconds;p.currentFreeTime=Math.max(p.currentFreeTime,p.remainingTime);};
 const viruses=()=>[...room.viruses,...room.players.filter(other=>other.state==='INFECTED'&&!other.removed)];
 const apply=id=>{
  if(id==='escudo')p.effects.shieldCharges++;
  if(id==='turbo')extend(room,p,'speedUntil',10);
  if(id==='tempo')addTime(15);
  if(id==='vidente')extend(room,p,'seerUntil',5);
  if(id==='bussola')extend(room,p,'compassUntil',10);
  if(id==='invisibilidade')extend(room,p,'invisibleUntil',8);
  if(id==='antivirus')for(const v of viruses()){
   if(v.position)extend(room,v,'stunUntil',4.5);
   else {v.respawnAt=room.clock+4500;v.sprinting=false;v.path=[];const proxy={team:p.team,position:v,id:'npc'};const dest=findSafeTeleportDestination(room,proxy);if(dest)Object.assign(v,dest);}
  }
  if(id==='congelar')for(const v of viruses()){if(v.position)extend(room,v,'stunUntil',8);else v.frozenUntil=Math.max(v.frozenUntil||0,room.clock+8000);}
  if(id==='lentidao')for(const v of viruses()){if(v.position)v.virusSpeed=Math.max(72,v.virusSpeed*.72);else v.speed=Math.max(72,v.speed*.72);}
  if(['teleporte','salto-sorte'].includes(id)){
   const path=findShortestPath(effectiveMaze(room,p),positionToCell(p.position));
   const steps=id==='teleporte'?14:12+Math.floor(room.random()*19);
   const destination=path[Math.min(steps,Math.max(1,path.length-2))];if(destination)teleport(room,p,center(destination));
  }
 };
 if(!power.sabotage&&!power.lucky)apply(powerId);
 if(powerId==='dado-tempo')addTime([10,20,30][Math.floor(room.random()*3)]);
 if(powerId==='salto-sorte')apply(powerId);
 if(powerId==='bau-duplicador'&&bonusChests(room,p)<2)addTime(15);
 if(powerId==='combo-surpresa')pickPowerChoices(powers.filter(x=>['escudo','turbo','vidente','congelar','invisibilidade','bussola','lentidao'].includes(x.id)),room.random,2).forEach(x=>apply(x.id));
 if(powerId==='trilha-premiada'){p.bits=createPrizeTrail(effectiveMaze(room,p),p.position,{count:5});p.effects.bitsUntil=room.clock+20000;if(!p.bits.length)addTime(10);}
 const effect={inverter:['invertUntil',8],apagao:['blackoutUntil',6],'congelamento-coletivo':['freezeUntil',4],maldicao:['slowUntil',10],fantasma:['phantomUntil',10]}[powerId];
 if(effect)for(const enemy of enemies){extend(room,enemy,...effect);if(powerId==='fantasma')enemy.phantoms=randomNearby(room,enemy,6);}
 if(powerId==='muralha')for(const enemy of enemies)addSafeWall(room,enemy.team,enemy);
 if(powerId==='saida-falsa')for(const enemy of enemies){const possible=randomNearby(room,enemy,20).filter(c=>cellDistance(room.exitDistances,room.maze,center(c))>12);if(possible.length){enemy.fakeExit={...possible[Math.floor(room.random()*possible.length)],until:room.clock+15000};}}
 if(['caos','separacao','troca'].includes(powerId)){
  const targets=powerId==='separacao'?enemies.filter(a=>enemies.some(b=>a!==b&&findShortestPath(room.maze,positionToCell(a.position),positionToCell(b.position)).length<=12)):enemies;
  const original=targets.map(e=>({...e.position})),reserved=[];
  const shift=targets.length>1?1+Math.floor(room.random()*(targets.length-1)):1;
  for(let i=0;i<targets.length;i++){
   const target=targets[i];let destination=null;
   if(powerId==='troca'&&targets.length>1){
    const candidate=original[(i+shift)%targets.length],maze=effectiveMaze(room,target),field=distanceField(maze),d=cellDistance(field,maze,candidate);
    const proxy={...target,position:candidate};
    // Le service central doit accepter la cellule proposée selon les mêmes contraintes.
    const safe=findSafeTeleportDestination(room,proxy,{reserved});
    if(safe&&d>=Math.max(cellDistance(field,maze,target.position),Math.max(...field)*.6)&&cellDistance(room.exitDistances,room.maze,candidate)>=Math.max(cellDistance(room.exitDistances,room.maze,target.position),room.maximumDistance*.6)&&!reserved.some(c=>c.x===positionToCell(candidate).x&&c.y===positionToCell(candidate).y)&&!room.viruses.some(v=>Math.hypot(v.x-candidate.x,v.y-candidate.y)<MAZE_TILE_SIZE*6)&&!room.players.some(v=>v.state==='INFECTED'&&Math.hypot(v.position.x-candidate.x,v.position.y-candidate.y)<MAZE_TILE_SIZE*6))destination=candidate;
   }
   destination ||= findSafeTeleportDestination(room,target,{reserved,minSeparation:powerId==='separacao'?12:3});
   if(teleport(room,target,destination))reserved.push(positionToCell(destination));
  }
 }
 p.powerChoice=null;p.interaction=null;p.lastPower=powerId;
 room.notify(p.id,'power',{powerId,name:power.name,description:power.description});
 room.critical('power',{playerId:p.id,powerId});
}
function randomNearby(room,p,count){
 const maze=effectiveMaze(room,p),field=distanceField(maze,positionToCell(p.position)),candidates=[];
 for(let y=1;y<maze.height-1;y++)for(let x=1;x<maze.width-1;x++)if(field[y*maze.width+x]>=3&&field[y*maze.width+x]<=18&&(x!==maze.exit.x||y!==maze.exit.y))candidates.push({x,y});
 return candidates.sort(()=>room.random()-.5).slice(0,count);
}
export function randomEvent(room){
 const available=mazeEvents.filter(e=>e.id!==room.lastEventId&&(room.config.powers||e.id!=='chuva-baus'));
 const event=available[Math.floor(room.random()*available.length)];room.lastEventId=event.id;
 room.activeEvent={...event,until:room.clock+event.duration*1000};
 if(event.id==='virus-multiplicado')room.viruses.push(...createVirusClones(room.maze,{random:room.random,count:3,now:room.clock,avoid:room.players.map(p=>positionToCell(p.position))}).map(v=>({...v,temporary:true,until:room.clock+15000})));
 if(event.id==='apagao-digital')for(const p of room.players.filter(explorer))extend(room,p,'blackoutUntil',12);
 if(event.id==='chuva-baus')for(const p of room.players.filter(explorer))bonusChests(room,p);
 if(event.id==='onda-antivirus')for(const v of [...room.viruses,...room.players.filter(p=>p.state==='INFECTED')]){if(v.position)extend(room,v,'stunUntil',10);else v.frozenUntil=room.clock+10000;}
 room.broadcast('random-event',{event});room.critical('random-event',{eventId:event.id});
}
