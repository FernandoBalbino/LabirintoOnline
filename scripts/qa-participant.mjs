import {io} from 'socket.io-client';
const socket=io(process.argv[3]||'http://localhost:3001');
socket.on('connect',()=>socket.emit('room:join',{requestId:crypto.randomUUID(),code:process.argv[2],name:'Colega de validação'},result=>console.log(result.ok?'Colega conectado.':result.error)));
setTimeout(()=>{socket.disconnect();process.exit(0);},600000);
