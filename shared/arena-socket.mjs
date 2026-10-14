// Transporte WebSocket para Cloudflare. Mantém confirmações e identificadores da aplicação.
export class ArenaSocket{
 constructor(url,{autoConnect=false,reconnectionDelay=700}={}){this.url=url.replace(/\/$/,'');this.handlers=new Map();this.pending=new Map();this.connected=false;this.stopped=true;this.delay=reconnectionDelay;if(autoConnect)this.connect();}
 on(event,handler){const list=this.handlers.get(event)||[];list.push(handler);this.handlers.set(event,list);return this;}
 once(event,handler){const wrapper=(...args)=>{this.off(event,wrapper);handler(...args);};return this.on(event,wrapper);}
 off(event,handler){this.handlers.set(event,(this.handlers.get(event)||[]).filter(f=>f!==handler));return this;}
 dispatch(event,...args){for(const handler of [...this.handlers.get(event)||[]])handler(...args);}
 connect(){if(this.connected||this.connecting)return this;this.stopped=false;this.connecting=true;fetch(`${this.url}/health`).then(r=>{if(!r.ok)throw new Error('Backend indisponível');if(this.stopped)return;this.connected=true;this.dispatch('connect');}).catch(()=>{this.dispatch('connect_error');this.retry();}).finally(()=>this.connecting=false);return this;}
 retry(){clearTimeout(this.retryTimer);if(!this.stopped)this.retryTimer=setTimeout(()=>this.connect(),this.delay);}
 disconnect(){this.stopped=true;clearTimeout(this.retryTimer);this.ws?.close(1000,'Saída voluntária');if(this.connected){this.connected=false;this.dispatch('disconnect','client disconnect');}return this;}
 get volatile(){return this;}
 timeout(ms){return {emit:(event,payload,callback)=>this.send(event,payload,callback,ms,true)};}
 emit(event,payload={},callback){this.send(event,payload,callback,10000,false);return this;}
 send(event,payload,callback,timeout,withError){
  const finish=(error,result)=>{if(callback){if(withError)callback(error,result);else callback(error?{ok:false,error:error.message}:result);}};
  if(['room:create','room:join','room:resume'].includes(event)){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   fetch(`${this.url}/${event.replace(':','/')}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal}).then(r=>r.json()).then(async result=>{if(result.ok)await this.openRoom(result.code,result.token||payload.token,timeout);finish(null,result);}).catch(error=>finish(error)).finally(()=>clearTimeout(timer));return;
  }
  if(!this.ws||this.ws.readyState!==1){finish(new Error('Conexão perdida. Aguarde a reconexão.'));return;}
  const id=payload.requestId||crypto.randomUUID();
  if(callback){const timer=setTimeout(()=>{this.pending.delete(id);finish(new Error('Tempo de confirmação esgotado.'));},timeout);this.pending.set(id,{finish,timer});}
  this.ws.send(JSON.stringify({event,id,payload}));
 }
 openRoom(code,token,timeout){
  this.intentionalWs=this.ws;this.ws?.close();
  return new Promise((resolve,reject)=>{
   const url=new URL(`${this.url}/ws/${code}`);url.protocol=url.protocol==='https:'?'wss:':'ws:';
   const ws=new WebSocket(url),authId=crypto.randomUUID();this.ws=ws;
   const timer=setTimeout(()=>{reject(new Error('A conexão da sala demorou demais.'));ws.close();},timeout);
   ws.addEventListener('open',()=>ws.send(JSON.stringify({event:'session',id:authId,payload:{token}})));
   ws.addEventListener('message',event=>{
    let message;try{message=JSON.parse(event.data);}catch{return;}
    if(message.event==='ack'){
     if(message.id===authId){clearTimeout(timer);if(message.data.ok)resolve();else{reject(new Error(message.data.error));ws.close();}return;}
     const pending=this.pending.get(message.id);if(pending){clearTimeout(pending.timer);this.pending.delete(message.id);pending.finish(null,message.data);}return;
    }
    if(message.event==='ping'){ws.send(JSON.stringify({event:'pong',payload:{at:message.data.at}}));return;}
    this.dispatch(message.event,message.data);
   });
   ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Falha na conexão WebSocket.'));});
   ws.addEventListener('close',event=>{clearTimeout(timer);reject(new Error('A conexão da sala foi encerrada.'));if(ws===this.intentionalWs||ws!==this.ws)return;if(event.code===4009)this.stopped=true;if(this.connected){this.connected=false;this.dispatch('disconnect',event.code===4009?'Sessão aberta em outra aba.':'transport close');}this.retry();});
  });
 }
}
