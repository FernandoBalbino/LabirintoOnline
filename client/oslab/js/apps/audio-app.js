(function createAudioApps(global) {
  "use strict";

  const O = global.OSLab, safe = (v) => O.ui.escapeHtml(v), A = () => O.audio;
  const norm = (v) => String(v || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const SPK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.25v15.5c0 1.07-1.27 1.65-2.08.93l-4.49-4a.75.75 0 0 0-.5-.18H4.25A2.25 2.25 0 0 1 2 14.25v-4.5A2.25 2.25 0 0 1 4.25 7.5h3.68a.75.75 0 0 0 .5-.19l4.49-3.99c.81-.72 2.08-.15 2.08.93Zm3.99 1.65a.75.75 0 0 1 1.05.15A9.96 9.96 0 0 1 22 12c0 2.23-.73 4.28-1.96 5.95a.75.75 0 1 1-1.2-.9A8.46 8.46 0 0 0 20.5 12c0-1.9-.62-3.64-1.66-5.05a.75.75 0 0 1 .15-1.05ZM17.14 8.37a.75.75 0 0 1 1.02.3A6.97 6.97 0 0 1 19 12c0 1.2-.3 2.34-.84 3.33a.75.75 0 1 1-1.32-.71c.42-.78.66-1.67.66-2.62s-.24-1.84-.66-2.62a.75.75 0 0 1 .3-1.01Z"/></svg>';
  const MUTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.25v15.5c0 1.07-1.27 1.65-2.08.93l-4.49-4a.75.75 0 0 0-.5-.18H4.25A2.25 2.25 0 0 1 2 14.25v-4.5A2.25 2.25 0 0 1 4.25 7.5h3.68a.75.75 0 0 0 .5-.19l4.49-3.99c.81-.72 2.08-.15 2.08.93ZM17.22 9.22a.75.75 0 0 1 1.06 0L20 10.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L21.06 12l1.72 1.72a.75.75 0 1 1-1.06 1.06L20 13.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L18.94 12l-1.72-1.72a.75.75 0 0 1 0-1.06Z"/></svg>';
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Zm-6.5 9.25a.75.75 0 0 1 .75.75 5.75 5.75 0 0 0 11.5 0 .75.75 0 0 1 1.5 0 7.25 7.25 0 0 1-6.5 7.21v2.04a.75.75 0 0 1-1.5 0v-2.04A7.25 7.25 0 0 1 4.75 12a.75.75 0 0 1 .75-.75Z"/></svg>';
  const CAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.75 4.5A3.25 3.25 0 0 1 17 7.75v.5l3.44-2.06A1 1 0 0 1 22 7.05v9.9a1 1 0 0 1-1.56.86L17 15.75v.5a3.25 3.25 0 0 1-3.25 3.25h-8.5A3.25 3.25 0 0 1 2 16.25v-8.5A3.25 3.25 0 0 1 5.25 4.5h8.5Z"/></svg>';

  // ================= ícone de som da barra de tarefas =================
  function trayText(s) {
    if (s.tray === "nodevice") return "Nenhum dispositivo de saída de áudio está instalado";
    return `${s.current.name} (${s.current.detail}): ${s.tray === "muted" ? "mudo" : `${s.volume}%`}`;
  }
  function updateTray() {
    const s = A().get(), icon = document.querySelector("#taskbar-audio-icon");
    if (!icon) return;
    icon.src = s.tray === "nodevice" ? "assets/audio/tray-nodevice.png" : s.tray === "muted" ? "assets/audio/tray-muted.png" : "assets/icons/ui/audio.png";
    icon.style.opacity = "1";
    icon.title = icon.alt = trayText(s);
    let line = document.querySelector("#quick-audio-status");
    const slider = document.querySelector("#volume-slider");
    if (!line && slider) {
      line = document.createElement("button"); line.type = "button"; line.id = "quick-audio-status"; line.className = "quick-audio-status";
      slider.closest(".quick-slider")?.after(line);
      line.addEventListener("click", () => O.shell.openSettings("sound"));
    }
    if (line) line.innerHTML = s.current ? `<strong>${safe(s.current.name)}</strong><small>${safe(s.current.detail)}${s.tray === "muted" ? " · mudo" : ""}</small>` : "<strong>Nenhum dispositivo de saída de áudio</strong><small>Abrir as configurações de som</small>";
    if (slider) slider.disabled = !s.current;
  }
  function wireTray() {
    const read = () => A().emit("audio:tray-read", { tray: A().get().tray });
    document.querySelector("#taskbar-audio-icon")?.addEventListener("mouseenter", read);
    document.querySelector("#quick-settings-button")?.addEventListener("click", () => global.setTimeout(read, 0));
    updateTray();
  }
  document.addEventListener("DOMContentLoaded", wireTray);

  // ================= dispositivos de som no Gerenciador de Dispositivos =================
  let restarting = false;
  function restartComputer() {
    if (restarting) return;
    restarting = true;
    O.shell?.closeApp?.("audioinstaller");
    const screen = document.createElement("div");
    screen.className = "aud-restart"; screen.setAttribute("role", "status");
    screen.innerHTML = '<div class="aud-spinner" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p>Reiniciando</p>';
    document.body.appendChild(screen);
    global.setTimeout(() => { screen.remove(); restarting = false; A().restart(); O.ui.notify("Computador reiniciado", "O driver de áudio foi carregado.", "success", 3600); }, 2600);
  }
  O.devmgr?.register(() => {
    const s = A().get(), CODEC = A().CODEC;
    const win = ["Microsoft", "21/06/2006", "10.0.26100.1", "Microsoft Windows"];
    const drv = s.driver ? ["Sonora", s.driver.date, s.driver.version, "Microsoft Windows Hardware Compatibility Publisher"] : win;
    const toggle = (device) => (enabled) => A().setEnabled(device, enabled, "devmgr");
    const cats = [{ key: "camera", title: "Câmeras", devices: [{ id: "cam", name: "Câmera HD Integrada", icon: s.camDisabled ? "camera-disabled" : "camera", code: s.camDisabled ? 22 : 0, info: { maker: "Vertex", local: "0000.0014.0000.006.000.000.000.000.000", drv: win }, onToggle: toggle("cam") }] }];
    if (!s.driver) {
      cats.push({ key: "media", devices: [] }, { key: "audio", devices: [] });
      cats.push({ key: "other", title: "Outros dispositivos", append: true, devices: [{ id: "aud-unknown", name: "Dispositivo de Áudio de Alta Definição", icon: "unknown-warn", code: 28, info: { maker: "Desconhecido", local: "Interno, barramento High Definition Audio", drv: ["Desconhecido", "Não disponível", "Não disponível", "Não assinado digitalmente"] }, updateText: "O Windows procurou e não encontrou um driver para este dispositivo. Em notebook, baixe o driver de áudio no site da marca do notebook." }] });
      return cats;
    }
    const restart = s.restartPending;
    cats.push({ key: "media", title: "Controladores de som, vídeo e jogos", devices: [{ id: "aud-codec", name: CODEC, icon: restart ? "media-warn" : s.codecDisabled ? "media-disabled" : "media", code: restart ? 14 : s.codecDisabled ? 22 : 0, info: { maker: "Sonora", local: "Interno, barramento High Definition Audio", drv }, onToggle: restart ? null : toggle("codec"), onRestart: restartComputer, updateText: "Os melhores drivers para o dispositivo já estão instalados." }] });
    const ends = [];
    if (!restart && !s.codecDisabled) {
      ends.push({ id: "aud-spk", name: `Alto-falantes (${CODEC})`, icon: s.spkDisabled ? "audio-disabled" : "audio", code: s.spkDisabled ? 22 : 0, info: { maker: "Microsoft", local: "Alto-falantes", drv: win }, onToggle: toggle("spk") });
      ends.push({ id: "aud-mic", name: `Microfone (${CODEC})`, icon: s.micDisabled ? "audio-disabled" : "audio", code: s.micDisabled ? 22 : 0, info: { maker: "Microsoft", local: "Microfone", drv: win }, onToggle: toggle("mic") });
    }
    if (s.hdmi) ends.push({ id: "aud-hdmi", name: "TV da sala (Intel(R) Display Audio)", icon: "audio", info: { maker: "Microsoft", local: "HDMI", drv: win } });
    cats.push({ key: "audio", title: "Entradas e saídas de áudio", devices: ends });
    return cats;
  });

  // ================= Configurações › Sistema › Som =================
  const settingsRecords = new Set();
  const PAGES = { sound: "Som", "sound-devices": "Todos os dispositivos de som", "sound-mixer": "Mixer de volume" };
  const isPage = (id) => Boolean(PAGES[id]);
  const heading = (pageId) => pageId === "sound"
    ? `<header class="settings-page-heading with-back"><button type="button" data-settings-back="system" aria-label="Voltar para Sistema"><img src="assets/icons/ui/left.png" alt="" /></button><div><small>Sistema</small><h1>Som</h1></div></header>`
    : `<header class="settings-page-heading with-back"><button type="button" data-settings-back="sound" aria-label="Voltar para Som"><img src="assets/icons/ui/left.png" alt="" /></button><div><small>Sistema › Som</small><h1>${PAGES[pageId]}</h1></div></header>`;
  const volumeRow = (s, label = "Volume") => `<div class="snd-row"><span class="snd-label">${label}</span><button type="button" class="snd-iconbtn" data-snd-mute aria-label="${s.muted ? "Ativar o som" : "Desativar o som"}" ${s.current ? "" : "disabled"}>${s.muted ? MUTE : SPK}</button><input type="range" min="0" max="100" value="${s.volume}" data-snd-volume aria-label="Volume do sistema" ${s.current ? "" : "disabled"} /><b>${s.volume}</b></div>`;
  function mainPage(s) {
    const outs = s.outputs.filter((o) => o.enabled);
    return `<h2 class="snd-h">Saída</h2><section class="snd-card"><div class="snd-row snd-head"><span class="snd-ic">${SPK}</span><span><strong>Escolha onde reproduzir o som</strong><small>Os aplicativos podem ter suas próprias configurações</small></span></div>
      ${outs.length ? outs.map((o) => `<label class="snd-choice"><input type="radio" name="snd-out" value="${o.id}" data-snd-output ${s.current?.id === o.id ? "checked" : ""} /><span><strong>${safe(o.name)}</strong><small>${safe(o.detail)}</small></span></label>`).join("") : '<p class="snd-empty">Nenhum dispositivo de saída encontrado</p>'}
      ${volumeRow(s)}</section>
      <h2 class="snd-h">Entrada</h2><section class="snd-card"><div class="snd-row snd-head"><span class="snd-ic">${MIC}</span><span><strong>Escolha um dispositivo para falar ou gravar</strong><small>Os aplicativos podem ter suas próprias configurações</small></span></div>
      ${s.mic ? `<label class="snd-choice"><input type="radio" checked disabled /><span><strong>Microfone</strong><small>${safe(A().CODEC)}</small></span></label>` : '<p class="snd-empty">Nenhum dispositivo de entrada encontrado</p>'}</section>
      <h2 class="snd-h">Avançado</h2><section class="snd-card"><button type="button" class="snd-link" data-settings-page="sound-devices"><span><strong>Todos os dispositivos de som</strong><small>Ative/desative dispositivos, solucione problemas, outras opções</small></span><img src="assets/icons/ui/right.png" alt="" /></button><button type="button" class="snd-link" data-settings-page="sound-mixer"><span><strong>Mixer de volume</strong><small>Mixer de aplicativos, dispositivos de saída de aplicativos</small></span><img src="assets/icons/ui/right.png" alt="" /></button></section>`;
  }
  function devicesPage(s) {
    const row = (id, name, detail, enabled) => `<div class="snd-row snd-dev"><span class="snd-ic">${id === "mic" ? MIC : SPK}</span><span><strong>${safe(name)}</strong><small>${safe(detail)} · ${enabled ? "Permitido" : "Não permitido"}</small></span>${id === "hdmi" ? "" : `<button type="button" class="win-button" data-snd-allow="${id}" data-on="${enabled ? "0" : "1"}">${enabled ? "Não permitir" : "Permitir"}</button>`}</div>`;
    const outs = s.outputs.map((o) => row(o.id === "speakers" ? "spk" : "hdmi", o.name, o.detail, o.enabled)).join("");
    return `<p class="snd-tip">Permitir ou não permitir decide se o Windows e os aplicativos podem usar cada dispositivo de som.</p><h2 class="snd-h">Dispositivos de saída</h2><section class="snd-card">${outs || '<p class="snd-empty">Nenhum dispositivo de saída encontrado. Confira o Gerenciador de Dispositivos.</p>'}</section>
      <h2 class="snd-h">Dispositivos de entrada</h2><section class="snd-card">${s.micPresent ? row("mic", "Microfone", A().CODEC, !s.micDisabled) : '<p class="snd-empty">Nenhum dispositivo de entrada encontrado.</p>'}</section>`;
  }
  function mixerPage(s) {
    const outs = s.outputs.filter((o) => o.enabled);
    return `<h2 class="snd-h">Sistema</h2><section class="snd-card"><div class="snd-row"><span class="snd-label">Dispositivo de saída</span><select data-snd-output-select ${outs.length ? "" : "disabled"}>${outs.length ? outs.map((o) => `<option value="${o.id}" ${s.current?.id === o.id ? "selected" : ""}>${safe(o.name)} (${safe(o.detail)})</option>`).join("") : "<option>Nenhum dispositivo</option>"}</select></div>${volumeRow(s, "Volume mestre")}</section>
      <h2 class="snd-h">Aplicativos</h2><section class="snd-card"><div class="snd-row snd-app"><img src="assets/icons/ui/audio.png" alt="" /><span class="snd-label">Sons do sistema</span><button type="button" class="snd-iconbtn" disabled aria-label="Sons do sistema">${SPK}</button><input type="range" min="0" max="100" value="80" disabled aria-label="Volume dos sons do sistema" /><b>80</b></div>
      <div class="snd-row snd-app"><img src="assets/audio/aula-icon.svg" alt="" /><span class="snd-label">Aula On-line</span><button type="button" class="snd-iconbtn ${s.appMuted ? "is-muted" : ""}" data-snd-app-mute aria-label="${s.appMuted ? "Ativar o som da Aula On-line" : "Desativar o som da Aula On-line"}">${s.appMuted ? MUTE : SPK}</button><input type="range" min="0" max="100" value="${s.appVolume}" data-snd-app-volume aria-label="Volume da Aula On-line" /><b>${s.appVolume}</b></div></section>`;
  }
  function settingsMarkup(pageId) {
    const s = A().get();
    return `<section class="snd-page">${heading(pageId)}${pageId === "sound-devices" ? devicesPage(s) : pageId === "sound-mixer" ? mixerPage(s) : mainPage(s)}</section>`;
  }
  function wireSettings(record, rerender) {
    settingsRecords.add(record);
    record.sndRerender = rerender;
    if (record.sndLastPage !== record.settingsView) { record.sndLastPage = record.settingsView; A().emit("audio:settings-opened", { page: record.settingsView }); }
    if (record.sndWired) return; record.sndWired = true;
    const s = () => A().get();
    record.content.addEventListener("click", (event) => {
      if (!isPage(record.settingsView)) return;
      if (event.target.closest("[data-snd-mute]:not([disabled])")) A().setSystem(s().volume || 30, !s().muted);
      if (event.target.closest("[data-snd-app-mute]")) A().setAppMuted(!s().appMuted);
      const allow = event.target.closest("[data-snd-allow]");
      if (allow) A().setEnabled(allow.dataset.sndAllow === "hdmi" ? "spk" : allow.dataset.sndAllow, allow.dataset.on === "1", "settings");
    });
    record.content.addEventListener("change", (event) => {
      if (!isPage(record.settingsView)) return;
      if (event.target.matches("[data-snd-output]")) A().setOutput(event.target.value);
      if (event.target.matches("[data-snd-output-select]")) A().setOutput(event.target.value);
      if (event.target.matches("[data-snd-volume]")) A().setSystem(Number(event.target.value), false);
      if (event.target.matches("[data-snd-app-volume]")) A().setAppVolume(event.target.value);
    });
    record.content.addEventListener("input", (event) => { if (event.target.matches("[data-snd-volume], [data-snd-app-volume]")) event.target.nextElementSibling.textContent = event.target.value; });
  }
  const dragging = () => document.activeElement?.matches?.("input[type=range][data-snd-volume], input[type=range][data-snd-app-volume]");
  O.audioUI = { isPage, settingsMarkup, wireSettings };

  // ================= Aula On-line =================
  const aulaRecords = new Set();
  let audioCtx = null;
  function chime(s) {
    try {
      audioCtx = audioCtx || new (global.AudioContext || global.webkitAudioContext)();
      const t = audioCtx.currentTime, gain = audioCtx.createGain(), osc = audioCtx.createOscillator();
      osc.type = "sine"; osc.frequency.setValueAtTime(660, t); osc.frequency.setValueAtTime(880, t + 0.16);
      gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.06 * (s.volume / 100) * (s.appVolume / 100)), t + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.4);
    } catch (_) { /* sem Web Audio: o teste continua visual */ }
  }
  function aula(record) {
    aulaRecords.add(record);
    const s = A().get(), t = record.lastTest, m = record.lastMic;
    const hearing = s.audible;
    const testLine = !t ? "" : t.audible ? `<p class="aula-result is-ok">✓ Som saindo pelos ${safe(t.output)}.</p>` : t.reason === "wrong-output" ? `<p class="aula-result is-bad">O som foi enviado para: ${safe(t.output)}. Você não ouviu nada aqui.</p>` : '<p class="aula-result is-bad">✕ Nenhum som saiu. Verifique o som do computador.</p>';
    const micLine = !m ? "" : m.ok ? '<p class="aula-result is-ok">✓ Microfone funcionando: a professora ouve você.</p>' : '<p class="aula-result is-bad">✕ Nenhum microfone encontrado. A professora não ouve você.</p>';
    record.content.innerHTML = `<section class="aula-app"><header><span class="aula-live">AO VIVO</span><strong>Redes de Computadores · 2º ano</strong><small>Aula On-line</small></header>
      <div class="aula-stage"><article class="aula-tile is-teacher ${hearing ? "is-speaking" : ""}"><div class="aula-avatar"><span>AL</span></div><span class="aula-name">Profª Ana Lima <i class="aula-sound">${hearing ? SPK : MUTE}</i></span>${hearing ? '<p class="aula-caption">“Bom dia, turma! Hoje vamos descobrir por que o som some.”</p>' : '<p class="aula-caption is-off">Você não está ouvindo a professora.</p>'}</article>
      <article class="aula-tile is-me"><div class="aula-cam">${CAM}<small>${s.camDisabled ? "Nenhuma câmera encontrada" : "Câmera desligada"}</small></div><span class="aula-name">Você <i class="aula-sound">${s.mic ? MIC : MUTE}</i></span><div class="aula-meter ${m?.ok ? "is-live" : ""}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></article></div>
      <div class="aula-results" role="status">${testLine}${micLine}</div>
      <footer class="aula-controls"><button type="button" class="win-button" data-aula="mic">Testar microfone</button><button type="button" class="win-button is-primary" data-aula="test">Testar som</button><button type="button" class="win-button" data-aula="settings">Configurações de som</button></footer></section>`;
    record.address.textContent = "Aula On-line";
    if (record.aulaWired) return; record.aulaWired = true;
    A().emit("audio:aula-opened", {});
    record.content.addEventListener("click", (event) => {
      const a = event.target.closest("[data-aula]")?.dataset.aula;
      if (a === "test") { const r = A().test(); record.lastTest = { audible: r.audible, reason: r.reason, output: r.current ? r.current.name : "nenhuma saída" }; if (r.audible) chime(r); aula(record); }
      if (a === "mic") { const r = A().micTest(); record.lastMic = { ok: r.mic }; aula(record); }
      if (a === "settings") O.shell.openSettings("sound");
    });
  }

  // ================= assistente de instalação do driver de áudio =================
  function openInstaller(fileId) {
    if (O.software.getDownload(fileId)?.status !== "completed") { O.ui.notify("Aguarde o download", "O arquivo ainda não terminou de baixar.", "info"); return null; }
    A().emit("audio:installer-opened", { fileId });
    O.shell.closeApp("audioinstaller");
    return O.shell.openApp("audioinstaller", { fileId });
  }
  function installer(record) {
    const fileId = record.options?.fileId, file = O.software.installers[fileId], info = A().files[fileId];
    const s = A().get(), problem = A().problem(fileId);
    const st = record.wiz || (record.wiz = { step: s.restartPending && s.driver?.fileId === fileId ? 3 : 0, accepted: false, progress: 0, restartNow: true });
    let body;
    if (st.step === "error") { const [t, msg] = A().PROBLEM_TEXT[problem]; body = `<div class="dw-error"><strong>${safe(t)}</strong><p>${safe(msg)}</p></div>`; }
    else if (st.step === 0) body = `<h2>Bem-vindo ao assistente de instalação</h2><p>Este assistente instala ${safe(info?.title || "o software")} no seu computador Vertex.</p><p class="dw-file">${safe(file?.fileName || "")}</p><p>Feche outros programas antes de continuar.</p>`;
    else if (st.step === 1) body = `<h2>Contrato de licença</h2><div class="dw-license">Este driver é fornecido pela Vertex para notebooks Vertex compatíveis, com tecnologia de áudio Sonora. Você pode instalá-lo nos computadores compatíveis. Não é permitido modificar o driver.</div><label class="dw-check"><input type="checkbox" data-aw-accept ${st.accepted ? "checked" : ""}/> Aceito os termos do contrato</label>`;
    else if (st.step === 2) body = `<h2>Instalando o driver de áudio…</h2><p>Copiando arquivos e registrando o dispositivo de som.</p><div class="dw-bar"><i style="transform:scaleX(${st.progress / 100})"></i></div><p>${st.progress}%</p>`;
    else body = `<h2>Instalação concluída</h2><p>É necessário reiniciar o computador para concluir a instalação do driver.</p><label class="dw-check"><input type="radio" name="aw-restart" data-aw-restart="1" ${st.restartNow ? "checked" : ""}/> Sim, quero reiniciar o computador agora.</label><label class="dw-check"><input type="radio" name="aw-restart" data-aw-restart="0" ${st.restartNow ? "" : "checked"}/> Não, reiniciarei o computador mais tarde.</label>`;
    const next = st.step === 0 ? '<button class="win-button is-primary" data-aw="next">Avançar</button>' : st.step === 1 ? `<button class="win-button is-primary" data-aw="next" ${st.accepted ? "" : "disabled"}>Instalar</button>` : st.step === 3 ? '<button class="win-button is-primary" data-aw="done">Concluir</button>' : st.step === "error" ? '<button class="win-button" data-aw="close">Fechar</button>' : "";
    record.content.innerHTML = `<section class="dw-app is-vertex"><aside><span class="px-logo">Vertex</span><small>Áudio Sonora</small><ol>${["Início", "Licença", "Instalação", "Fim"].map((t, i) => `<li class="${st.step === i ? "is-on" : typeof st.step === "number" && st.step > i ? "is-done" : ""}">${t}</li>`).join("")}</ol></aside><main>${body}<footer>${st.step === 0 || st.step === 1 ? '<button class="win-button" data-aw="close">Cancelar</button>' : ""}${next}</footer></main></section>`;
    record.address.textContent = "Instalação do driver de áudio";
    if (record.awWired) return; record.awWired = true;
    record.content.addEventListener("change", (e) => {
      if (e.target.matches("[data-aw-accept]")) { st.accepted = e.target.checked; installer(record); }
      if (e.target.matches("[data-aw-restart]")) st.restartNow = e.target.dataset.awRestart === "1";
    });
    record.content.addEventListener("click", (e) => {
      const a = e.target.closest("[data-aw]")?.dataset.aw;
      if (!a) return;
      if (a === "close") { O.shell.closeApp("audioinstaller"); return; }
      if (a === "done") { if (st.restartNow) restartComputer(); else { O.shell.closeApp("audioinstaller"); O.ui.notify("Reinicie o computador", "Reinicie para concluir a instalação do driver de áudio. Até lá, o Gerenciador mostra o Código 14.", "warning", 6400); } return; }
      if (st.step === 0) { if (problem) { st.step = "error"; A().emit("audio:install-error", { fileId, reason: problem }); } else st.step = 1; }
      else if (st.step === 1) {
        st.step = 2; st.progress = 0;
        const tick = global.setInterval(() => { st.progress = Math.min(100, st.progress + 25); if (st.progress >= 100) { global.clearInterval(tick); A().install(fileId); st.step = 3; } if (record.element?.isConnected) installer(record); else global.clearInterval(tick); }, 450);
      }
      installer(record);
    });
  }

  // ================= site de suporte Vertex (no navegador do OSLab) =================
  const HOST = "suporte.vertex.com.br", CHIP = "sonora-audio.com";
  const OS_LABEL = { win64: "Windows 11 (64 bits)", win10: "Windows 10 (64 bits)", win32: "Windows 10 (32 bits)" };
  const isQuery = (q) => { const t = norm(q); return t.includes("vertex") || t.includes("note 14") || ((t.includes("audio") || t.includes(" som") || t.startsWith("som")) && (t.includes("driver") || t.includes("notebook"))); };
  function recordSearch(term) {
    if (!isQuery(term)) return;
    const t = norm(term);
    A().emit("audio:search", { term, ok: t.includes("vertex") && /\b14\b/.test(t) && t.includes("driver") && (t.includes("audio") || /\bsom\b/.test(t)) });
  }
  function searchResults(query) {
    if (!isQuery(query)) return null;
    const results = [
      ["official", HOST, "suporte.vertex.com.br › Suporte › Notebooks", "Vertex Note 14 | Drivers e downloads | Suporte Vertex", "Drivers, BIOS e manuais oficiais para notebooks Vertex. Encontre o seu modelo e o sistema operacional."],
      ["bad", "baixardriversgratis.net", "baixardriversgratis.net › audio", "Driver de áudio GRÁTIS para qualquer notebook ✔✔", "Resolva o som em 1 clique! Atualizador automático de drivers. 100% grátis."],
      ["chip", CHIP, "sonora-audio.com › downloads", "Sonora Audio — drivers genéricos de áudio", "Drivers genéricos do fabricante do chip de som. Para notebooks, prefira o site da marca do notebook."],
      ["forum", "forum.tecnicos.local", "forum.tecnicos.local › som", "Notebook sem som depois de formatar? — Fórum de Técnicos", "Confira o Gerenciador de Dispositivos: triângulo amarelo é driver, seta para baixo é dispositivo desabilitado…"],
    ];
    return `<section class="google-results-page"><header><button type="button" class="google-mini-logo" data-browser-go="google.com">Google</button><form class="google-results-search" data-google-search><input name="query" value="${safe(query)}" aria-label="Pesquisar" /><button type="submit"><img src="assets/icons/search.png" alt="Pesquisar" /></button></form><img src="assets/icons/avatar.webp" alt="Perfil do aluno" /></header><nav><strong>Todos</strong><span>Imagens</span><span>Vídeos</span><span>Shopping</span><span>Mais</span></nav><main><p class="google-result-count">Aproximadamente 23.900 resultados simulados (0,29 segundos)</p>${results.map(([kind, host, crumb, title, desc], i) => `<article class="google-result-card ${i === 0 ? "first-result" : ""} ${kind === "bad" ? "is-sponsored" : ""}"><div><span class="result-favicon ${kind === "bad" ? "is-bad" : kind === "official" ? "is-vertex" : ""}">${kind === "bad" ? "↓" : kind === "forum" ? "F" : kind === "chip" ? "S" : "V"}</span><span><strong>${kind === "bad" ? "<em>Patrocinado</em> · " : ""}${safe(host)}</strong><small>https://${safe(crumb)}</small></span></div><button type="button" data-vertex-result="${kind}">${safe(title)}</button><p>${safe(desc)}</p></article>`).join("")}</main></section>`;
  }
  const route = (record) => { const url = String(record.browserState?.currentUrl || HOST), i = url.indexOf("/"); return i >= 0 ? url.slice(i) : "/"; };
  function laptop(tone, cls = "") {
    return `<svg class="vx-laptop ${cls}" viewBox="0 0 240 150" aria-hidden="true"><defs><linearGradient id="vxs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d4ed8"/><stop offset=".6" stop-color="#7c3aed"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect x="38" y="8" width="164" height="106" rx="8" fill="${tone}"/><rect x="45" y="15" width="150" height="92" rx="3" fill="url(#vxs)"/><path d="M45 80c30-20 60 10 90-8s45-10 60 0v35H45z" fill="#fff" opacity=".18"/><path d="M14 118h212l-10 16a8 8 0 0 1-7 4H31a8 8 0 0 1-7-4z" fill="${tone}"/><rect x="100" y="118" width="40" height="5" rx="2.5" fill="#000" opacity=".15"/></svg>`;
  }
  const header = () => `<header class="px-top"><div class="px-brand"><span class="px-logo">Vertex</span><small>Suporte</small></div><nav><span>Notebooks</span><span>Desktops</span><strong>Suporte</strong><span>Garantia</span><span>Contato</span></nav><span class="px-region">Brasil · Português</span></header>`;
  const crumbs = (...items) => `<p class="px-crumbs">${["Início", "Suporte", ...items].map(safe).join(" <span>›</span> ")}</p>`;
  const card = (p) => `<button type="button" class="px-product-card" data-vertex-product="${p.id}">${laptop(p.tone)}<strong>${safe(p.name)}</strong><small>${safe(p.kind)}</small></button>`;
  function home(record, q) {
    const all = Object.values(A().products), t = norm(q || "");
    const found = t ? all.filter((p) => norm(p.name).includes(t.replace("vertex", "").trim()) || norm(p.code).includes(t)) : all;
    return `${crumbs("Notebooks")}<section class="px-search-block"><h1>${q ? `Resultados para “${safe(q)}”` : "Encontre o seu produto"}</h1><form class="px-search" data-vertex-search><span aria-hidden="true">⌕</span><input name="q" value="${safe(q || "")}" placeholder="Digite o modelo do notebook" aria-label="Digite o modelo do notebook" autocomplete="off" /><button type="submit">Buscar</button></form><p class="px-example">Por exemplo: Note 14, Note 15, Book 14 · Não sabe o modelo? Veja em Configurações › Sistema › Sobre.</p></section>
      ${found.length ? `<h2 class="px-sub">Notebooks</h2><div class="px-grid">${found.map(card).join("")}</div>` : '<p class="px-empty">Nenhum produto com esse nome. Confira o modelo em Informações do Sistema.</p>'}`;
  }
  function fileRow(id) {
    const f = A().files[id];
    return `<article class="px-file"><div><strong>${safe(f.title)}</strong><small>${safe(f.note)}</small><dl><div><dt>Compatível com</dt><dd>${safe(f.compat)}</dd></div><div><dt>Versão</dt><dd>${safe(f.version)}</dd></div><div><dt>Data</dt><dd>${safe(f.date)}</dd></div><div><dt>Tamanho</dt><dd>${O.software.installers[id]?.totalMb || 0} MB</dd></div></dl></div><button type="button" data-download-start="${id}">Baixar</button></article>`;
  }
  function productPage(record, id) {
    const p = A().products[id] || A().products[A().MODEL], os = record.vertexOs?.[p.id] || "";
    const files = Object.entries(A().files).filter(([, f]) => f.product === p.id && (f.os === "any" || (os === "win32" ? f.os === "win32" : f.os === "win64")));
    const cats = ["Áudio", "Vídeo", "Aplicativos", "BIOS e firmware"].map((c) => [c, files.filter(([, f]) => f.cat === c).map(([fid]) => fid)]).filter(([, l]) => l.length);
    return `${crumbs("Notebooks", p.name)}<section class="px-product"><div class="px-product-photo">${laptop(p.tone, "is-big")}</div><div><small>Suporte para</small><h1>${safe(p.name)}</h1><p>${safe(p.kind)} · código ${safe(p.code)}</p><p class="px-label-tip">ⓘ Confirme o modelo em Configurações › Sistema › Sobre ou na etiqueta embaixo do notebook.</p></div></section>
      <section class="px-downloads"><nav><strong>Drivers e downloads</strong><span>Manuais</span><span>Perguntas frequentes</span><span>Garantia</span></nav><label class="px-os">Sistema operacional<select data-vertex-os="${p.id}"><option value="">Selecione o sistema operacional</option>${Object.entries(OS_LABEL).map(([k, v]) => `<option value="${k}" ${os === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      ${!os ? '<p class="px-empty">Selecione o sistema operacional para ver os arquivos compatíveis.</p>' : cats.length ? cats.map(([c, list]) => `<h2 class="px-sub">${safe(c)}</h2>${list.map(fileRow).join("")}`).join("") : '<p class="px-empty">Não há arquivos para este sistema.</p>'}</section>`;
  }
  function render(record) {
    const path = route(record);
    const body = path.startsWith("/produto/") ? productPage(record, path.slice(9)) : path.startsWith("/busca") ? home(record, decodeURIComponent(path.split("q=")[1] || "")) : home(record, "");
    return `<section class="px-site is-vertex">${header()}<main>${body}</main><footer class="px-foot"><span class="px-logo">Vertex</span><span>Site de suporte fictício do OSLab · nenhum arquivo real é baixado</span></footer></section>`;
  }
  const go = (record, url) => O.browserApp.navigate(record, url);
  function click(record, event) {
    const result = event.target.closest("[data-vertex-result]")?.dataset.vertexResult;
    if (result === "official") { A().emit("audio:result-opened", { official: true }); go(record, HOST); return true; }
    if (result === "bad") { A().emit("audio:result-opened", { official: false }); record.badFor = "de áudio para notebook"; go(record, "baixardriversgratis.net"); return true; }
    if (result === "chip") { A().emit("audio:result-opened", { official: false, chip: true }); O.ui.notify("Site do fabricante do chip", "O driver genérico do chip pode funcionar, mas em notebook o certo é o driver da marca do notebook: ele vem ajustado para aquele modelo.", "info", 6400); return true; }
    if (result === "forum") { O.ui.notify("Fórum de técnicos", "Fóruns ajudam a entender o problema, mas o driver deve vir do site oficial.", "info", 5000); return true; }
    const product = event.target.closest("[data-vertex-product]")?.dataset.vertexProduct;
    if (product) { A().emit("audio:product-opened", { product }); go(record, `${HOST}/produto/${product}`); return true; }
    return false;
  }
  function submit(record, event) {
    const form = event.target.closest("[data-vertex-search]");
    if (!form) return false;
    event.preventDefault();
    const q = String(new FormData(form).get("q") || "").trim();
    go(record, q ? `${HOST}/busca?q=${encodeURIComponent(q)}` : HOST);
    return true;
  }
  function change(record, event) {
    const select = event.target.closest("[data-vertex-os]");
    if (!select) return false;
    record.vertexOs = { ...(record.vertexOs || {}), [select.dataset.vertexOs]: select.value };
    A().emit("audio:os-selected", { product: select.dataset.vertexOs, os: select.value });
    O.browserApp.render(record);
    return true;
  }
  O.audioSites = { HOST, searchResults, recordSearch, render, click, submit, change, isHost: (h) => h === HOST };

  // ================= trilha (página e robô) =================
  const sections = [
    { slug: "signals", kicker: "Unidade 1 · Missões 1–3", title: "Leia os sinais", description: "Sintoma, mensagem do ícone e o que o Gerenciador mostra.", orders: [1, 2, 3], icon: "speaker_2" },
    { slug: "driver", kicker: "Unidade 2 · Missões 4–6", title: "Driver faltando", description: "Descubra o notebook, baixe o driver oficial, instale e reinicie.", orders: [4, 5, 6], icon: "globe_search" },
    { slug: "disabled", kicker: "Unidade 3 · Missões 7–9", title: "Dispositivo desabilitado", description: "Código 22, saída não permitida e microfone desligado.", orders: [7, 8, 9], icon: "plug_connected" },
    { slug: "mute", kicker: "Unidade 4 · Missões 10–12", title: "Mudo e saída errada", description: "Mudo do sistema, mudo do aplicativo e som indo para a TV.", orders: [10, 11, 12], icon: "settings" },
  ];
  const records = new Set();
  let selectedId = null;
  function trail(record) {
    records.add(record);
    const missions = O.audioLab.getMissions(), progress = O.audioLab.getProgress(), done = Object.keys(progress.completed).length, T = O.audioLab.TOTAL;
    if (!selectedId || missions.find((m) => m.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find((m) => m.status === "available")?.id || missions[0].id;
    const m = missions.find((x) => x.id === selectedId), active = progress.active?.id === selectedId ? progress.active : null;
    const actions = active && !active.suspended ? active.phase === "completed" ? `<button data-al="repeat">Refazer</button><button class="learning-primary" data-al="next">${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>` : '<button class="learning-primary" data-al="continue">Continuar no sistema</button><button data-al="tool">Abrir ferramenta</button><button data-al="restart">Reiniciar missão</button>' : `<button class="learning-primary" data-al="start" ${m.status === "locked" ? "disabled" : ""}>${active?.suspended ? "Retomar missão" : progress.completed[m.id] ? "Praticar novamente" : "Iniciar missão"}</button>`;
    record.content.innerHTML = `<section class="learning-page drivers-trail-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="assets/audio/trail-icon.svg" alt="" /></span><div><small>OSLAB · TRILHA PRÁTICA</small><h1>Som: sem áudio na aula on-line</h1><p>Driver faltando, dispositivo desabilitado ou só no mudo? Descubra a causa e use a correção certa.</p></div></div><div class="learning-stats"><span><strong>${done}/${T}</strong><small>concluídas</small></span><span><strong>${progress.totalScore}/${T * 10}</strong><small>pontos</small></span><div class="learning-progress"><i style="width:${(done / T) * 100}%"></i></div></div></header><div class="learning-toolbar"><span>${progress.active?.suspended ? "Missão pausada. Retome para continuar." : "Seu progresso é salvo neste dispositivo."}</span><button data-al="reset">${O.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="Missões de som">${done === T ? `<section class="wifi-finale"><img src="assets/audio/trail-icon.svg" alt="" /><h2>Técnico de som aprovado!</h2><p>Você separou driver faltando, dispositivo desabilitado, mudo e saída errada.</p><strong>${T}/${T} missões · ${T * 10} pontos</strong></section>` : ""}${O.learningPath.renderSections(missions, sections, selectedId, "audio-mission")}</main><aside class="learning-detail-panel"><div class="learning-detail-icon is-${m.status}"><img src="${m.icon}" alt="" /></div><div class="learning-detail-heading"><small>Missão ${String(m.order).padStart(2, "0")}</small><h2>${safe(m.title)}</h2><span class="learning-status is-${m.status}">${O.learningPath.statusLabel(m.status, true)}</span></div><p class="learning-description">${safe(m.description)}</p><section class="learning-goal"><h3>Aprenda fazendo</h3><p>${safe(m.goal)}</p></section><div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, active)}<p class="learning-description">Depois da prática, responda à pergunta no robô para concluir.</p><div class="learning-detail-actions">${actions}</div></aside></div></section>`;
    record.address.textContent = "Som";
    if (record.alWired) return; record.alWired = true;
    record.content.addEventListener("click", async (event) => {
      const pick = event.target.closest("[data-audio-mission-select]")?.dataset.audioMissionSelect;
      if (pick) { selectedId = pick; trail(record); return; }
      const a = event.target.closest("[data-al]")?.dataset.al;
      if (a === "start" && O.audioLab.start(selectedId).ok) O.windowManager.minimize(record.windowId);
      if (a === "continue") { O.assistantRobot.expand(); O.windowManager.minimize(record.windowId); }
      if (a === "tool") { event.stopPropagation(); openTool(); }
      if (a === "repeat") O.audioLab.finish("repeat");
      if (a === "next") O.audioLab.finish("next");
      if (a === "restart") O.audioLab.restart();
      if (a === "reset" && await O.ui.confirm({ title: "Redefinir a trilha de Som?", message: "As conclusões, a tentativa atual e os pontos desta trilha serão apagados.", confirmLabel: "Redefinir" })) { O.audioLab.reset(); selectedId = null; trail(record); }
    });
  }
  function openTool() {
    const m = O.audioMissionCatalog.find((x) => x.id === O.audioLab.getProgress().active?.id);
    if (!m) return;
    if (m.tool.startsWith("settings:")) { O.shell.openSettings(m.tool.slice(9)); return; }
    if (m.tool !== "google") { O.shell.openApp(m.tool); return; }
    const record = O.shell.openApp("google");
    if (!record) return;
    if (m.order === 5 && !O.audioSites.isHost(record.browserHost)) O.browserApp.navigate(record, "google.com");
    if (m.order === 6) { record.downloadPanelOpen = true; O.browserApp.render(record); }
  }
  function recordForm(m, a) {
    const sel = (name, label, opts) => `<label>${label}<select name="${name}" required><option value="">Selecione</option>${opts.map((o) => `<option>${o}</option>`).join("")}</select></label>`;
    const fields = m.order === 3 ? sel("triangle", "Código do triângulo amarelo (áudio)", ["10", "22", "28", "43"]) + sel("arrow", "Código da seta para baixo (câmera)", ["10", "22", "28", "43"])
      : sel("brand", "Fabricante do sistema", ["Vertex", "Sonora", "Intel"]) + sel("model", "Modelo do sistema", ["Book 14", "Note 14", "Note 14 Pro", "Note 15"]) + sel("system", "Sistema", ["Windows 10 (32 bits)", "Windows 11 (32 bits)", "Windows 11 (64 bits)"]);
    return `<form class="wifi-record-form" data-audio-record-form><h3>Registre o que encontrou</h3>${fields}<button type="submit">Conferir</button>${a.recordFeedback ? `<div class="wifi-answer-feedback ${a.recordFeedback.ok ? "is-correct" : "is-wrong"}" role="status">${safe(a.recordFeedback.text)}</div>` : ""}</form>`;
  }
  function quiz(m, a) {
    const f = a.feedback;
    return `<section class="wifi-question" aria-label="Pergunta da missão"><h3>Antes de continuar</h3><p>${safe(m.quiz.text)}</p><div class="wifi-question-options">${m.quiz.options.map((o, i) => `<button type="button" data-audio-answer="${i}" class="${f?.index === i ? f.correct ? "is-correct" : "is-wrong" : ""}" ${a.phase === "completed" ? "disabled" : ""}>${safe(o)}</button>`).join("")}</div>${f ? `<div class="wifi-answer-feedback ${f.correct ? "is-correct" : "is-wrong"}" role="status"><strong>${f.correct ? "Resposta correta!" : "Ainda não. Tente novamente."}</strong> ${safe(f.text)}</div>` : "<p>Escolha uma opção.</p>"}</section>`;
  }
  function assistantView() {
    const a = O.audioLab?.getProgress?.().active;
    if (!a || a.suspended) return null;
    const m = O.audioMissionCatalog.find((x) => x.id === a.id), completed = a.phase === "completed", T = O.audioLab.TOTAL;
    const step = m.steps.find((x) => !a.checklist[x.objectiveId]), icon = O.learningPath.actionIcon;
    return {
      kind: "audio-lab", mascot: completed ? "celebrate" : a.notice || a.hintsUsed || a.feedback?.correct === false ? "help" : "neutral",
      eyebrow: `Som · Missão ${m.order}/${T}`, title: m.title,
      message: a.phase === "practice" ? step?.text || "Tudo certo nos passos. Confira se o som (ou o microfone) funciona de verdade." : completed ? "Prática e pergunta concluídas. Você ganhou 10 pontos!" : "Você fez a prática. Agora confira o que aprendeu.",
      body: a.phase === "practice" ? `${a.notice ? `<div class="wifi-answer-feedback is-wrong" role="status">${safe(a.notice)}</div>` : ""}<div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, a)}${m.order === 3 || m.order === 4 ? recordForm(m, a) : ""}${a.lastHint ? `<div class="wifi-answer-feedback">Dica ${a.hintsUsed}/3: ${safe(a.lastHint)}</div>` : ""}` : quiz(m, a),
      actions: completed ? `<button data-assistant-action="audio-open">${icon("target_arrow")}Ver trilha</button><button data-assistant-action="audio-repeat">${icon("arrow_reset")}Refazer</button><button class="is-primary" data-assistant-action="audio-next">${icon("arrow_right")}${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>`
        : `<button data-assistant-action="audio-tool">${icon("apps")}Abrir ferramenta</button><button data-assistant-action="audio-hint" ${a.phase !== "practice" ? "disabled" : ""}>${icon("lightbulb")}${a.hintsUsed >= 3 ? "Rever dica 3/3" : `Dica ${a.hintsUsed + 1}/3`}</button><button data-assistant-action="audio-restart">${icon("arrow_reset")}Reiniciar</button><button data-assistant-action="audio-pause">${icon("pause")}Pausar</button>`,
    };
  }

  // ================= atualização das telas =================
  O.audioLab.subscribe((p, reason) => { if (reason === "started") selectedId = p.active?.id || selectedId; records.forEach((r) => (r.element?.isConnected ? trail(r) : records.delete(r))); });
  A().subscribe(() => {
    updateTray();
    O.devmgr?.refresh?.();
    // qualquer mudança no som invalida o último teste: o aluno testa de novo para confirmar
    aulaRecords.forEach((r) => { if (!r.element?.isConnected) { aulaRecords.delete(r); return; } r.lastTest = r.lastMic = null; aula(r); });
    settingsRecords.forEach((r) => { if (!r.element?.isConnected) { settingsRecords.delete(r); return; } if (isPage(r.settingsView) && !dragging()) r.sndRerender?.(); });
  });
  function renderApp(record) {
    if (record.appId === "audiolab") trail(record);
    if (record.appId === "aulaonline") aula(record);
    if (record.appId === "audioinstaller") installer(record);
  }
  O.audioApps = { ids: new Set(["audiolab", "aulaonline", "audioinstaller"]), render: renderApp };
  O.audioInstaller = { open: openInstaller, restartComputer };
  O.audioLabApp = { assistantView, openTool };
})(window);
