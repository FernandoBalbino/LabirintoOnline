import {hero,gameShell} from './original-views.mjs';
import {Connection} from './connection.mjs';
import {ArenaRenderer} from './arena-renderer.mjs';
import {ChallengeManager} from './maze-game-challenges.mjs';
import {GameAudio} from './audio.mjs';
import {teams,powerById,labels,DEFAULT_CONFIG} from '../../shared/online-catalog.mjs';
import {formatClock,movePlayer,PLAYER_SPEED,findShortestPath,positionToCell} from '../../shared/maze-core.mjs';
const app=document.querySelector('#app'),modal=document.querySelector('#modal'),status=document.querySelector('#connection-status'),audio=new GameAudio();
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let snapshot=null,maze=null,renderer=null,manager=null,viewKey='',questionKey='',choiceKey='',lastReceived=0,previousActors=new Map(),currentActors=new Map(),predicted=null,keys=new Set(),virtual=null,lastFrame=0,lastStep=0,toastTimer=null,spectatorId=null;
const connection=new Connection({onSnapshot:receive,onNotice:notice,onStatus:(text,connected)=>{status.textContent=text;status.classList.toggle('lost',!connected);if(!connected){keys.clear();virtual=null;}},onRemoved:()=>{snapshot=null;showHome();showMessage('Participação encerrada','O professor removeu você desta sala.');}});
const dir={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
showHome();status.textContent='Arena online • conexão necessária';
if(connection.session)connection.connect().catch(error=>{status.textContent=error.message;});
function showHome(){document.body.classList.remove('maze-game-active');renderer=null;manager=null;viewKey='home';app.innerHTML=hero;app.querySelector('[data-maze-action="toggle-sound"]').textContent=audio.soundEnabled?'🔊 Som ligado':'🔇 Som desligado';}
function dialog(content){modal.hidden=false;modal.innerHTML=`<section class="online-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button class="dialog-close" data-close aria-label="Fechar">×</button>${content}</section>`;requestAnimationFrame(()=>modal.querySelector('input,button:not(.dialog-close)')?.focus());}
function closeDialog(){modal.hidden=true;modal.innerHTML='';app.querySelector('button')?.focus();}
function showMessage(title,message){dialog(`<h2 id="dialog-title">${escape(title)}</h2><p>${escape(message)}</p><button class="maze-primary-button" data-close>ENTENDI</button>`);}
function showRoles(){audio.ensureAudio();dialog('<span class="maze-kicker">Arena online</span><h2 id="dialog-title">Como você vai participar?</h2><div class="role-options"><button data-role="teacher"><strong>SOU PROFESSOR</strong><small>Crie uma sala, organize equipes e acompanhe a turma.</small></button><button data-role="student"><strong>SOU ALUNO</strong><small>Entre com seu nome e o código informado pelo professor.</small></button></div>');}
function showEntry(role){dialog(`<span class="maze-kicker">${role==='teacher'?'Professor':'Aluno'}</span><h2 id="dialog-title">${role==='teacher'?'Crie sua sala':'Entre na arena'}</h2><form class="online-form" data-entry="${role}">${role==='teacher'?'<label>Nome da sala<input name="name" maxlength="60" value="Turma de informática" required></label>':'<label>Seu nome<input name="name" maxlength="30" minlength="2" autocomplete="given-name" required></label><label>Código da sala<input name="code" maxlength="6" minlength="6" autocomplete="off" style="text-transform:uppercase" required></label>'}<p class="lobby-note">${role==='teacher'?'O servidor gratuito pode levar cerca de um minuto para iniciar.':'Sem conta e sem e-mail. A turma joga no mesmo labirinto.'}</p><p class="form-error" role="alert"></p><button class="maze-primary-button" type="submit">${role==='teacher'?'CRIAR SALA':'ENTRAR NA SALA'} →</button></form>`);}
function scoreHtml(s){return s.scoreboard.map(t=>`<div class="score-row" style="--team-color:${t.color}"><strong>${t.symbol} ${t.name}</strong><b>${t.escaped} salvos</b><small>${t.exploring} explorando • ${t.infected} infectados</small></div>`).join('');}
function renderPanel(s){
 const teacher=!s.me,playing=s.status==='PLAYING'||s.status==='STARTING';
 const fingerprint=JSON.stringify([teacher,s.status,s.config,s.players.map(p=>[p.id,p.name,p.team,p.state,p.connected]),s.scoreboard,s.teacherConnected,s.recovering,s.persistence,playing?Math.floor(s.clock/1000):0]);if(viewKey===fingerprint)return;
 const form=document.querySelector('[data-config]'),values=form?new FormData(form):null,focused=form?.contains(document.activeElement)?document.activeElement.name:null;
 viewKey=fingerprint;document.body.classList.remove('maze-game-active');renderer=null;
 const groups=teams.slice(0,s.config.teamCount).map(t=>`<section class="team-card" style="--team-color:${t.color}"><h3>${t.symbol} Equipe ${t.name}</h3>${s.players.filter(p=>p.team===t.id).map(p=>`<div class="participant"><div><strong>${escape(p.name)}</strong><small>${playing?labels[p.state]:'Aguardando'} • ${p.connected?'Conectado':'Reconectando'}</small></div>${teacher?`<div>${p.state==='ANSWERING'?`<button data-release="${p.id}">Liberar 30s</button>`:''}<button data-remove="${p.id}" aria-label="Remover ${escape(p.name)}">Remover</button></div>`:''}</div>`).join('')||'<p>Aguardando alunos…</p>'}</section>`).join('');
 app.innerHTML=`<section class="online-panel"><div class="online-panel-head"><div><span class="maze-kicker">${teacher?'Painel do professor':'Sala da turma'}</span><h1>${escape(s.config.name)}</h1><p class="status-label">${s.players.filter(p=>p.connected).length}/${s.config.maxPlayers} alunos conectados • Professor ${s.teacherConnected?'conectado':'reconectando'}${playing?` • ${formatClock(s.clock/1000)} de partida`:''}</p></div><div class="room-code"><small>CÓDIGO DA SALA</small><strong>${s.code}</strong><button data-copy>Copiar código</button></div></div><div class="lobby-layout"><div><div class="teams-grid teacher-player-list">${groups}</div><div class="panel-actions">${teacher?(playing?`<button class="maze-primary-button" data-admin="${s.recovering?'continue':'finish'}">${s.recovering?'RETOMAR PARTIDA RECUPERADA':'ENCERRAR PARTIDA'}</button>`:'<button class="maze-primary-button" data-admin="start">INICIAR PARTIDA →</button><button class="secondary" data-admin="redistribute">Redistribuir equipes</button>'):'<p class="lobby-note">Aguarde o professor iniciar. Sua equipe e seu personagem aparecerão no labirinto.</p>'}<button class="secondary" data-leave>Voltar ao início</button></div><p class="form-error" id="panel-error" role="alert"></p></div><aside class="online-card">${playing?`<h2>Placar ao vivo</h2><div class="live-score">${scoreHtml(s)}</div><p class="lobby-note">${s.viruses.length+s.players.filter(p=>p.state==='INFECTED').length} vírus ativos.</p>`:teacher?configForm(s.config):`<h2>Sua missão</h2><p class="lobby-note">Encontre a saída, responda aos desafios e use os baús. Se um vírus capturar você, seu objetivo passa a ser infectar exploradores.</p><p class="lobby-note">Setas ou WASD para andar. Cada aluno tem seu próprio cronômetro.</p>`}<p class="lobby-note">${s.persistence?'Recuperação do backend ativa. O armazenamento gratuito pode perder dados se reiniciar.':'Recuperação após reinício indisponível. A reconexão funciona enquanto esta sala estiver ativa.'}</p></aside></div></section>`;
 if(focused&&values){const next=document.querySelector('[data-config]');for(const [name,value]of values)if(next.elements[name]&&next.elements[name].type!=='checkbox')next.elements[name].value=value;next.elements[focused]?.focus();}
}
function configForm(c){return `<h2>Configurar partida</h2><form class="online-form" data-config><div class="field-row"><label>Vagas<input name="maxPlayers" type="number" min="2" max="24" value="${c.maxPlayers}"></label><label>Equipes<select name="teamCount">${[2,3,4].map(n=>`<option ${c.teamCount===n?'selected':''}>${n}</option>`).join('')}</select></label></div><label>Mapa<select name="mapSize"><option value="auto" ${c.mapSize==='auto'?'selected':''}>Automático</option><option value="custom" ${c.mapSize==='custom'?'selected':''}>Personalizado</option></select></label><div class="field-row"><label>Largura<input name="width" type="number" min="31" max="131" step="2" value="${c.width}"></label><label>Altura<input name="height" type="number" min="31" max="101" step="2" value="${c.height}"></label></div><label>Limite da partida (minutos)<input name="timeMinutes" type="number" min="0" max="120" value="${c.timeLimit/60}"><small>0 = sem limite geral</small></label>${[['powers','Ativar poderes'],['controlledViruses','Infectados controlam seus vírus'],['allowJoin','Aceitar novos alunos no lobby']].map(([key,text])=>`<label class="check-label"><input name="${key}" type="checkbox" ${c[key]?'checked':''}>${text}</label>`).join('')}<button class="maze-primary-button" type="submit">SALVAR CONFIGURAÇÃO</button></form>`;}
function mountGame(){
 viewKey='game';document.body.classList.add('maze-game-active');app.innerHTML=gameShell;
 app.querySelector('.maze-canvas').tabIndex=0;
 app.querySelector('.maze-hud').insertAdjacentHTML('beforeend','<div class="live-score" data-score></div>');
 app.querySelector('.maze-viewport').insertAdjacentHTML('beforeend','<div class="online-effect-badge" hidden></div><div class="online-question-clock" hidden></div>');
 renderer=new ArenaRenderer(app.querySelector('canvas'));renderer.ready.catch(error=>showMessage('Recurso indisponível',error.message));
 manager=new ChallengeManager({submitResponse:(question,response)=>connection.request('player:answer',{challengeId:question.id,questionSerial:question.questionSerial,response}),playSound:kind=>audio.playSound(kind)});manager.mount(app.querySelector('.maze-challenge-host'));
 questionKey='';choiceKey='';keys.clear();virtual=null;predicted=null;app.querySelector('.maze-canvas').focus();
}
function receive(s){
 if(s.version<snapshot?.version&&s.code===snapshot.code)return;
 if(s.maze)maze=s.maze;
 previousActors=new Map([...currentActors].map(([id,p])=>[id,{...p,position:{...p.position}}]));currentActors=new Map(s.players.map(p=>[p.id,p]));lastReceived=performance.now();
 const before=snapshot;snapshot=s;
 if(s.status==='LOBBY'||!s.me&&['PLAYING','STARTING'].includes(s.status)){renderPanel(s);return;}
 if(['FINISHED','CANCELLED'].includes(s.status)){if(viewKey!=='result'){renderResult(s);audio.playSound('victory');}return;}
 if(s.status!=='PLAYING'||!s.me||!maze)return;
 if(viewKey!=='game')mountGame();
 if(!before?.me||before.me.teleportVersion!==s.me.teleportVersion)predicted={...s.me.position};
 else if(!predicted||Math.hypot(predicted.x-s.me.position.x,predicted.y-s.me.position.y)>25)predicted={...s.me.position};
 else predicted={...s.me.position};
 const q=s.me.challenge,qKey=q?`${q.id}:${q.questionSerial}`:'';
 const layer=app.querySelector('.maze-challenge-layer');
 if(qKey&&qKey!==questionKey){manager.show(q);audio.playSound('challenge');keys.clear();virtual=null;}else if(!qKey&&questionKey){manager.hide();app.querySelector('canvas').focus();}
 questionKey=qKey;layer.hidden=!qKey;app.querySelector('.maze-game-shell').classList.toggle('is-challenge-open',!!qKey);
 const choice=s.me.powerChoice,powerLayer=app.querySelector('.maze-power-layer');
 if(choice&&choice.id!==choiceKey){powerLayer.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="maze-power-title"><span class="maze-kicker">Baú encontrado!</span><h2 id="maze-power-title">ESCOLHA 1 DE 4 PODERES</h2><p>Escolha o efeito que você quer usar agora.</p><div class="maze-power-options">${choice.ids.map(id=>{const p=powerById.get(id);return `<button data-power="${id}"><span class="maze-power-icon" style="${iconStyle(p.icon)}" aria-hidden="true"></span><strong>${p.name}</strong><small>${p.description}</small><b>ESCOLHER ESTE</b></button>`;}).join('')}</div></section>`;audio.playSound('chest');requestAnimationFrame(()=>powerLayer.querySelector('button')?.focus());keys.clear();virtual=null;}
 choiceKey=choice?.id||'';powerLayer.hidden=!choice;app.querySelector('.maze-game-shell').classList.toggle('is-power-open',!!choice);
 updateHud();
}
function iconStyle(icon){const files={base:'virus-power-atlas.png','luck-event':'maze-luck-event-atlas.png',online:'online-powers-atlas.svg'};return `background-image:url('./assets/maze-game/${files[icon.sheet]}');background-size:${icon.columns*100}% ${icon.rows*100}%;background-position:${icon.index%icon.columns*100/(icon.columns-1)}% ${Math.floor(icon.index/icon.columns)*100/(icon.rows-1)}%`;}
function updateHud(){
 if(!snapshot?.me||viewKey!=='game')return;const p=snapshot.me,s=snapshot;
 app.querySelector('[data-maze-time]').textContent=p.state==='INFECTED'?'VÍRUS':p.state==='ESCAPED'?'SALVO':formatClock(p.remainingTime);
 app.querySelector('[data-maze-time-bar]').style.width=`${Math.min(100,p.remainingTime/Math.max(1,p.currentFreeTime)*100)}%`;
 app.querySelector('[data-maze-streak]').textContent=p.correctStreak;app.querySelector('[data-maze-next]').textContent=`Próximo acerto: ${20+Math.max(0,p.correctStreak)*10}s`;
 app.querySelector('[data-maze-status]').textContent=labels[p.state];app.querySelector('[data-maze-status-detail]').textContent=p.state==='INFECTED'?'Capture os exploradores.':p.state==='ESCAPED'?'Você está acompanhando a partida.':'O relógio é individual.';
 const team=teams.find(t=>t.id===p.team);app.querySelector('.maze-location-chip strong').textContent=`${team.symbol} ${team.name.toUpperCase()} • ${p.name}`;
 app.querySelector('.maze-hud-objective strong').textContent=p.state==='INFECTED'?'Infecte exploradores!':p.state==='ESCAPED'?'Você encontrou a saída!':'Encontre a saída!';
 app.querySelector('.maze-hud-objective p').textContent=p.state==='ESCAPED'?'Clique em outro personagem para acompanhá-lo.':p.state==='INFECTED'?(s.config.controlledViruses?'Use as setas ou WASD para perseguir exploradores.':'Seu vírus está sendo controlado pelo jogo.'):'Explore os corredores e guarde o caminho na memória.';
 const active=Object.entries({invertUntil:'Controles invertidos',blackoutUntil:'Apagão',freezeUntil:'Congelado',slowUntil:'Lentidão',phantomUntil:'Paredes fantasmas',speedUntil:'Botas turbo',stunUntil:'Vírus imobilizado',invisibleUntil:'Modo fantasma',seerUntil:'Olho vidente',compassUntil:'Bússola'}).filter(([key])=>p.effects[key]>s.clock).map(([key,text])=>`${text} ${Math.ceil((p.effects[key]-s.clock)/1000)}s`);
 app.querySelector('[data-maze-power-status]').textContent=active.join(' • ')||`${p.effects.shieldCharges||0} escudos • ${p.chests.filter(c=>!c.opened).length} baús`;
 app.querySelector('[data-maze-virus-status]').textContent=`${s.viruses.length+s.players.filter(v=>v.state==='INFECTED').length} vírus ativos`;
 const badge=app.querySelector('.online-effect-badge');badge.hidden=!active.length;badge.textContent=active.join(' • ');
 const clock=app.querySelector('.online-question-clock');clock.hidden=!p.challenge&&!p.powerChoice;
 clock.textContent=p.powerChoice?`Escolha em ${Math.max(0,Math.ceil((p.powerChoice.until-s.clock)/1000))}s`:p.questionExpired?'Proteção encerrada • tente responder':`Proteção: ${Math.max(0,Math.ceil((p.questionUntil-s.clock)/1000))}s`;
 app.querySelector('[data-score]').innerHTML=scoreHtml(s);
}
function renderResult(s){
 document.body.classList.remove('maze-game-active');viewKey='result';renderer=null;manager=null;const r=s.result,winner=teams.find(t=>t.id===r.winner);
 app.innerHTML=`<section class="online-panel"><div class="result-winner"><span class="maze-kicker">Resultado da arena</span><h1>${winner?`${winner.symbol} EQUIPE ${winner.name.toUpperCase()} VENCEDORA`:r.winner==='virus'?'VITÓRIA DOS VÍRUS':'PARTIDA ENCERRADA'}</h1><p>${r.winner==='virus'?'Nenhum explorador encontrou a saída.':r.winner?`${winner.name} salvou ${r.scoreboard.find(t=>t.id===winner.id).escaped} exploradores.`:'O professor encerrou a partida sem nenhum explorador salvo.'}</p><p>Duração: ${formatClock(r.duration)}${r.tie?` • ${r.tieRule}`:''}</p></div><div class="lobby-layout" style="margin-top:24px"><section class="online-card"><h2>Resultados por equipe</h2><div class="live-score">${scoreHtml(s)}</div><h2 style="margin-top:24px">Ordem de chegada</h2><ol>${r.arrivals.map(p=>`<li>${escape(p.name)} • ${teams.find(t=>t.id===p.team).name} • ${formatClock(p.at/1000)}</li>`).join('')||'<li>Nenhum explorador chegou à saída.</li>'}</ol></section><section class="online-card"><h2>Participantes</h2><div class="result-table-wrap"><table class="result-table"><thead><tr><th>Aluno</th><th>Situação</th><th>Acertos</th></tr></thead><tbody>${r.players.map(p=>`<tr><td>${escape(p.name)}</td><td>${p.removed?'Removido':labels[p.state]}</td><td>${p.correctAnswers}</td></tr>`).join('')}</tbody></table></div></section></div><div class="panel-actions"><button class="maze-primary-button" data-leave>VOLTAR AO INÍCIO</button></div></section>`;
}
function notice(n){
 const sounds={infection:'caught',escape:'victory',power:'power',timeout:'wrong',meteor:'wrong',trap:'caught'};if(sounds[n.type])audio.playSound(sounds[n.type]);
 if(n.type==='random-event'){audio.playSound(n.event.kind==='help'?'event-help':'event-danger');toast(n.event.name,n.event.description);}
 else if(n.type==='power')toast(n.name,n.description);
 else if(n.type==='infection')toast('VOCÊ FOI INFECTADO!','Seu objetivo agora é capturar exploradores.');
 else if(n.type==='escape')toast('VOCÊ ENCONTROU A SAÍDA!','Acompanhe a partida enquanto sua equipe continua.');
 else if(n.type==='timeout')toast('Tempo do desafio esgotado','Um erro foi registrado e a proteção terminou. Tente responder.');
 else if(n.type==='trap')toast('SAÍDA FALSA!','Você caiu em uma armadilha digital.');
}
function toast(title,message){const box=app.querySelector('.maze-power-toast');if(!box)return;clearTimeout(toastTimer);box.hidden=false;box.innerHTML=`<strong>${escape(title)}</strong><span>${escape(message)}</span>`;toastTimer=setTimeout(()=>box.hidden=true,4000);}
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-close'))return closeDialog();
 if(button.dataset.role)return showEntry(button.dataset.role);
 const action=button.dataset.mazeAction;if(action==='start')return showRoles();
 if(action==='toggle-sound'){audio.soundEnabled=!audio.soundEnabled;localStorage.setItem('labirinto.sound',audio.soundEnabled?'on':'off');button.textContent=audio.soundEnabled?'🔊 Som ligado':'🔇 Som desligado';audio.ensureAudio();return;}
 if(action==='fullscreen'){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else app.querySelector('.maze-game-shell')?.requestFullscreen?.().catch(()=>{});return;}
 if(button.id==='credits')return showMessage('Créditos das imagens','Personagem, laboratório, vírus, baús e atlas originais: CentralJogos, produzidos com OpenAI ImageGen. Fontes Fredoka e Atkinson Hyperlegible: SIL OFL. Bandeiras, novos poderes e vírus controláveis: desenhos pixel art originais do LabirintoOnline. Atribuições completas no repositório.');
 if(button.hasAttribute('data-copy')){try{await navigator.clipboard.writeText(snapshot.code);button.textContent='Copiado!';}catch{showMessage('Código da sala',snapshot.code);}return;}
 if(button.hasAttribute('data-leave')){connection.leave();snapshot=null;maze=null;closeDialog();showHome();return;}
 let admin=button.dataset.admin;
 if(admin==='finish'||button.dataset.remove){const title=admin==='finish'?'Encerrar a partida?':'Remover este aluno?';dialog(`<h2 id="dialog-title">${title}</h2><p>${admin==='finish'?'O resultado será calculado com as saídas registradas até agora.':'A participação deste aluno será encerrada.'}</p><div class="panel-actions"><button class="maze-primary-button" data-confirm="${admin==='finish'?'finish':'remove'}" data-player="${button.dataset.remove||''}">CONFIRMAR</button><button class="secondary" data-close>CANCELAR</button></div>`);return;}
 if(button.dataset.confirm){admin=button.dataset.confirm;closeDialog();}
 if(admin||button.dataset.release||button.dataset.power){button.disabled=true;try{
  if(button.dataset.power)await connection.request('player:power',{powerId:button.dataset.power,choiceId:snapshot.me.powerChoice.id});
  else if(button.dataset.release)await connection.request('teacher:release',{playerId:button.dataset.release});
  else await connection.request(`teacher:${admin}`,{playerId:button.dataset.player});
 }catch(error){const el=document.querySelector('#panel-error');if(el)el.textContent=error.message;else toast('Não foi possível',error.message);}finally{button.disabled=false;}}
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('[data-entry],[data-config]'))return;event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{
  const values=new FormData(form);
  if(form.dataset.entry){const role=form.dataset.entry;button.textContent='CONECTANDO…';await connection.connect();const result=await connection.request(role==='teacher'?'room:create':'room:join',role==='teacher'?{config:{...DEFAULT_CONFIG,name:values.get('name')}}:{name:values.get('name'),code:values.get('code')});connection.save(result);closeDialog();}
  else{const config={...snapshot.config};for(const key of ['maxPlayers','teamCount','width','height'])config[key]=Number(values.get(key));config.mapSize=values.get('mapSize');config.timeLimit=Number(values.get('timeMinutes'))*60;for(const key of ['powers','controlledViruses','allowJoin'])config[key]=values.has(key);await connection.request('teacher:config',{config});}
 }catch(error){(form.querySelector('.form-error')||document.querySelector('#panel-error')).textContent=error.message;}finally{button.disabled=false;if(form.dataset.entry)button.textContent=form.dataset.entry==='teacher'?'CRIAR SALA →':'ENTRAR NA SALA →';}
});
function input(){let x=0,y=0;if(keys.has('ArrowLeft')||keys.has('a'))x--;if(keys.has('ArrowRight')||keys.has('d'))x++;if(keys.has('ArrowUp')||keys.has('w'))y--;if(keys.has('ArrowDown')||keys.has('s'))y++;if(virtual)[x,y]=dir[virtual];return {x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};}
const moveKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d']);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)return closeDialog();const key=e.key.length===1?e.key.toLowerCase():e.key;if(viewKey==='game'&&moveKeys.has(key)&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!snapshot.me.challenge&&!snapshot.me.powerChoice){e.preventDefault();keys.add(key);audio.ensureAudio();}});
document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
document.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-direction]');if(button){virtual=button.dataset.direction;button.setPointerCapture(e.pointerId);audio.ensureAudio();}});
for(const name of ['pointerup','pointercancel'])document.addEventListener(name,()=>virtual=null);
window.addEventListener('blur',()=>{keys.clear();virtual=null;connection.input(0,0);});document.addEventListener('visibilitychange',()=>{keys.clear();virtual=null;connection.input(0,0);});
window.addEventListener('resize',()=>renderer?.resize());
setInterval(()=>{if(viewKey==='game'){const i=document.hidden?{x:0,y:0}:input();connection.input(i.x,i.y);}},100);
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-lastFrame)/1000||0);lastFrame=now;if(document.hidden||!renderer||!snapshot?.me||!maze)return;
 const me=snapshot.me;let pos={...me.position},movement=input();
 if(me.state==='EXPLORING'&&!me.interaction||me.state==='INFECTED'&&snapshot.config.controlledViruses){
  if(me.effects.invertUntil>snapshot.clock)movement={x:-movement.x,y:-movement.y};
  const speed=(me.state==='INFECTED'?me.virusSpeed:PLAYER_SPEED*(me.effects.speedUntil>snapshot.clock?2:1)*(me.effects.slowUntil>snapshot.clock?.5:1))*(me.effects.freezeUntil>snapshot.clock||me.effects.stunUntil>snapshot.clock||!connection.connected||snapshot.recovering?0:1);
  let predictionMaze=maze;if(snapshot.walls.length){const grid=maze.grid.map(r=>[...r]);for(const w of snapshot.walls)grid[w.y][w.x]=1;predictionMaze={...maze,grid};}
  predicted=movePlayer({maze:predictionMaze,position:predicted||pos,input:movement,deltaSeconds:dt,speed});pos=predicted;
  if(pos.moving&&now-lastStep>180){audio.playSound('step');lastStep=now;}
 }
 const fraction=Math.min(1,(now-lastReceived)/100),actors=[...currentActors.values()].map(p=>{if(p.id===me.id)return {...p,position:pos};const old=previousActors.get(p.id);if(!old||old.teleportVersion!==p.teleportVersion)return p;return {...p,position:{...p.position,x:old.position.x+(p.position.x-old.position.x)*fraction,y:old.position.y+(p.position.y-old.position.y)*fraction}};});
 let cameraPos=pos;if(me.state==='ESCAPED'){const target=actors.find(p=>p.id===spectatorId&&p.state!=='ESCAPED')||actors.find(p=>p.state!=='ESCAPED');if(target)cameraPos=target.position;}
 const seerPath=me.effects.seerUntil>snapshot.clock?findShortestPath(maze,positionToCell(pos)):[];
 renderer.render(maze,{...me,position:cameraPos,seerPath},actors,now,snapshot);
}
requestAnimationFrame(frame);
app.addEventListener('click',e=>{if(snapshot?.me?.state==='ESCAPED'&&e.target.tagName==='CANVAS'){const active=snapshot.players.filter(p=>p.state!=='ESCAPED'),index=active.findIndex(p=>p.id===spectatorId);spectatorId=active[(index+1)%active.length]?.id;}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
