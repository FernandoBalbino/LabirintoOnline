import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
async function files(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]))).flat();}
for(const file of [...await files('client'),...await files('shared'),...await files('server'),...await files('scripts')])if(/\.m?js$/.test(file)){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)throw new Error(result.stderr);}
const data=await import('../server/challenges.mjs');
for(const challenge of data.mazeChallenges)for(const item of [...challenge.payload?.items||[],...challenge.payload?.targets||[],...challenge.payload?.options||[]])if(item.icon)await access(path.join('client',item.icon));
for(const name of ['player-sprites.png','lab-props.png','virus-power-atlas.png','maze-luck-event-atlas.png','maze-meteor-sprites.png','team-flags.svg','online-powers-atlas.svg','infected-player-sprites.svg'])await access(path.join('client/assets/maze-game',name));
for(const file of await files('client/js'))if((await readFile(file,'utf8')).includes('challenge.solution'))throw new Error('Uma interface depende de respostas privadas.');
if((await readFile('shared/maze-core.mjs','utf8')).includes('CHALLENGE_RESTART_PASSWORD'))throw new Error('Senha fixa encontrada.');
console.log('Sintaxe, recursos e separação das respostas: OK.');
