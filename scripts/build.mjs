import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('client/vendor',{recursive:true});
await cp('node_modules/socket.io-client/dist/socket.io.esm.min.js','client/vendor/socket.io.esm.min.js');
await mkdir('dist',{recursive:true});
await cp('client','dist',{recursive:true});
await cp('shared','dist/shared',{recursive:true});
// As importações ../../shared partem de js/; no Pages o cliente é a raiz.
for (const file of ['maze-game-renderer.mjs','arena-renderer.mjs','app.mjs']) {
 const p=`dist/js/${file}`;
 const text=await readFile(p,'utf8');
 await writeFile(p,text.replaceAll('../../shared/','../shared/'));
}
const serverUrl=process.env.PUBLIC_SERVER_URL||'https://labirinto-online.onrender.com';
await writeFile('dist/config.mjs',`export const SERVER_URL=${JSON.stringify(serverUrl)};\n`);
async function list(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(d=>d.isDirectory()?list(`${dir}/${d.name}`):[`${dir}/${d.name}`]))).flat();}
const precache=(await list('dist')).filter(f=>!f.endsWith('precache.json')).map(f=>f.slice(5));
const digest=createHash('sha256');
for(const file of precache.filter(f=>/\.(mjs|css|html)$/.test(f)))digest.update(await readFile(`dist/${file}`));
const cacheVersion=digest.digest('hex').slice(0,12);
const worker=(await readFile('client/service-worker.js','utf8')).replace(/const CACHE='[^']+';/,`const CACHE='labirinto-online-${cacheVersion}';`);
await writeFile('client/service-worker.js',worker);await writeFile('dist/service-worker.js',worker);
await writeFile('dist/precache.json',JSON.stringify(precache));
await writeFile('client/precache.json',JSON.stringify(precache));
console.log('Frontend preparado em dist/.');
