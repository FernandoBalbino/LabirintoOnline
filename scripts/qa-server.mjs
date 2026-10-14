// Servidor local para conferir uma missão específica pela interface real.
// Não é utilizado pelo serviço publicado.
import {startServer} from '../server/index.mjs';
process.env.CLIENT_ORIGIN='http://localhost:3001,http://127.0.0.1:3001';
const server=await startServer({port:3001});
const configured=new Set();
setInterval(()=>{for(const room of server.rooms.values())if(room.status==='PLAYING')for(const p of room.players)if(!configured.has(p.id)){p.deck=['navegador-netflix',...p.deck.filter(id=>id!=='navegador-netflix')];configured.add(p.id);}},50);
process.on('SIGINT',async()=>{await server.close();process.exit(0);});
