import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('dist-worker',{recursive:true});
await build({entryPoints:['cloudflare/worker.mjs'],outfile:'dist-worker/worker.mjs',bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers','node:crypto'],minify:true});
console.log('Worker preparado.');
