import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {Room} from '../server/room.mjs';
import {center} from '../server/maps.mjs';
import {findShortestPath,positionToCell,getWalkableCells} from '../shared/maze-core.mjs';
const r=new Room({code:'BENCH1',seed:'shared-bfs-benchmark'});
for(let i=0;i<24;i++)r.addPlayer(`Aluno ${i+1}`);r.start();
const v=r.viruses[0];Object.assign(v,center(r.maze.exit),{sprinting:true,sprintEndsAt:999999});
const cells=getWalkableCells(r.maze).filter(c=>Math.abs(c.x-r.maze.exit.x)+Math.abs(c.y-r.maze.exit.y)<=45);
for(let i=0;i<24;i++)r.players[i].position=center(cells[Math.floor(cells.length*(i+.5)/24)]);
const rounds=100;
function before(){let shortest=null;for(const p of r.players){const path=findShortestPath(r.maze,positionToCell(v),positionToCell(p.position));if(path.length&&(!shortest||path.length<shortest.length))shortest=path;}return shortest;}
function after(){v.path=[];v.pathRefreshAt=0;r.advanceVirus(v,0);}
for(let i=0;i<10;i++){before();after();}
let at=performance.now();for(let i=0;i<rounds;i++)before();const oldMs=performance.now()-at;
at=performance.now();for(let i=0;i<rounds;i++)after();const newMs=performance.now()-at;
const report={environment:'Local; não representa a latência do serviço publicado',players:24,refreshes:rounds,oldTotalMs:oldMs,newTotalMs:newMs,reductionPercent:(1-newMs/oldMs)*100};
await writeFile('docs/routing-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
