import test from 'node:test';
import assert from 'node:assert/strict';
import {browserChallenges,extraHardware,validateBrowserResponse} from '../server/extra-challenges.mjs';
import {renderBrowser,handleBrowserSubmit,handleBrowserClick} from '../client/js/browser-challenges.mjs';
import {Room,token,hashToken} from '../server/room.mjs';
const manager=id=>({challenge:browserChallenges.find(c=>c.id===id),simState:{},render(){},feedback:null,selectedResponse:null});
const click=(m,data)=>handleBrowserClick(m,{target:{closest:()=>({dataset:data,hasAttribute:key=>Object.hasOwn(data,key.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))})}});
const search=(m,query)=>handleBrowserSubmit(m,{preventDefault(){},target:{matches:()=>true,hasAttribute:key=>key==='data-browser-search',elements:{query:{value:query}}}});
test('24 novos exercícios completam o banco, com 16 missões de navegador e 8 de hardware',()=>{assert.equal(browserChallenges.length,16);assert.equal(extraHardware.length,8);assert.equal(new Set([...browserChallenges,...extraHardware].map(c=>c.id)).size,24);});
test('pesquisar Netflix e abrir resultado exige as duas ações e confirmação',()=>{const m=manager('navegador-netflix');assert.match(renderBrowser(m),/Pesquisa do Google/);assert.equal(m.selectedResponse,null);search(m,'Netflix');assert.match(renderBrowser(m),/Netflix — site oficial/);assert.equal(validateBrowserResponse(m.challenge,m.selectedResponse),false);click(m,{browserOpen:'netflix'});assert.match(renderBrowser(m),/Filmes, séries e muito mais/);assert.equal(validateBrowserResponse(m.challenge,m.selectedResponse),true);assert.equal(m.feedback,null);assert.equal(validateBrowserResponse(m.challenge,['open:netflix']),false);});
test('voltar, avançar, novas abas, favoritos e downloads têm consequências visíveis',()=>{
 const back=manager('navegador-voltar');renderBrowser(back);click(back,{browserBack:''});assert.equal(back.simState.browser.tabs[0].page,'google');assert.ok(validateBrowserResponse(back.challenge,back.selectedResponse));
 const forward=manager('navegador-avancar');renderBrowser(forward);click(forward,{browserForward:''});assert.equal(forward.simState.browser.tabs[0].page,'netflix');
 const tabs=manager('navegador-nova-aba');renderBrowser(tabs);click(tabs,{browserNewTab:''});assert.equal(tabs.simState.browser.tabs.length,2);assert.equal(tabs.simState.browser.tabs[0].page,'netflix');
 const favorite=manager('navegador-favoritar');renderBrowser(favorite);click(favorite,{browserBookmark:''});assert.ok(favorite.simState.browser.favorites.includes('wikipedia'));
 const download=manager('navegador-download');renderBrowser(download);click(download,{browserDownload:'aula.pdf'});assert.ok(download.simState.browser.downloads.includes('aula.pdf'));click(download,{browserMenu:'downloads'});assert.match(renderBrowser(download),/aula.pdf • Concluído/);assert.ok(validateBrowserResponse(download.challenge,download.selectedResponse));
});
test('servidor valida missão de navegador sem publicar a sequência correta',()=>{const r=new Room({code:'BROW01',seed:'browser-qa',teacherHash:hashToken(token())});r.addPlayer('Aluno A');r.addPlayer('Aluno B');r.start();const p=r.players[0];p.deck=['navegador-netflix'];r.openQuestion(p);assert.equal(JSON.stringify(r.snapshot(p)).includes('solution'),false);const args={challengeId:p.challenge,questionSerial:p.questionSerial};assert.equal(r.answer(p,{...args,response:['open:netflix']}).correct,false);assert.equal(r.answer(p,{...args,response:['search:netflix','open:netflix']}).correct,true);});
