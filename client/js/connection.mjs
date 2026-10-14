import {io} from '../vendor/socket.io.esm.min.js';
import {SERVER_URL} from '../config.mjs';
import {ArenaSocket} from '../../shared/arena-socket.mjs';
export class Connection{
 constructor({onSnapshot,onNotice,onStatus,onRemoved}){
  const cloudflare=SERVER_URL.includes('.workers.dev')||SERVER_URL.includes(':8787');
  this.socket=cloudflare?new ArenaSocket(SERVER_URL):io(SERVER_URL,{autoConnect:false,reconnection:true,reconnectionDelay:700,reconnectionDelayMax:5000,timeout:10000});this.session=JSON.parse(localStorage.getItem('labirinto.session')||'null');this.sequence=0;this.connected=false;this.resuming=false;this.pending=new Map();this.inputHistory=[];
  if(this.session&&(this.session.backend||'https://labirinto-online.onrender.com')!==SERVER_URL){this.session=null;localStorage.removeItem('labirinto.session');}
  this.socket.on('snapshot',s=>{this.latest=s;onSnapshot(s);});
  this.socket.on('delta',d=>{if(!this.latest||d.version<this.latest.version)return;const s={...this.latest,clock:d.clock,version:d.version,viruses:d.viruses,players:this.latest.players.map(p=>({...p,position:{...p.position}})),me:this.latest.me?{...this.latest.me,...d.me}:null};for(const [index,x,y,direction,moving]of d.positions){if(s.players[index])s.players[index].position={x,y,direction:['down','left','right','up'][direction],moving:!!moving};}this.latest=s;onSnapshot(s);});
  this.socket.on('notice',onNotice);this.socket.on('removed',()=>{localStorage.removeItem('labirinto.session');this.session=null;onRemoved();});
  this.socket.on('connect',async()=>{this.connected=true;this.sequence=0;onStatus('Conectado à arena',true);if(this.session&&!this.resuming){this.resuming=true;try{await this.request('room:resume',this.session);onStatus('Partida reconectada',true);}catch(error){onStatus(error.message,false);localStorage.removeItem('labirinto.session');this.session=null;}finally{this.resuming=false;}}});
  this.socket.on('disconnect',()=>{this.connected=false;this.inputHistory=[];onStatus('Conexão perdida. Tentando voltar à partida…',false);});
  this.socket.on('connect_error',()=>onStatus('Aguardando o servidor. Tentando conectar…',false));
 }
 async connect(){
  if(this.socket.connected)return;
  this.socket.connect();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.socket.off('connect',ready);reject(new Error('O servidor ainda está iniciando. Aguarde e tente novamente.'));},90000);const ready=()=>{clearTimeout(timer);resolve();};this.socket.once('connect',ready);});
 }
 async request(event,payload={}){
  if(!this.socket.connected)throw new Error('Conexão perdida. Aguarde a reconexão.');
  const requestId=payload.requestId||crypto.randomUUID(),data={...payload,requestId};
  for(let attempt=0;attempt<3;attempt++){
   try{return await new Promise((resolve,reject)=>this.socket.timeout(5000).emit(event,data,(error,result)=>{if(error)return reject(error);if(!result?.ok)return reject(Object.assign(new Error(result?.error||'Não foi possível concluir.'),{server:true}));resolve(result);}));}
   catch(error){if(error.server||attempt===2)throw error;}
  }
 }
 save(result){this.session={code:result.code,token:result.token,role:result.role,playerId:result.playerId,backend:SERVER_URL};localStorage.setItem('labirinto.session',JSON.stringify(this.session));}
 input(x,y){if(this.socket.connected&&this.session?.role==='student'){const now=performance.now();if(this.lastSentInput?.x===x&&this.lastSentInput?.y===y&&now-this.lastSentInput.at<250)return;this.lastSentInput={x,y,at:now};const command={seq:++this.sequence,x,y};this.inputHistory.push({...command,at:now});if(this.inputHistory.length>40)this.inputHistory.shift();this.socket.volatile.emit('player:input',command);}}
 pendingInputs(acknowledged){this.inputHistory=this.inputHistory.filter(command=>command.seq>acknowledged);return this.inputHistory;}
 leave(){localStorage.removeItem('labirinto.session');this.session=null;this.socket.disconnect();}
}
