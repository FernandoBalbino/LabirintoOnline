const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const sites={google:{title:'Google',url:'https://www.google.com'},netflix:{title:'Netflix',url:'https://www.netflix.com'},youtube:{title:'YouTube',url:'https://www.youtube.com'},wikipedia:{title:'Wikipédia',url:'https://www.wikipedia.org'},aula:{title:'Materiais da aula',url:'https://aula.escola/material'}};
function model(manager){
 if(manager.simState.browser)return manager.simState.browser;
 const p=manager.challenge.payload;
 const pages=p.tabs||[p.initialPage||'google'];
 manager.simState.browser={tabs:pages.map((page,index)=>({id:index,page,query:'',history:p.initialHistory?[...p.initialHistory]:[page],historyIndex:p.historyIndex??(p.initialHistory?p.initialHistory.length-1:0)})),active:p.activeTab||0,nextId:pages.length,favorites:[...p.favorites||[]],visited:[...p.visited||[]],downloads:[],actions:[],menu:null,note:''};
 return manager.simState.browser;
}
function current(b){return b.tabs[b.active];}
function record(manager,action){const b=model(manager);b.actions.push(action);if(b.actions.length>100)b.actions.shift();manager.selectedResponse=[...b.actions];manager.feedback=null;}
function navigate(manager,page){const b=model(manager),tab=current(b);tab.history=tab.history.slice(0,tab.historyIndex+1);tab.history.push(page);tab.historyIndex++;tab.page=page;b.menu=null;if(!b.visited.includes(page)&&sites[page]&&page!=='google')b.visited.push(page);}
function address(page,query){return page==='search'?`https://www.google.com/search?q=${encodeURIComponent(query)}`:sites[page]?.url||sites.google.url;}
function googleLogo(){return '<span class="browser-google-logo"><i>G</i><i>o</i><i>o</i><i>g</i><i>l</i><i>e</i></span>';}
export function renderBrowser(manager){
 const b=model(manager),tab=current(b),page=tab.page;
 const search=`<form data-browser-search class="browser-search-form"><input name="query" aria-label="Pesquisa do Google" value="${esc(tab.query)}" autocomplete="off" placeholder="Pesquise no Google"><button type="submit" aria-label="Pesquisar no Google">⌕</button></form>`;
 let body;
 if(page==='google')body=`<div class="browser-google-home"><nav>Gmail <span>Imagens</span><b aria-label="Aplicativos Google">▦</b><span class="browser-avatar">A</span></nav>${googleLogo()}${search}<p>Pesquise no Google ou use a barra de endereço.</p></div>`;
 else if(page==='search'){
  const term=normalize(tab.query),result=term.includes('netflix')?'netflix':term.includes('youtube')?'youtube':term.includes('wikipedia')?'wikipedia':null;
  body=`<div class="browser-results"><header>${googleLogo()}${search}</header><div class="browser-result-tabs">Todas &nbsp;&nbsp; Imagens &nbsp;&nbsp; Vídeos &nbsp;&nbsp; Notícias</div><small>Resultados para ${esc(tab.query)}</small>${result?[result,'aula'].map(id=>`<article><small>${esc(sites[id].url)}</small><button data-browser-open="${id}">${esc(id===result?`${sites[id].title} — site oficial`:sites[id].title)}</button><p>${id==='netflix'?'Filmes, séries e muito mais.':id==='youtube'?'Assista a vídeos, músicas e aulas.':id==='wikipedia'?'Explore a enciclopédia livre.':'Materiais e atividades da aula.'}</p></article>`).join(''):`<article><small>Pesquisa da aula</small><h3>${esc(tab.query)}: informações e exemplos</h3><p>Use o campo de pesquisa para procurar outro assunto.</p></article>`}</div>`;
 }else if(page==='netflix')body='<div class="browser-netflix"><strong class="browser-netflix-logo">NETFLIX</strong><button data-browser-note="Este é o site que você abriu na missão. Nenhuma conta é necessária.">Entrar</button><h3>Filmes, séries e muito mais</h3><p>Você chegou à página da Netflix.</p><div class="browser-poster-row"><span>AVENTURA</span><span>ANIMAÇÃO</span><span>DOCUMENTÁRIO</span></div></div>';
 else if(page==='youtube')body='<div class="browser-youtube"><header><strong><b>▶</b> YouTube</strong><span>Pesquisar vídeos</span></header><h3>Vídeos para explorar</h3><div class="browser-video-row"><article><span>▶</span><p>Aula de informática</p></article><article><span>▶</span><p>Conhecendo o computador</p></article></div></div>';
 else if(page==='wikipedia')body='<div class="browser-wikipedia"><strong>WIKIPÉDIA</strong><p>A enciclopédia livre</p><div>🌐</div><h3>Conhecimento para todos</h3><p>Português • Artigos e informações</p></div>';
 else body='<div class="browser-classroom"><h3>Materiais da aula</h3><p>Material de informática em PDF.</p><button data-browser-download="aula.pdf">↓ Baixar aula.pdf</button></div>';
 const menu=b.menu==='bookmarks'?`<strong>Favoritos</strong>${b.favorites.map(id=>`<button data-browser-favorite="${id}">${esc(sites[id].title)}</button>`).join('')||'<p>Nenhum favorito salvo.</p>'}`:b.menu==='history'?`<strong>Histórico</strong>${b.visited.map(id=>`<button data-browser-history="${id}">${esc(sites[id]?.title||id)}</button>`).join('')||'<p>Nenhum site no histórico.</p>'}`:b.menu==='downloads'?`<strong>Downloads</strong>${b.downloads.map(file=>`<p>✓ ${esc(file)} • Concluído</p>`).join('')||'<p>Nenhum download.</p>'}`:b.menu==='main'?'<button data-browser-menu="history">Histórico</button><button data-browser-menu="downloads">Downloads</button><button data-browser-menu="bookmarks">Favoritos</button>':'';
 return `<div class="browser-simulation" aria-label="Navegador da missão"><div class="browser-tab-strip">${b.tabs.map((t,i)=>`<div class="browser-tab ${i===b.active?'active':''}"><button data-browser-tab="${i}" aria-label="Alternar para a aba ${esc(sites[t.page]?.title||'Pesquisa Google')}">${esc(sites[t.page]?.title||'Pesquisa Google')}</button><button data-browser-close-tab="${i}" aria-label="Fechar aba ${esc(sites[t.page]?.title||'Pesquisa Google')}">×</button></div>`).join('')}<button data-browser-new-tab aria-label="Nova aba">+</button></div><div class="browser-toolbar"><button data-browser-back aria-label="Voltar" ${tab.historyIndex===0?'disabled':''}>←</button><button data-browser-forward aria-label="Avançar" ${tab.historyIndex>=tab.history.length-1?'disabled':''}>→</button><button data-browser-reload aria-label="Atualizar página">↻</button><form data-browser-address><input name="address" aria-label="Barra de endereço" value="${esc(address(page,tab.query))}" autocomplete="off"><button type="submit" aria-label="Ir para endereço">→</button></form><button data-browser-bookmark aria-label="Adicionar aos favoritos">${b.favorites.includes(page)?'★':'☆'}</button><button data-browser-menu="main" aria-label="Menu do navegador">⋮</button></div><div class="browser-page">${body}</div>${b.menu?`<aside class="browser-menu">${menu}<button data-browser-menu="close">Fechar menu</button></aside>`:''}${b.note?`<div class="browser-note" role="status">${esc(b.note)}</div>`:''}<small class="browser-sim-caption">Navegador da missão • confirme em VERIFICAR quando terminar.</small></div>`;
}
export function handleBrowserClick(manager,event){
 const button=event.target.closest('button');if(!button)return false;
 const b=model(manager),tab=current(b);let handled=true;
 if(button.dataset.browserOpen){const page=button.dataset.browserOpen;navigate(manager,page);record(manager,`open:${page}`);}
 else if(button.hasAttribute('data-browser-back')){if(tab.historyIndex>0){tab.page=tab.history[--tab.historyIndex];record(manager,'back');}}
 else if(button.hasAttribute('data-browser-forward')){if(tab.historyIndex<tab.history.length-1){tab.page=tab.history[++tab.historyIndex];record(manager,'forward');}}
 else if(button.hasAttribute('data-browser-reload')){b.note='Página atualizada.';record(manager,'reload');}
 else if(button.hasAttribute('data-browser-new-tab')){b.tabs.push({id:b.nextId++,page:'google',query:'',history:['google'],historyIndex:0});b.active=b.tabs.length-1;record(manager,'new-tab');}
 else if(button.dataset.browserTab!==undefined){b.active=Number(button.dataset.browserTab);record(manager,`tab:${current(b).page}`);}
 else if(button.dataset.browserCloseTab!==undefined){const index=Number(button.dataset.browserCloseTab);if(b.tabs.length>1){record(manager,`close:${b.tabs[index].page}`);b.tabs.splice(index,1);b.active=Math.min(b.active,b.tabs.length-1);}}
 else if(button.hasAttribute('data-browser-bookmark')){if(sites[tab.page]&&!b.favorites.includes(tab.page))b.favorites.push(tab.page);b.note='Página adicionada aos favoritos.';record(manager,'bookmark');}
 else if(button.dataset.browserMenu){const type=button.dataset.browserMenu;b.menu=type==='close'?null:type;if(type==='history')record(manager,'history-menu');if(type==='downloads')record(manager,'downloads-menu');if(type==='bookmarks')record(manager,'bookmark-menu');}
 else if(button.dataset.browserFavorite){navigate(manager,button.dataset.browserFavorite);record(manager,`favorite:${button.dataset.browserFavorite}`);}
 else if(button.dataset.browserHistory){navigate(manager,button.dataset.browserHistory);record(manager,`history:${button.dataset.browserHistory}`);}
 else if(button.dataset.browserDownload){const file=button.dataset.browserDownload;if(!b.downloads.includes(file))b.downloads.push(file);b.note=`${file} foi salvo em Downloads.`;record(manager,`download:${file}`);}
 else if(button.dataset.browserNote)b.note=button.dataset.browserNote;
 else handled=false;
 if(handled)manager.render();return handled;
}
export function handleBrowserSubmit(manager,event){
 const form=event.target;if(!form.matches('[data-browser-search],[data-browser-address]'))return false;event.preventDefault();
 const tab=current(model(manager));
 if(form.hasAttribute('data-browser-search')){tab.query=form.elements.query.value.trim();if(!tab.query)return true;navigate(manager,'search');record(manager,`search:${normalize(tab.query)}`);}
 else{const value=normalize(form.elements.address.value),site=value.includes('netflix.com')?'netflix':value.includes('youtube.com')?'youtube':value.includes('wikipedia.org')?'wikipedia':value.includes('google.com')?'google':null;if(site){navigate(manager,site);record(manager,`address:${site}`);}else{tab.query=form.elements.address.value.trim();navigate(manager,'search');record(manager,`search:${normalize(tab.query)}`);}}
 manager.render();return true;
}
