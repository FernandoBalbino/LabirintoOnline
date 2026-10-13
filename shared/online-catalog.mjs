import { mazePowers, mazeEvents } from './catalog.mjs';
export { mazeEvents };
export const teams = [
 {id:'azul',name:'Azul',color:'#49aaff',symbol:'◆'},
 {id:'vermelha',name:'Vermelha',color:'#ff647b',symbol:'▲'},
 {id:'verde',name:'Verde',color:'#6ee69c',symbol:'●'},
 {id:'amarela',name:'Amarela',color:'#ffd960',symbol:'■'}
];
export const sabotagePowers = [
 ['inverter','Controles invertidos','Inverte os comandos dos exploradores adversários por 8 segundos.',8],
 ['apagao','Apagão total','Reduz a visão dos adversários por 6 segundos.',6],
 ['caos','Teletransporte do caos','Envia adversários a regiões seguras, distantes da saída.',0],
 ['congelamento-coletivo','Congelamento coletivo','Imobiliza adversários por 4 segundos, protegendo-os dos vírus.',4],
 ['saida-falsa','Saída falsa','Cria uma armadilha de portal por 15 segundos.',15],
 ['maldicao','Maldição da lentidão','Reduz a velocidade dos adversários pela metade por 10 segundos.',10],
 ['muralha','Muralha surpresa','Cria obstáculos seguros para os adversários por 12 segundos.',12],
 ['separacao','Separação forçada','Separa grupos adversários sem aproximá-los da saída.',0],
 ['fantasma','Labirinto fantasma','Confunde adversários com paredes atravessáveis por 10 segundos.',10],
 ['troca','Troca de corpos','Troca posições adversárias ou usa destinos punitivos seguros.',0]
].map(([id,name,description,duration],index)=>({id,name,description,duration,sabotage:true,icon:{sheet:'online',index,columns:5,rows:2}}));
export const powers = [...mazePowers,...sabotagePowers];
export const powerById = new Map(powers.map(p=>[p.id,p]));
export const DEFAULT_CONFIG={name:'Turma de informática',maxPlayers:24,teamCount:2,mapSize:'auto',width:69,height:51,powers:true,controlledViruses:true,timeLimit:0,allowJoin:true};
export const labels={EXPLORING:'Explorando',ANSWERING:'Respondendo questão',INFECTED:'Infectado',ESCAPED:'Escapou'};
