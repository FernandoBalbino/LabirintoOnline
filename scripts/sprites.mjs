import {writeFile,mkdir} from 'node:fs/promises';
const dir='client/assets/maze-game';await mkdir(dir,{recursive:true});
const colors=['#49aaff','#ff647b','#6ee69c','#ffd960'];
const start=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">`;
let flags=start(128,32);
colors.forEach((color,i)=>{flags+=`<g transform="translate(${i*32},0)"><path fill="#091827" d="M5 2h3v28H5zM8 3h20v17H8z"/><path fill="${color}" d="M8 5h18v13H8z"/><path fill="#fff" d="${['M15 7h4v2h2v4h-2v2h-4v-2h-2V9h2z','M15 7h4v3h3v5H12v-5h3z','M14 8h6v6h-6z','M13 7h8v8h-8z'][i]}"/></g>`;});flags+='</svg>';await writeFile(`${dir}/team-flags.svg`,flags);
// Dix icônes dessinées en pixels, sans ressources provisoires.
const glyphs=[
 '<path d="M4 8h17v4H4zM4 6h5v8H4zM16 20h13v4H16zM24 18h5v8h-5z"/><path fill="#fff" d="M9 6h3v8H9zM21 18h3v8h-3z"/>',
 '<path d="M10 3h12v4h3v12h-3v4H10v-4H7V7h3zM12 25h8v4h-8z"/><path fill="#091827" d="M10 6h4v7h7v4h-7v-4h-4z"/>',
 '<path d="M9 4h14v4h4v16h-4v4H9v-4H5V8h4z"/><path fill="#091827" d="M12 9h9v14h-9z"/><path fill="#fff" d="M15 12h3v8h-3z"/>',
 '<path d="M14 2h4v28h-4zM3 14h26v4H3zM6 5h4v5H6zM22 5h4v5h-4zM6 22h4v5H6zM22 22h4v5h-4z"/>',
 '<path d="M7 3h18v25H7z"/><path fill="#091827" d="M11 7h10v17H11z"/><path fill="#ff647b" d="M13 9h3v4h4v3h-4v6h-3z"/>',
 '<path d="M4 6h8v14h6v7H4zM18 4h7v13h5v7H18z"/><path fill="#fff" d="M10 10h8v3h-8zM13 14h8v3h-8z"/>',
 '<path d="M3 5h26v7H3zM3 14h12v7H3zM17 14h12v7H17zM3 23h26v6H3z"/><path fill="#fff" d="M5 7h10v2H5zM19 16h7v2h-7z"/>',
 '<path d="M3 4h7v7H3zM3 13h7v14H3zM22 4h7v7h-7zM22 13h7v14h-7zM11 15h4v4h-4zM17 15h4v4h-4z"/><path fill="#fff" d="M13 5h6v3h-6zM15 8h2v5h-2z"/>',
 '<path d="M6 5h20v23h-4v-4h-4v4h-4v-4h-4v4H6z"/><path fill="#fff" d="M10 10h4v5h-4zM18 10h4v5h-4z"/>',
 '<path d="M3 4h7v7H3zM3 13h7v14H3zM22 4h7v7h-7zM22 13h7v14h-7zM10 5h12v3H10zM10 22h12v3H10z"/><path fill="#fff" d="M18 3h4v7h-4zM10 20h4v7h-4z"/>'
];
let atlas=start(160,64);const palette=['#52d9e7','#ffd960','#b790ff','#b6f5ff','#ff647b','#ffba6b','#62e5c3','#ffd960','#b790ff','#ff8bd4'];
glyphs.forEach((g,i)=>atlas+=`<g transform="translate(${i%5*32},${Math.floor(i/5)*32})" fill="${palette[i]}" stroke="#091827" stroke-width="1">${g}</g>`);atlas+='</svg>';await writeFile(`${dir}/online-powers-atlas.svg`,atlas);
let infected=start(128,32);for(let i=0;i<4;i++)infected+=`<g transform="translate(${i*32},0)"><path fill="#081827" d="M9 3h14v5h5v17h-5v4H9v-4H4V8h5z"/><path fill="${i%2?'#d777ef':'#ac58d3'}" d="M9 6h14v4h3v13h-3v4H9v-4H6V10h3z"/><path fill="#e8ff7e" d="M10 11h4v5h-4zM19 11h4v5h-4z"/><path fill="#07131f" d="M13 20h8v3h-8z"/><path fill="#52d9e7" d="M6 2h3v5H6zM24 2h3v5h-3z"/></g>`;infected+='</svg>';await writeFile(`${dir}/infected-player-sprites.svg`,infected);
await writeFile(`${dir}/online-sprites.json`,JSON.stringify({cell:32,powers:{file:'online-powers-atlas.svg',columns:5,rows:2,ids:['inverter','apagao','caos','congelamento-coletivo','saida-falsa','maldicao','muralha','separacao','fantasma','troca']},flags:{file:'team-flags.svg',columns:4,rows:1},infected:{file:'infected-player-sprites.svg',columns:4,rows:1}},null,2));
console.log('Sprites pixel art criados.');
