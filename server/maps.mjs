import {generateMaze,createSeededRandom,getWalkableCells,MAZE_TILE_SIZE,canOccupy,positionToCell} from '../shared/maze-core.mjs';
export function distanceField(maze,origin=maze.exit){
 const distances=Array(maze.width*maze.height).fill(-1),queue=[origin];
 if(maze.grid[origin.y]?.[origin.x]!==0)return distances;
 distances[origin.y*maze.width+origin.x]=0;
 for(let head=0;head<queue.length;head++){
  const p=queue[head],d=distances[p.y*maze.width+p.x]+1;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=p.x+dx,y=p.y+dy,index=y*maze.width+x;
   if(maze.grid[y]?.[x]===0&&distances[index]===-1){distances[index]=d;queue.push({x,y});}
  }
 }
 return distances;
}
export const center=cell=>({x:(cell.x+.5)*MAZE_TILE_SIZE,y:(cell.y+.5)*MAZE_TILE_SIZE,direction:'down',moving:false});
export const cellDistance=(field,maze,p)=>{const c=positionToCell(p);return field[c.y*maze.width+c.x]??-1;};
export function generateArena(config,count,seed){
 const width=config.mapSize==='custom'?config.width:count>12?101:69;
 const height=config.mapSize==='custom'?config.height:count>12?75:51;
 for(let attempt=0;attempt<40;attempt++){
  const maze=generateMaze({width,height,seed:`${seed}:${attempt}`,braidChance:.24});
  const cells=getWalkableCells(maze),random=createSeededRandom(`${seed}:exit:${attempt}`);
  const exits=cells.filter(c=>c.x>width*.3&&c.x<width*.7&&c.y>height*.3&&c.y<height*.7);
  for(let trial=0;trial<24;trial++){
   maze.exit=exits[Math.floor(random()*exits.length)];
   const field=distanceField(maze),maximum=Math.max(...field);
   const sectors=config.teamCount===2?[c=>c.x<width*.3&&c.y<height*.3,c=>c.x>width*.7&&c.y>height*.7]:config.teamCount===3?[c=>c.x<width*.3&&c.y<height*.3,c=>c.x>width*.7&&c.y<height*.3,c=>c.y>height*.7&&c.x>width*.3&&c.x<width*.7]:[c=>c.x<width*.3&&c.y<height*.3,c=>c.x>width*.7&&c.y<height*.3,c=>c.x>width*.7&&c.y>height*.7,c=>c.x<width*.3&&c.y>height*.7];
   const groups=sectors.map(fn=>cells.filter(fn));
   const target=Math.min(...groups.map(g=>Math.max(...g.map(c=>field[c.y*width+c.x]))));
   if(target<Math.max(24,maximum*.4))continue;
   const starts=groups.map(g=>g.reduce((best,c)=>Math.abs(field[c.y*width+c.x]-target)<Math.abs(field[best.y*width+best.x]-target)?c:best));
   const lengths=starts.map(c=>field[c.y*width+c.x]);
   if(Math.max(...lengths)/Math.min(...lengths)>1.2)continue;
   maze.start=starts[0];maze.teamStarts=starts;
   return {maze,exitDistances:field,maximumDistance:maximum};
  }
 }
 throw new Error('Não foi possível criar um mapa equilibrado. Tente outra configuração.');
}
export function teamSpawnCells(maze,anchor,count,occupied=[]){
 const field=distanceField(maze,anchor),used=new Set(occupied.map(c=>`${c.x},${c.y}`));
 return getWalkableCells(maze).filter(c=>!used.has(`${c.x},${c.y}`)).sort((a,b)=>field[a.y*maze.width+a.x]-field[b.y*maze.width+b.x]).slice(0,count);
}
export function effectiveMaze(room,player){
 const walls=room.walls.filter(w=>w.team===player.team&&w.until>room.clock);
 if(!walls.length)return room.maze;
 const grid=room.maze.grid.map(row=>[...row]);for(const w of walls)grid[w.y][w.x]=1;
 return {...room.maze,grid};
}
export function findSafeTeleportDestination(room,player,{reserved=[],avoidViruses=true,minSeparation=3}={}){
 const maze=effectiveMaze(room,player),field=distanceField(maze),maximum=Math.max(...field);
 const current=cellDistance(field,maze,player.position),threshold=Math.max(current,Math.ceil(maximum*.6));
 const baseField=room.exitDistances,baseThreshold=Math.max(cellDistance(baseField,room.maze,player.position),Math.ceil(room.maximumDistance*.6));
 const viruses=[...room.viruses.filter(v=>v.respawnAt<=room.clock),...room.players.filter(p=>p.state==='INFECTED'&&!p.removed).map(p=>p.position)];
 const virusFields=avoidViruses?viruses.map(v=>distanceField(maze,positionToCell(v))):[];
 const occupied=[...room.players.filter(p=>p.id!==player.id&&!p.removed&&p.state!=='ESCAPED').map(p=>positionToCell(p.position)),...reserved];
 const pick=(separation)=>getWalkableCells(maze).filter(c=>{
  const index=c.y*maze.width+c.x,pos=center(c);
  return field[index]>=threshold&&baseField[index]>=baseThreshold&&(c.x!==maze.exit.x||c.y!==maze.exit.y)&&canOccupy(maze.grid,pos.x,pos.y)&&!occupied.some(o=>Math.abs(o.x-c.x)+Math.abs(o.y-c.y)<separation)&&virusFields.every(f=>f[index]===-1||f[index]>=6);
 });
 let candidates=pick(minSeparation);if(!candidates.length)candidates=pick(1);
 if(!candidates.length)return null;
 const farthest=Math.max(...candidates.map(c=>field[c.y*maze.width+c.x]));
 candidates=candidates.filter(c=>field[c.y*maze.width+c.x]>=Math.max(threshold,farthest*.9));
 return center(candidates[Math.floor(room.random()*candidates.length)]);
}
export function addSafeWall(room,team,near){
 const maze=effectiveMaze(room,{team}),origin=positionToCell(near.position),candidates=getWalkableCells(maze).filter(c=>Math.abs(c.x-origin.x)+Math.abs(c.y-origin.y)<=7&&Math.abs(c.x-origin.x)+Math.abs(c.y-origin.y)>=2);
 for(const c of candidates.sort(()=>room.random()-.5)){
  if(c.x===maze.exit.x&&c.y===maze.exit.y)continue;
  if(room.players.some(p=>!p.removed&&p.state!=='ESCAPED'&&Math.hypot(p.position.x-center(c).x,p.position.y-center(c).y)<MAZE_TILE_SIZE))continue;
  if(room.viruses.some(v=>Math.hypot(v.x-center(c).x,v.y-center(c).y)<MAZE_TILE_SIZE))continue;
  const grid=maze.grid.map(r=>[...r]);grid[c.y][c.x]=1;
  const field=distanceField({...maze,grid});
  if(room.players.filter(p=>p.team===team&&['EXPLORING','ANSWERING'].includes(p.state)&&!p.removed).every(p=>cellDistance(field,maze,p.position)>=0)){
   room.walls.push({...c,team,until:room.clock+12000});return c;
  }
 }
 return null;
}
