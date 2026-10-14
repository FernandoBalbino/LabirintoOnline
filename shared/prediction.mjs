import {movePlayer} from './maze-core.mjs';
// Reaplica somente comandos ainda não confirmados, com horizonte limitado.
export function replayPendingInputs({maze,position,commands,now,speed,inverted=false,maxSeconds=.25}){
 let predicted={...position};
 for(let i=0;i<commands.length;i++){
  const command=commands[i],start=Math.max(command.at,now-maxSeconds*1000),end=Math.min(now,commands[i+1]?.at??now);
  if(end<=start)continue;
  const sign=inverted?-1:1;
  let remaining=(end-start)/1000;
  while(remaining>0){const step=Math.min(.05,remaining);predicted=movePlayer({maze,position:predicted,input:{x:command.x*sign,y:command.y*sign},deltaSeconds:step,speed});remaining-=step;}
 }
 return predicted;
}
