import {createClient} from 'redis';
export class Persistence{
 constructor(url){this.client=url?createClient({url,socket:{connectTimeout:5000,reconnectStrategy:attempt=>Math.min(3000,200*attempt)}}):null;this.ready=false;this.error=null;this.pending=new Map();this.namespace='labirinto:v1:';if(this.client)this.client.on('error',error=>{this.ready=false;this.error=error.code||'CONNECTION_ERROR';}).on('ready',()=>{this.ready=true;this.error=null;});}
 async connect(){if(!this.client)return;const connection=this.client.connect().catch(()=>{});await Promise.race([connection,new Promise(resolve=>setTimeout(resolve,6000))]);this.ready=this.client.isReady;}
 async restore(){if(!this.ready)return [];const rooms=[];for await(const keys of this.client.scanIterator({MATCH:`${this.namespace}room:*`,COUNT:50}))for(const key of keys){try{const data=JSON.parse(await this.client.get(key));if(data)rooms.push(data);}catch{this.error='INVALID_SNAPSHOT';}}return rooms;}
 save(room){
  if(!this.ready)return Promise.resolve(false);
  const payload=JSON.stringify(room.serialize()),key=`${this.namespace}room:${room.code}`;
  const job=(this.pending.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>{if(!this.ready)return false;try{await this.client.set(key,payload,{EX:7200});return true;}catch{this.ready=false;return false;}});
  this.pending.set(key,job);return job;
 }
 async remove(code){if(this.ready)await this.client.del(`${this.namespace}room:${code}`);}
 async close(){await Promise.allSettled([...this.pending.values()]);if(this.client?.isOpen)await this.client.quit().catch(()=>this.client.destroy());}
}
