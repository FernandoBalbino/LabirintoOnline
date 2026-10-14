import test from 'node:test';
import assert from 'node:assert/strict';
import {replayPendingInputs} from '../shared/prediction.mjs';
const maze={width:5,height:3,grid:[[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1]]};
const position={x:54,y:54,direction:'down',moving:false};
test('correção autoritativa reaplica apenas o trecho pendente sem atravessar paredes',()=>{
 const commands=[{at:100,x:1,y:0},{at:200,x:1,y:0}];
 const predicted=replayPendingInputs({maze,position,commands,now:300,speed:100});
 assert.equal(predicted.x,74);assert.equal(position.x,54);
 const blocked=replayPendingInputs({maze,position,commands,now:300,speed:1000});assert.ok(blocked.x<144);
});
test('predição limita atraso e respeita inversão e congelamento',()=>{
 const commands=[{at:0,x:1,y:0}];
 assert.equal(replayPendingInputs({maze,position,commands,now:10000,speed:100}).x,79);
 assert.equal(replayPendingInputs({maze,position,commands,now:10000,speed:0}).x,54);
 const inverted=replayPendingInputs({maze,position:{...position,x:90},commands,now:100,speed:100,inverted:true});assert.equal(inverted.x,80);
});
