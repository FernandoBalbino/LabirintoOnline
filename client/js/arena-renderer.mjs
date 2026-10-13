import {MazeRenderer} from './maze-game-renderer.mjs';
import {MAZE_TILE_SIZE} from '../../shared/maze-core.mjs';
import {teams} from '../../shared/online-catalog.mjs';
const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Sprite indisponível: ${src}`));image.src=src;});
export class ArenaRenderer extends MazeRenderer{
 constructor(canvas){super(canvas);this.state=null;this.avatars=[];this.ready=Promise.all([this.ready,load('./assets/maze-game/team-flags.svg'),load('./assets/maze-game/infected-player-sprites.svg')]).then(([,flags,infected])=>{this.flags=flags;this.infected=infected;});}
 render(maze,me,actors,timestamp,snapshot){
  this.state=snapshot;this.avatars=actors;this.localId=me.id;
  const scene={chests:me.state==='INFECTED'?[]:me.chests,prizeBits:me.bits,meteors:[],virus:snapshot.viruses[0],eventViruses:snapshot.viruses.slice(1),activeEvent:snapshot.activeEvent,playerShielded:me.effects.shieldCharges>0,showCompass:me.effects.compassUntil>snapshot.clock,seerPath:me.seerPath||[]};
  if(me.effects.blackoutUntil>snapshot.clock)scene.activeEvent={id:'apagao-digital'};
  this.updateCamera(maze,me.position);
  const visualGrid=maze.grid.map(row=>row);if(snapshot.walls.length){for(const w of snapshot.walls){if(visualGrid[w.y]===maze.grid[w.y])visualGrid[w.y]=[...visualGrid[w.y]];visualGrid[w.y][w.x]=1;}}
  super.draw({...maze,grid:visualGrid},me.position,timestamp,scene);
 }
 drawPlayer(context,position,timestamp){
  const actors=this.avatars||[];const visible=actors.filter(p=>p.state!=='ESCAPED'&&Math.abs(p.position.x-this.camera.x-this.width/2)<this.width/2+80&&Math.abs(p.position.y-this.camera.y-this.height/2)<this.height/2+90).sort((a,b)=>a.position.y-b.position.y);
  for(const actor of visible){const p=actor.position,local=actor.id===this.localId,team=teams.find(t=>t.id===actor.team);
   context.save();if(actor.protected)context.globalAlpha=.7;
   if(actor.state==='INFECTED'&&this.infected){const frame=p.moving?Math.floor(timestamp/135)%4:0;this.drawAtlasCell(context,this.infected,frame,p.x-28,p.y-39,56,56,4,1);}else super.drawPlayer(context,p,timestamp);
   if(actor.state!=='INFECTED'&&this.flags)this.drawAtlasCell(context,this.flags,teams.indexOf(team),p.x+12,p.y-59,32,32,4,1);
   if(actor.shielded)this.drawPlayerShield(context,p,timestamp);
   if(local){context.strokeStyle=team?.color||'#62e5c3';context.lineWidth=2;context.beginPath();context.ellipse(p.x,p.y+9,19,7,0,0,Math.PI*2);context.stroke();}
   const name=actor.name.length>14?`${actor.name.slice(0,13)}…`:actor.name;context.font=`${local?'700':'400'} 12px Atkinson Hyperlegible`;context.textAlign='center';context.lineWidth=4;context.strokeStyle='#07131f';context.strokeText(`${local?'VOCÊ • ':''}${name}`,p.x,p.y-61);context.fillStyle=local?'#fff':team?.color||'#fff';context.fillText(`${local?'VOCÊ • ':''}${name}`,p.x,p.y-61);
   if(actor.state==='INFECTED'&&this.state.clock-actor.infectedAt<1000){context.strokeStyle='#ce7dff';context.lineWidth=4;context.beginPath();context.arc(p.x,p.y-10,20+(this.state.clock-actor.infectedAt)/40,0,Math.PI*2);context.stroke();}
   context.restore();
  }
  const me=this.state.me;
  for(const wall of me?.phantoms||[]){context.save();context.globalAlpha=.7;context.fillStyle='#19384e';context.fillRect(wall.x*36,wall.y*36,36,36);context.fillStyle='#47728c';context.fillRect(wall.x*36+2,wall.y*36+2,32,5);context.restore();}
  if(me?.fakeExit)this.drawMarker(context,me.fakeExit,13,'SAÍDA','#ffb84d',timestamp);
  for(const meteor of me?.meteors||[]){const x=(meteor.x+.5)*36,y=(meteor.y+.5)*36;context.save();if(this.state.clock<meteor.hitAt){context.strokeStyle='#ff9b42';context.lineWidth=3;context.beginPath();context.arc(x,y,25,0,Math.PI*2);context.stroke();}else if(this.meteorSprites){const frame=Math.min(3,Math.floor((this.state.clock-meteor.hitAt)/100));this.drawAtlasCell(context,this.meteorSprites,frame,x-28,y-28,56,56,4,1);}context.restore();}
 }
 drawVirus(context,virus,timestamp,frozen){if(virus&&virus.respawnAt>this.state.clock)return;super.drawVirus(context,virus?{...virus,respawnAt:0}:null,timestamp,virus?.frozenUntil>this.state.clock||frozen);}
}
