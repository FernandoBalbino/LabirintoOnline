// Telas e fluxo do jogo: início, professor, sala de espera, partida e resultado.
import { Net } from "./net.mjs";
import { GameAudio } from "./audio.mjs";
import { Game } from "./game.mjs";
import { Minimap } from "./renderer.mjs";
import { hero } from "./views.mjs";
import { SERVER_HTTP } from "./config.mjs";
import { TEAMS, STATE_LABELS, DEFAULT_CONFIG } from "../shared/catalog.mjs";
import { gridFromString } from "../shared/physics.mjs";
import { formatClock } from "../shared/constants.mjs";

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const statusBox = document.querySelector("#connection-status");
// ?perfil=x separa a sessão (útil para testar vários alunos no mesmo computador).
const PROFILE = new URLSearchParams(location.search).get("perfil");
const SESSION_KEY = `labirinto.session.v2${PROFILE ? `:${PROFILE.slice(0, 20)}` : ""}`;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const audio = new GameAudio();
const roster = new Map();
let session = loadSession();
let room = null;
let mapMsg = null;
let meMsg = null;
let game = null;
let view = "";
let minimap = null;
let minimapActors = [];
let teacherFeed = [];
let resuming = false;

const net = new Net({ onMessage: receive, onStatus: connectionStatus });

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return saved && saved.server === SERVER_HTTP ? saved : null;
  } catch { return null; }
}
function saveSession(data) { session = { ...data, server: SERVER_HTTP }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function clearSession() { session = null; localStorage.removeItem(SESSION_KEY); }

function setStatus(text, kind = "ok") {
  statusBox.hidden = !text;
  statusBox.textContent = text || "";
  statusBox.className = kind === "ok" ? "" : "lost";
}

function connectionStatus(state) {
  if (state === "online") {
    setStatus("");
    if (session && !resuming) resume();
  } else if (state === "offline") setStatus(session ? "Conexão perdida. Voltando para a partida…" : "Sem conexão com o servidor. Tentando de novo…", "lost");
  else if (state === "replaced") { setStatus("Esta sala foi aberta em outra aba ou computador.", "lost"); }
  else if (state === "removed") { clearSession(); leaveToHome(); message("Participação encerrada", "O professor removeu você desta sala."); }
}

async function ensureConnected() {
  if (net.open) return;
  setStatus("Conectando ao servidor… (se ele estiver dormindo, pode levar até 1 minuto)", "lost");
  net.wake();
  net.connect();
  await net.whenOpen(95_000);
}

async function resume() {
  resuming = true;
  try {
    const result = await net.request("resume", { code: session.code, token: session.token });
    session.role = result.role;
    setStatus("");
  } catch (error) {
    clearSession();
    leaveToHome();
    message("Não foi possível voltar para a sala", error.message);
  } finally { resuming = false; }
}

// ---------------- mensagens do servidor ----------------
function receive(data) {
  if (Array.isArray(data)) {
    if (data[0] === 1) game?.onAnchors(data);
    else if (data[0] === 2) game?.onGone(data);
    else if (data[0] === 3) {
      minimapActors = [];
      for (let i = 2; i + 4 <= data.length; i += 4) minimapActors.push({ id: data[i], x: data[i + 1], y: data[i + 2], npc: Boolean(data[i + 3] & 32), infected: Boolean(data[i + 3] & 1) });
    }
    return;
  }
  switch (data.t) {
    case "room": onRoom(data); break;
    case "map": mapMsg = data; game?.setMap(data); if (minimap) minimap.setMap(mapFor(data)); break;
    case "me": meMsg = data; game?.setMe(data); break;
    case "cor": game?.onCorrection(data); break;
    case "evt":
      game?.onEvent(data);
      if (!game && (data.kind === "infected" || data.kind === "escaped")) { teacherFeed.unshift(`${data.kind === "infected" ? "🦠" : "🏁"} ${data.name} ${data.kind === "infected" ? "foi infectado" : "escapou!"}`); teacherFeed = teacherFeed.slice(0, 8); renderFeed(); }
      break;
    case "removed": clearSession(); break;
    default: break;
  }
}

function mapFor(msg) { return { grid: gridFromString(msg.w, msg.h, msg.grid), exit: msg.exit, starts: msg.starts, decorations: msg.decorations }; }

function onRoom(data) {
  const previousStatus = room?.status;
  if (data.roster) data.players = data.roster.map(([id, name, team, state, connected, removed]) => ({ id, name, team, state, connected: Boolean(connected), removed: Boolean(removed), correct: 0, wrong: 0 }));
  room = data;
  roster.clear();
  for (const p of data.players) roster.set(p.id, p);
  const role = session?.role;
  if (!role) return;
  if (data.status === "FINISHED" || data.status === "CANCELLED") {
    if (view !== "result") { if (game) { game.destroy(); game = null; } renderResult(); if (previousStatus === "PLAYING") audio.play("victory"); }
    return;
  }
  if (role === "teacher") { renderTeacher(); return; }
  if (data.status === "PLAYING") {
    if (!game) {
      closeDialog();
      view = "game";
      game = new Game({ root: app, net, audio, roster, onLeave: confirmLeave });
      if (mapMsg) game.setMap(mapMsg);
      if (meMsg) game.setMe(meMsg);
    }
    game.setRoom(data);
    return;
  }
  renderWaiting();
}

// ---------------- telas ----------------
function showHome() {
  view = "home";
  document.body.classList.remove("maze-game-active");
  app.innerHTML = hero;
  app.querySelector("[data-action='sound']").textContent = audio.enabled ? "🔊 Som ligado" : "🔇 Som desligado";
}

function leaveToHome() {
  if (game) { game.destroy(); game = null; }
  room = null; mapMsg = null; meMsg = null; minimap = null; roster.clear();
  showHome();
}

function dialog(content) {
  modal.hidden = false;
  modal.innerHTML = `<section class="online-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button type="button" class="dialog-close" data-close aria-label="Fechar">×</button>${content}</section>`;
  requestAnimationFrame(() => modal.querySelector("input,button:not(.dialog-close)")?.focus());
}
function closeDialog() { modal.hidden = true; modal.innerHTML = ""; }
function message(title, text) { dialog(`<h2 id="dialog-title">${esc(title)}</h2><p>${esc(text)}</p><button type="button" class="maze-primary-button" data-close>ENTENDI</button>`); }

function showRoles() {
  audio.unlock();
  net.wake(); // começa a acordar o servidor enquanto a pessoa escolhe
  dialog(`<span class="maze-kicker">Arena online</span><h2 id="dialog-title">Como você vai participar?</h2>
    <div class="role-options">
      <button type="button" data-role="student"><strong>SOU ALUNO</strong><small>Entre com seu nome e o código que o professor mostrar.</small></button>
      <button type="button" data-role="teacher"><strong>SOU PROFESSOR</strong><small>Crie a sala, organize as equipes e acompanhe o mapa ao vivo.</small></button>
    </div>`);
}

function showEntry(role) {
  const teacher = role === "teacher";
  dialog(`<span class="maze-kicker">${teacher ? "Professor" : "Aluno"}</span><h2 id="dialog-title">${teacher ? "Crie sua sala" : "Entre na arena"}</h2>
    <form class="online-form" data-entry="${role}">
      ${teacher ? '<label>Nome da turma<input name="name" maxlength="60" value="Turma de informática" required></label>' : '<label>Seu nome e sobrenome<input name="name" maxlength="30" minlength="2" autocomplete="name" required></label><label>Código da sala<input name="code" maxlength="5" minlength="5" autocomplete="off" autocapitalize="characters" class="code-input" required></label>'}
      <p class="lobby-note">${teacher ? "Na primeira vez do dia o servidor gratuito pode levar até 1 minuto para acordar." : "Sem conta e sem e-mail. Use o mesmo nome se precisar entrar de novo."}</p>
      <p class="form-error" role="alert"></p>
      <button class="maze-primary-button" type="submit">${teacher ? "CRIAR SALA" : "ENTRAR NA SALA"} →</button>
    </form>`);
}

function teamsHtml(teacher) {
  const playing = room.status === "PLAYING";
  return TEAMS.slice(0, room.config.teamCount).map((team) => {
    const members = room.players.filter((p) => p.team === team.id && !p.removed);
    return `<section class="team-card" style="--team-color:${team.color}"><h3>${team.symbol} Equipe ${team.name} <small>${members.length}</small></h3>${members.map((p) => `
      <div class="participant ${p.connected ? "" : "is-offline"}">
        <div><strong>${esc(p.name)}</strong><small>${playing ? `${STATE_LABELS[p.state]}${p.challenge ? ` • ${esc(p.challenge)}` : ""} • ✔ ${p.correct} ✖ ${p.wrong}` : "Pronto"}${p.connected ? "" : " • desconectado"}</small></div>
        ${teacher ? `<div class="participant-actions">${playing && p.state === "ANSWERING" ? `<button type="button" data-release="${p.id}">Liberar 30s</button>` : ""}<button type="button" data-remove="${p.id}" aria-label="Remover ${esc(p.name)}">Remover</button></div>` : ""}
      </div>`).join("") || '<p class="lobby-note">Aguardando alunos…</p>'}</section>`;
  }).join("");
}

function scoreHtml() {
  return room.scoreboard.map((t) => `<div class="score-row" style="--team-color:${t.color}"><strong>${t.symbol} ${esc(t.name)}</strong><b>${t.escaped} salvos</b><small>${t.exploring} explorando • ${t.infected} infectados</small></div>`).join("");
}

function configForm(c) {
  return `<form class="online-form" data-config>
    <div class="field-row"><label>Vagas<input name="maxPlayers" type="number" min="2" max="24" value="${c.maxPlayers}"></label><label>Equipes<select name="teamCount">${[2, 3, 4].map((n) => `<option ${c.teamCount === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
    <label>Mapa<select name="mapSize"><option value="auto" ${c.mapSize === "auto" ? "selected" : ""}>Automático (pelo número de alunos)</option><option value="custom" ${c.mapSize === "custom" ? "selected" : ""}>Personalizado</option></select></label>
    <div class="field-row"><label>Largura<input name="width" type="number" min="31" max="131" step="2" value="${c.width}"></label><label>Altura<input name="height" type="number" min="31" max="101" step="2" value="${c.height}"></label></div>
    <label>Limite da partida (minutos)<input name="timeMinutes" type="number" min="0" max="120" value="${c.timeLimit / 60}"><small>0 = sem limite</small></label>
    ${[["powers", "Baús com poderes e sabotagens"], ["oslab", "Tarefas práticas no Windows do OSLab"], ["controlledViruses", "Infectados controlam o próprio vírus"], ["allowJoin", "Aceitar novos alunos"]].map(([key, text]) => `<label class="check-label"><input name="${key}" type="checkbox" ${c[key] ? "checked" : ""}>${text}</label>`).join("")}
    <p class="form-error" data-config-error role="alert"></p>
    <button class="maze-primary-button" type="submit">SALVAR CONFIGURAÇÃO</button>
  </form>`;
}

function renderTeacher() {
  const playing = room.status === "PLAYING";
  const key = `teacher:${room.status}`;
  if (view !== key) {
    view = key;
    document.body.classList.toggle("teacher-live", playing);
    app.innerHTML = `<section class="online-panel ${playing ? "is-live" : ""}">
      <div class="online-panel-head">
        <div><span class="maze-kicker">Painel do professor</span><h1>${esc(room.config.name)}</h1><p class="status-label" data-head></p></div>
        <div class="room-code"><small>CÓDIGO DA SALA</small><strong>${room.code}</strong><button type="button" data-copy>Copiar código</button></div>
      </div>
      ${playing ? `
        <div class="live-layout">
          <div class="minimap-card"><canvas class="minimap" aria-label="Mapa ao vivo da arena"></canvas><button type="button" class="secondary" data-map-full>⛶ Mapa em tela cheia (para a TV)</button></div>
          <aside class="online-card"><h2>Placar ao vivo</h2><div class="live-score" data-score></div><ul class="teacher-feed" data-feed></ul>
            <div class="panel-actions"><button type="button" class="maze-primary-button danger" data-admin="finish">ENCERRAR PARTIDA</button></div></aside>
        </div>
        <div class="teams-grid teacher-player-list" data-teams></div>` : `
        <div class="lobby-layout">
          <div>
            <div class="join-hint"><strong>Alunos:</strong> abram <b>${esc(location.host + location.pathname.replace(/index\.html$/, ""))}</b>, cliquem em <b>Sou aluno</b> e digitem o código <b>${room.code}</b>.</div>
            <div class="teams-grid teacher-player-list" data-teams></div>
            <div class="panel-actions"><button type="button" class="maze-primary-button" data-admin="start">INICIAR PARTIDA →</button><button type="button" class="secondary" data-admin="redistribute">Sortear equipes</button><button type="button" class="secondary" data-leave>Sair</button></div>
            <p class="form-error" id="panel-error" role="alert"></p>
          </div>
          <aside class="online-card"><h2>Configurar partida</h2>${configForm(room.config)}</aside>
        </div>`}
    </section>`;
    if (playing) {
      minimap = new Minimap(app.querySelector(".minimap"));
      if (mapMsg) minimap.setMap(mapFor(mapMsg));
      requestAnimationFrame(drawMinimap);
    }
  }
  const connected = room.players.filter((p) => p.connected && !p.removed).length;
  app.querySelector("[data-head]").textContent = `${connected}/${room.config.maxPlayers} alunos conectados${playing ? ` • ${formatClock((room.serverTime - room.startedAt) / 1000)} de partida • ${room.viruses} vírus` : ""}`;
  app.querySelector("[data-teams]").innerHTML = teamsHtml(true);
  const score = app.querySelector("[data-score]");
  if (score) score.innerHTML = scoreHtml();
  renderFeed();
}

function renderFeed() {
  const list = app.querySelector(".teacher-feed");
  if (list) list.innerHTML = teacherFeed.map((line) => `<li>${esc(line)}</li>`).join("");
}

function drawMinimap(t) {
  if (!minimap || !app.contains(minimap.canvas)) return;
  minimap.draw(minimapActors, roster, t);
  requestAnimationFrame(drawMinimap);
}

function renderWaiting() {
  const me = roster.get(session.playerId);
  const team = TEAMS.find((t) => t.id === me?.team);
  view = "waiting";
  document.body.classList.remove("maze-game-active");
  app.innerHTML = `<section class="online-panel waiting-panel">
    <div class="online-panel-head"><div><span class="maze-kicker">Sala da turma</span><h1>${esc(room.config.name)}</h1><p class="status-label">${room.players.filter((p) => p.connected).length} alunos na sala • código ${room.code}</p></div>
      ${team ? `<div class="team-badge" style="--team-color:${team.color}"><small>SUA EQUIPE</small><strong>${team.symbol} ${team.name}</strong><span>${esc(me.name)}</span></div>` : ""}</div>
    <div class="lobby-layout"><div class="teams-grid">${teamsHtml(false)}</div>
      <aside class="online-card"><h2>Como jogar</h2><ul class="howto">
        <li>Ande com as <b>setas</b> ou <b>WASD</b>. Seus colegas aparecem andando ao vivo.</li>
        <li>Quando seu tempo zerar, resolva um <b>desafio</b>: hardware ou uma tarefa no <b>Windows do OSLab</b>.</li>
        <li>Acertos seguidos dão mais tempo: 20s, 30s, 40s…</li>
        <li>Abra <b>baús</b> para ganhar poderes ou sabotar outras equipes.</li>
        <li>Se um vírus pegar você, você vira vírus e caça as outras equipes.</li>
      </ul><p class="lobby-note">Aguarde o professor iniciar a partida.</p><button type="button" class="secondary" data-leave>Sair da sala</button></aside></div>
  </section>`;
}

function renderResult() {
  view = "result";
  document.body.classList.remove("maze-game-active", "teacher-live");
  const r = room.result;
  const winner = TEAMS.find((t) => t.id === r?.winner);
  app.innerHTML = `<section class="online-panel">
    <div class="result-winner" ${winner ? `style="--team-color:${winner.color}"` : ""}><span class="maze-kicker">Resultado da arena</span>
      <h1>${winner ? `${winner.symbol} EQUIPE ${winner.name.toUpperCase()} VENCEU!` : r?.winner === "virus" ? "VITÓRIA DOS VÍRUS 🦠" : "PARTIDA ENCERRADA"}</h1>
      <p>${winner ? `${r.scoreboard.find((t) => t.id === winner.id).escaped} exploradores salvos.${r.tie ? " Empate no número de salvos: venceu quem chegou primeiro." : ""}` : r?.winner === "virus" ? "Nenhum explorador encontrou a saída." : "O professor encerrou antes de alguém escapar."}</p>
      <p>Duração: ${formatClock(r?.duration || 0)}</p></div>
    <div class="lobby-layout result-layout">
      <section class="online-card"><h2>Equipes</h2><div class="live-score">${scoreHtml()}</div>
        <h2>Ordem de chegada</h2><ol class="arrivals">${(r?.arrivals || []).map((p) => `<li>${esc(p.name)} • ${esc(TEAMS.find((t) => t.id === p.team)?.name)} • ${formatClock(p.at)}</li>`).join("") || "<li>Ninguém chegou à saída.</li>"}</ol></section>
      <section class="online-card"><h2>Participantes</h2><div class="result-table-wrap"><table class="result-table"><thead><tr><th>Aluno</th><th>Situação</th><th>Acertos</th><th>Erros</th><th>Maior sequência</th></tr></thead><tbody>
        ${(r?.players || []).map((p) => `<tr><td>${esc(p.name)}</td><td>${p.removed ? "Removido" : STATE_LABELS[p.state]}</td><td>${p.correct}</td><td>${p.wrong}</td><td>${p.streak}</td></tr>`).join("")}
      </tbody></table></div></section>
    </div>
    <div class="panel-actions"><button type="button" class="maze-primary-button" data-leave>VOLTAR AO INÍCIO</button></div>
  </section>`;
}

function confirmLeave() {
  dialog(`<h2 id="dialog-title">Sair da partida?</h2><p>Seu personagem fica parado e protegido por até 2 minutos. Para voltar, entre de novo neste navegador.</p><div class="panel-actions"><button type="button" class="maze-primary-button" data-confirm="leave">SAIR</button><button type="button" class="secondary" data-close>CONTINUAR JOGANDO</button></div>`);
}

async function leave() {
  try { if (net.open) await net.request("leave"); } catch { /* sem conexão */ }
  clearSession();
  closeDialog();
  leaveToHome();
}

// ---------------- eventos da página ----------------
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-close")) { closeDialog(); return; }
  if (button.dataset.action === "roles") { showRoles(); return; }
  if (button.dataset.action === "sound") { button.textContent = audio.toggle() ? "🔊 Som ligado" : "🔇 Som desligado"; return; }
  if (button.dataset.role) { showEntry(button.dataset.role); return; }
  if (button.id === "credits") { message("Créditos", "Personagem, laboratório, vírus, baús e atlas: Central de Jogos (OpenAI ImageGen). Windows simulado: OSLab (FernandoBalbino/OSLab, inspirado no win11React — licença no repositório). Fontes Fredoka e Atkinson Hyperlegible: SIL OFL. Fotos de peças: créditos em ATTRIBUTIONS.md."); return; }
  if (button.hasAttribute("data-copy")) { try { await navigator.clipboard.writeText(room.code); button.textContent = "Copiado!"; } catch { message("Código da sala", room.code); } return; }
  if (button.hasAttribute("data-leave")) { await leave(); return; }
  if (button.dataset.confirm === "leave") { await leave(); return; }
  if (button.hasAttribute("data-map-full")) { app.querySelector(".minimap-card")?.requestFullscreen?.().catch(() => {}); return; }
  let admin = button.dataset.admin;
  if (admin === "finish" || button.dataset.remove) {
    dialog(`<h2 id="dialog-title">${admin === "finish" ? "Encerrar a partida?" : "Remover este aluno?"}</h2><p>${admin === "finish" ? "O resultado será calculado com quem já escapou." : "A participação deste aluno será encerrada."}</p><div class="panel-actions"><button type="button" class="maze-primary-button" data-confirm="${admin === "finish" ? "finish" : "remove"}" data-player="${button.dataset.remove || ""}">CONFIRMAR</button><button type="button" class="secondary" data-close>CANCELAR</button></div>`);
    return;
  }
  if (button.dataset.confirm) { admin = button.dataset.confirm; closeDialog(); }
  if (!admin && !button.dataset.release) return;
  button.disabled = true;
  try {
    if (button.dataset.release) await net.request("release", { playerId: button.dataset.release });
    else await net.request(admin, { playerId: button.dataset.player });
  } catch (error) {
    const box = document.querySelector("#panel-error");
    if (box) box.textContent = error.message; else message("Não foi possível", error.message);
  } finally { button.disabled = false; }
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form.matches("[data-entry],[data-config]")) return;
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  const error = form.querySelector(".form-error");
  error.textContent = "";
  button.disabled = true;
  const values = new FormData(form);
  try {
    if (form.dataset.entry) {
      const label = button.textContent;
      button.textContent = "CONECTANDO…";
      try {
        await ensureConnected();
        const teacher = form.dataset.entry === "teacher";
        const result = teacher
          ? await net.request("create", { name: values.get("name"), config: { ...DEFAULT_CONFIG, name: values.get("name") } })
          : await net.request("join", { name: values.get("name"), code: String(values.get("code")).trim().toUpperCase() });
        saveSession(result);
        closeDialog();
        setStatus("");
      } finally { button.textContent = label; }
    } else {
      const config = { ...room.config };
      for (const key of ["maxPlayers", "teamCount", "width", "height"]) config[key] = Number(values.get(key));
      config.mapSize = values.get("mapSize");
      config.timeLimit = Number(values.get("timeMinutes")) * 60;
      for (const key of ["powers", "controlledViruses", "allowJoin", "oslab"]) config[key] = values.has(key);
      await net.request("cfg", { config });
      error.textContent = "Configuração salva ✓";
      error.classList.add("is-ok");
      setTimeout(() => { error.textContent = ""; error.classList.remove("is-ok"); }, 2500);
    }
  } catch (err) {
    error.textContent = err.message;
    setStatus(net.open ? "" : "Sem conexão com o servidor.", net.open ? "ok" : "lost");
  } finally { button.disabled = false; }
});

document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeDialog(); });
document.addEventListener("input", (event) => { if (event.target.classList.contains("code-input")) event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });

// ---------------- início ----------------
if (PROFILE) window.__lab = { net, get room() { return room; }, get game() { return game; }, get session() { return session; } };
showHome();
if (session) {
  setStatus("Voltando para a sua sala…", "lost");
  ensureConnected().catch((error) => setStatus(error.message, "lost"));
}
