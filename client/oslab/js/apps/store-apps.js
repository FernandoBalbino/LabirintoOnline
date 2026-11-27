(function createStoreApps(global) {
  "use strict";
  // Aplicativos que o aluno baixa na Microsoft Store do OSLab. Cada um tem as ações básicas funcionando.
  const O = global.OSLab;
  const KEY = "oslab.storeapps.v1";
  const safe = (value) => O.ui.escapeHtml(value);
  const FL = "assets/icons/taskmanager/fluent/";
  const ic = (name) => `<i class="ms-ic" style="-webkit-mask-image:url(${FL}${name}.svg);mask-image:url(${FL}${name}.svg)" aria-hidden="true"></i>`;
  const emit = (type, detail = {}) => O.events.emit(type, detail, "storeApps");
  // contas fictícias da trilha (o robô mostra no momento de entrar)
  const CREDENTIALS = {
    spotify: { email: "aluno.oslab@gmail.com", password: "Musica2026" },
    netflix: { email: "aluno.oslab@gmail.com", password: "Filmes2026" },
    discord: { email: "aluno.oslab@gmail.com", password: "Conversa2026" },
  };
  const blank = () => ({ version: 1, sessions: {}, chat: [], todo: [], notes: [], drawings: 0 });
  let data = blank();
  try { const saved = JSON.parse(global.localStorage.getItem(KEY)); if (saved?.version === 1) data = { ...blank(), ...saved }; } catch (_) { /* começa limpo */ }
  const save = () => { try { global.localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* sem armazenamento */ } };
  const icon = (id) => O.store?.get(id)?.icon || "assets/icons/win11/store-48.png";

  // ---------------- login (Spotify, Netflix, Discord) ----------------
  function login(record, app, title, theme, after) {
    if (data.sessions[app]) return false;
    record.content.innerHTML = `<section class="sa-login is-${app}"><form data-sa-login><img src="${icon(app)}" alt="" /><h1>${title}</h1><label>E-mail<input name="email" type="email" autocomplete="off" required /></label><label>Senha<input name="password" type="password" autocomplete="off" required /></label>${record.loginError ? `<p class="sa-error" role="alert">${safe(record.loginError)}</p>` : ""}<button type="submit">Entrar</button><small>Conta de demonstração do OSLab. Nenhum dado sai do computador.</small></form></section>`;
    record.content.querySelector("[data-sa-login]").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.target), c = CREDENTIALS[app];
      const ok = String(form.get("email")).trim().toLowerCase() === c.email && String(form.get("password")) === c.password;
      record.loginError = ok ? null : "E-mail ou senha incorretos. Confira as letras maiúsculas.";
      emit("storeapp:login", { app, ok });
      if (ok) { data.sessions[app] = c.email; save(); }
      after(record);
    }, { once: true });
    record.content.querySelector("input")?.focus();
    void theme;
    return true;
  }
  function logout(app, record, rerender) { delete data.sessions[app]; save(); emit("storeapp:logout", { app }); rerender(record); }

  // ---------------- ChatGPT ----------------
  const ANSWERS = [
    [/travou|travado|não responde|nao responde/, "Quando um programa trava, abra o Gerenciador de Tarefas (botão direito na barra de tarefas), selecione o programa e clique em Finalizar tarefa."],
    [/instal|baixar|baixo|download/, "No Windows, o lugar mais seguro para baixar aplicativos é a Microsoft Store: pesquise o nome, confira o editor e as avaliações e clique em Instalar."],
    [/senha/, "Uma senha forte tem pelo menos 12 caracteres, mistura letras, números e símbolos e não usa datas ou nomes. Nunca compartilhe sua senha."],
    [/v[íi]rus|seguran/, "Evite baixar programas de sites desconhecidos, mantenha o Windows atualizado e desconfie de arquivos com nome estranho, como .pdf.exe."],
    [/wi-?fi|internet/, "Se a internet não funciona, confira o ícone de rede, veja se o Wi-Fi está ligado e se o modo avião está desligado."],
    [/^(oi|ol[áa]|bom dia|boa tarde|boa noite)/, "Olá! Sou o ChatGPT do OSLab. Posso explicar coisas de informática. Pergunte, por exemplo: como baixar um aplicativo com segurança?"],
  ];
  function answer(text) { const t = text.toLowerCase(); return (ANSWERS.find(([re]) => re.test(t)) || [, "Boa pergunta! Aqui no OSLab eu respondo sobre informática: programas travados, downloads seguros, senhas, internet e Windows. Tente perguntar sobre um desses assuntos."])[1]; }
  function chatgpt(record) {
    const msgs = data.chat;
    record.content.innerHTML = `<section class="sa-gpt"><aside><button type="button" data-gpt-new>${ic("ms-add_20_regular")}Novo chat</button><small>Hoje</small>${msgs.length ? `<span>${safe(msgs[0].text.slice(0, 28))}</span>` : ""}</aside><main>${msgs.length ? `<div class="sa-gpt-log">${msgs.map((m) => `<p class="is-${m.from}">${safe(m.text)}</p>`).join("")}${record.gptTyping ? '<p class="is-bot is-typing"><i></i><i></i><i></i></p>' : ""}</div>` : '<h1>Em que você está pensando hoje?</h1>'}<form data-gpt-form><input name="q" placeholder="Pergunte alguma coisa" autocomplete="off" aria-label="Mensagem para o ChatGPT" /><button type="submit" aria-label="Enviar">${ic("ms-send_20_filled")}</button></form><small class="sa-gpt-note">O ChatGPT do OSLab responde só sobre informática, sem internet.</small></main></section>`;
    const log = record.content.querySelector(".sa-gpt-log"); if (log) log.scrollTop = log.scrollHeight;
    record.content.querySelector("[data-gpt-form] input").focus();
    if (record.gptWired) return; record.gptWired = true;
    record.content.addEventListener("submit", (event) => {
      if (!event.target.matches("[data-gpt-form]")) return;
      event.preventDefault();
      const text = String(new FormData(event.target).get("q") || "").trim();
      if (!text || record.gptTyping) return;
      data.chat.push({ from: "user", text }); save(); record.gptTyping = true; chatgpt(record);
      emit("chatgpt:message", { text });
      global.setTimeout(() => { record.gptTyping = false; data.chat.push({ from: "bot", text: answer(text) }); save(); if (record.element?.isConnected) chatgpt(record); }, 1100);
    });
    record.content.addEventListener("click", (event) => { if (event.target.closest("[data-gpt-new]")) { data.chat = []; save(); chatgpt(record); } });
  }

  // ---------------- Spotify ----------------
  const TRACKS = [["Foco na Revisão", "Lo-fi do Laboratório", "2:48"], ["Noite de Estudos", "Turma do Técnico", "3:12"], ["Código Limpo", "Beats da Biblioteca", "2:35"], ["Chuva na Janela", "Lo-fi do Laboratório", "3:40"], ["Café e Planilhas", "Acústico OSLab", "2:59"], ["Último Bimestre", "Turma do Técnico", "3:05"]];
  function spotify(record) {
    if (login(record, "spotify", "Entrar no Spotify", "dark", spotify)) return;
    const playing = record.spTrack;
    record.content.innerHTML = `<section class="sa-sp"><aside><img src="${icon("spotify")}" alt="" /><strong>Sua Biblioteca</strong><button type="button" class="is-on">Músicas para estudar</button><button type="button">Curtidas</button><button type="button" data-sa-logout>Sair</button></aside><main><header><span class="sa-sp-cover"></span><div><small>Playlist</small><h1>Músicas para estudar</h1><p>${TRACKS.length} músicas · trilha sonora fictícia do OSLab</p></div></header><ol>${TRACKS.map(([name, artist, time], index) => `<li class="${playing === index ? "is-playing" : ""}"><button type="button" data-sp-play="${index}"><b>${playing === index ? "▶" : index + 1}</b><span><strong>${name}</strong><small>${artist}</small></span><em>${time}</em></button></li>`).join("")}</ol></main><footer>${playing == null ? "<span>Escolha uma música para tocar</span>" : `<span><strong>${TRACKS[playing][0]}</strong><small>${TRACKS[playing][1]}</small></span><div class="sa-sp-ctrl"><button type="button" data-sp-step="-1" aria-label="Anterior">${ic("ms-previous_20_filled")}</button><button type="button" class="is-main" data-sp-toggle aria-label="${record.spPaused ? "Tocar" : "Pausar"}">${ic(record.spPaused ? "ms-play_20_filled" : "ms-pause_20_filled")}</button><button type="button" data-sp-step="1" aria-label="Próxima">${ic("ms-next_20_filled")}</button></div><div class="sa-sp-bar${record.spPaused ? " is-paused" : ""}"><i></i></div>`}</footer></section>`;
    if (record.spWired) return; record.spWired = true;
    record.content.addEventListener("click", (event) => {
      const play = event.target.closest("[data-sp-play]")?.dataset.spPlay, step = event.target.closest("[data-sp-step]")?.dataset.spStep;
      if (event.target.closest("[data-sa-logout]")) { logout("spotify", record, spotify); return; }
      if (play !== undefined) { record.spTrack = Number(play); record.spPaused = false; emit("spotify:play", { track: TRACKS[record.spTrack][0] }); }
      if (step !== undefined) { record.spTrack = (record.spTrack + Number(step) + TRACKS.length) % TRACKS.length; record.spPaused = false; emit("spotify:play", { track: TRACKS[record.spTrack][0] }); }
      if (event.target.closest("[data-sp-toggle]")) record.spPaused = !record.spPaused;
      if (play !== undefined || step !== undefined || event.target.closest("[data-sp-toggle]")) spotify(record);
    });
  }

  // ---------------- Netflix ----------------
  function netflix(record) {
    if (login(record, "netflix", "Entrar", "dark", netflix)) return;
    const movies = O.vpnSites?.movies || [];
    if (!record.nfProfile) {
      record.content.innerHTML = `<section class="sa-nf is-profiles"><img class="sa-nf-logo" src="assets/digital/netflix/wordmark.svg" alt="Netflix" /><h1>Quem está assistindo?</h1><div>${[["Aluno", "assets/icons/avatar.webp"], ["Turma", "assets/learning/mascot/oslab-mascot-neutral.png"]].map(([name, src]) => `<button type="button" data-nf-profile="${name}"><img src="${src}" alt="" /><span>${name}</span></button>`).join("")}</div><button type="button" class="sa-nf-out" data-sa-logout>Sair da conta</button></section>`;
    } else {
      const now = record.nfPlaying != null ? movies[record.nfPlaying] : null;
      record.content.innerHTML = `<section class="sa-nf"><header><img class="sa-nf-logo" src="assets/digital/netflix/wordmark.svg" alt="Netflix" /><nav><b>Início</b><span>Séries</span><span>Filmes</span></nav><em>${safe(record.nfProfile)}</em></header>${now ? `<div class="sa-nf-player"><img src="${now.poster}" alt="" /><div><small>Assistindo</small><h2>${safe(now.title)}</h2><div class="sa-nf-progress${record.nfPaused ? " is-paused" : ""}"><i></i></div><button type="button" data-nf-pause>${record.nfPaused ? "▶ Continuar" : "❚❚ Pausar"}</button><button type="button" data-nf-stop>Voltar ao catálogo</button></div></div>` : ""}<h3>Em alta</h3><div class="sa-nf-row">${movies.map((movie, index) => `<button type="button" data-nf-play="${index}"><img src="${movie.poster}" alt="" loading="lazy" /><span>${safe(movie.title)}</span></button>`).join("")}</div><p class="sa-nf-note">Títulos e capas fictícios do OSLab.</p></section>`;
    }
    if (record.nfWired) return; record.nfWired = true;
    record.content.addEventListener("click", (event) => {
      const profile = event.target.closest("[data-nf-profile]")?.dataset.nfProfile, play = event.target.closest("[data-nf-play]")?.dataset.nfPlay;
      if (event.target.closest("[data-sa-logout]")) { record.nfProfile = null; logout("netflix", record, netflix); return; }
      if (profile) { record.nfProfile = profile; emit("netflix:profile", { profile }); }
      if (play !== undefined) { record.nfPlaying = Number(play); record.nfPaused = false; emit("netflix:play", { title: (O.vpnSites?.movies || [])[record.nfPlaying]?.title }); }
      if (event.target.closest("[data-nf-pause]")) record.nfPaused = !record.nfPaused;
      if (event.target.closest("[data-nf-stop]")) record.nfPlaying = null;
      if (profile || play !== undefined || event.target.closest("[data-nf-pause], [data-nf-stop]")) { netflix(record); record.content.querySelector(".sa-nf")?.scrollTo?.(0, 0); }
    });
  }

  // ---------------- Discord (também abre sozinho na trilha do Gerenciador) ----------------
  const CHANNELS = { geral: [["Prof. Fernando", "Bom dia, turma! Hoje tem prática no OSLab."], ["Bia", "Alguém já instalou o ibis Paint pela loja?"]], trabalhos: [["Rafael", "O trabalho de Redes é para sexta, né?"]] };
  function discord(record) {
    if (record.options?.fromStartup && !record.dcSplashDone) {
      record.content.innerHTML = '<section class="dc-splash"><img src="assets/digital/brands/discord-white.svg" alt="" /><strong>Discord</strong><p>Verificando atualizações…</p><small>Aberto automaticamente ao iniciar o Windows</small></section>';
      global.setTimeout(() => { record.dcSplashDone = true; if (record.element?.isConnected) discord(record); }, 2400);
      return;
    }
    if (login(record, "discord", "Boas-vindas de volta!", "dark", discord)) return;
    const channel = record.dcChannel || "geral", messages = [...CHANNELS[channel], ...(data[`dc-${channel}`] || []).map((text) => ["Você", text])];
    record.content.innerHTML = `<section class="sa-dc"><nav><img src="assets/digital/brands/discord-white.svg" alt="" class="is-home" /><b title="Servidor da Turma">2B</b></nav><aside><strong>Turma 2º Técnico</strong>${Object.keys(CHANNELS).map((name) => `<button type="button" class="${name === channel ? "is-on" : ""}" data-dc-channel="${name}"># ${name}</button>`).join("")}<button type="button" class="sa-dc-out" data-sa-logout>Sair</button></aside><main><header># ${channel}</header><div class="sa-dc-log">${messages.map(([who, text]) => `<p><b>${safe(who)}</b>${safe(text)}</p>`).join("")}</div><form data-dc-form><input name="m" placeholder="Conversar em #${channel}" autocomplete="off" aria-label="Mensagem" /></form></main></section>`;
    const log = record.content.querySelector(".sa-dc-log"); log.scrollTop = log.scrollHeight;
    if (record.dcWired) return; record.dcWired = true;
    record.content.addEventListener("click", (event) => {
      const ch = event.target.closest("[data-dc-channel]")?.dataset.dcChannel;
      if (event.target.closest("[data-sa-logout]")) { logout("discord", record, discord); return; }
      if (ch) { record.dcChannel = ch; discord(record); }
    });
    record.content.addEventListener("submit", (event) => {
      if (!event.target.matches("[data-dc-form]")) return;
      event.preventDefault();
      const text = String(new FormData(event.target).get("m") || "").trim();
      if (!text) return;
      const key = `dc-${record.dcChannel || "geral"}`; (data[key] ||= []).push(text.slice(0, 300)); save();
      emit("discord:message", { channel: record.dcChannel || "geral", text });
      discord(record); record.content.querySelector("[data-dc-form] input")?.focus();
    });
  }

  // ---------------- ibis Paint X ----------------
  const COLORS = ["#111111", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ffffff"];
  function ibispaint(record) {
    record.ibColor ||= "#1e88e5"; record.ibSize ||= 8;
    record.content.innerHTML = `<section class="sa-ib"><header><img src="${icon("ibispaint")}" alt="" /><strong>ibis Paint X</strong><span class="sa-fill"></span><button type="button" data-ib-tool="brush" class="${record.ibTool !== "eraser" ? "is-on" : ""}">${ic("ms-paint_brush_20_filled")}Pincel</button><button type="button" data-ib-tool="eraser" class="${record.ibTool === "eraser" ? "is-on" : ""}">${ic("ms-eraser_20_regular")}Borracha</button><label>Tamanho <input type="range" min="2" max="40" value="${record.ibSize}" data-ib-size /></label><button type="button" data-ib-clear>${ic("ms-delete_20_regular")}Limpar</button><button type="button" class="is-primary" data-ib-save>${ic("ms-save_20_regular")}Salvar em Imagens</button></header><div class="sa-ib-body"><div class="sa-ib-colors">${COLORS.map((color) => `<button type="button" class="${color === record.ibColor ? "is-on" : ""}" style="background:${color}" data-ib-color="${color}" aria-label="Cor ${color}"></button>`).join("")}</div><canvas width="900" height="560" aria-label="Tela de desenho"></canvas></div></section>`;
    const canvas = record.content.querySelector("canvas"), ctx = canvas.getContext("2d");
    if (record.ibImage) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = record.ibImage; } else { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    let drawing = false, last = null;
    const point = (event) => { const r = canvas.getBoundingClientRect(); return [(event.clientX - r.left) * canvas.width / r.width, (event.clientY - r.top) * canvas.height / r.height]; };
    canvas.addEventListener("pointerdown", (event) => { drawing = true; last = point(event); canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      const p = point(event); ctx.strokeStyle = record.ibTool === "eraser" ? "#fff" : record.ibColor; ctx.lineWidth = record.ibSize; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p;
    });
    const stop = () => { if (!drawing) return; drawing = false; record.ibImage = canvas.toDataURL("image/png"); if (!record.ibDrew) { record.ibDrew = true; emit("ibis:draw", {}); } };
    canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointerleave", stop);
    if (record.ibWired) return; record.ibWired = true;
    record.content.addEventListener("input", (event) => { if (event.target.matches("[data-ib-size]")) record.ibSize = Number(event.target.value); });
    record.content.addEventListener("click", (event) => {
      const tool = event.target.closest("[data-ib-tool]")?.dataset.ibTool, color = event.target.closest("[data-ib-color]")?.dataset.ibColor;
      if (tool) { record.ibTool = tool; ibispaint(record); }
      if (color) { record.ibColor = color; record.ibTool = "brush"; ibispaint(record); }
      if (event.target.closest("[data-ib-clear]")) { record.ibImage = null; ibispaint(record); }
      if (event.target.closest("[data-ib-save]")) {
        if (!record.ibDrew) { O.ui.notify("Tela em branco", "Desenhe alguma coisa antes de salvar.", "info", 3200); return; }
        data.drawings += 1; save();
        const file = O.fileSystem.create({ parentId: O.fileSystem.roots.pictures, kind: "file", name: `desenho-ibis-${data.drawings}.png`, mime: "image/png", sizeBytes: Math.round((record.ibImage || "").length * 0.75) });
        O.shell.refreshDesktop?.();
        O.ui.notify("Desenho salvo", `${file?.name || "O desenho"} está em Imagens.`, "success", 3800);
        emit("ibis:saved", { fileId: file?.id, name: file?.name });
      }
    });
  }

  // ---------------- Calculadora ----------------
  function calculator(record) {
    record.calc ||= { display: "0", acc: null, op: null, fresh: true };
    const c = record.calc;
    const keys = ["%", "CE", "C", "⌫", "1/x", "x²", "√x", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "±", "0", ",", "="];
    record.content.innerHTML = `<section class="sa-calc"><header>Padrão</header><output>${c.op ? `<small>${String(c.acc).replace(".", ",")} ${c.op}</small>` : "<small></small>"}<strong>${c.display}</strong></output><div>${keys.map((key) => `<button type="button" class="${key === "=" ? "is-eq" : /\d|,|±/.test(key) && key.length <= 2 ? "is-num" : ""}" data-calc="${key}">${key}</button>`).join("")}</div></section>`;
    if (record.calcWired) return; record.calcWired = true;
    const value = () => Number(c.display.replace(",", "."));
    const show = (n) => { c.display = Number.isFinite(n) ? String(Math.round(n * 1e10) / 1e10).replace(".", ",") : "Não é possível dividir por zero"; c.fresh = true; };
    const ops = { "+": (a, b) => a + b, "−": (a, b) => a - b, "×": (a, b) => a * b, "÷": (a, b) => (b === 0 ? NaN : a / b) };
    record.content.addEventListener("click", (event) => {
      const key = event.target.closest("[data-calc]")?.dataset.calc;
      if (!key) return;
      if (/^\d$/.test(key)) { c.display = c.fresh || c.display === "0" ? key : (c.display + key).slice(0, 16); c.fresh = false; }
      else if (key === ",") { if (c.fresh) { c.display = "0,"; c.fresh = false; } else if (!c.display.includes(",")) c.display += ","; }
      else if (key === "C") Object.assign(c, { display: "0", acc: null, op: null, fresh: true });
      else if (key === "CE") { c.display = "0"; c.fresh = true; }
      else if (key === "⌫") c.display = c.display.length > 1 && !c.fresh ? c.display.slice(0, -1) : "0";
      else if (key === "±") c.display = String(-value()).replace(".", ",");
      else if (key === "%") show(c.acc != null ? c.acc * value() / 100 : value() / 100);
      else if (key === "1/x") show(1 / value());
      else if (key === "x²") show(value() ** 2);
      else if (key === "√x") show(Math.sqrt(value()));
      else if (ops[key]) { c.acc = c.op && !c.fresh ? ops[c.op](c.acc, value()) : value(); c.op = key; show(c.acc); }
      else if (key === "=" && c.op) { const result = ops[c.op](c.acc, value()); c.op = null; c.acc = null; show(result); emit("calculator:result", { value: result }); }
      calculator(record);
    });
  }

  // ---------------- Microsoft To Do ----------------
  function todo(record) {
    record.content.innerHTML = `<section class="sa-todo"><aside><img src="${icon("todo")}" alt="" /><button type="button" class="is-on">☀ Meu Dia</button><button type="button">☆ Importante</button><button type="button">⌂ Tarefas</button></aside><main><h1>Meu Dia</h1><p>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p><ul>${data.todo.map((task, index) => `<li class="${task.done ? "is-done" : ""}"><button type="button" data-todo-check="${index}" aria-label="${task.done ? "Desmarcar" : "Concluir"} tarefa">${ic(task.done ? "ms-checkmark_circle_20_filled" : "ms-circle_20_regular")}</button><span>${safe(task.text)}</span><button type="button" data-todo-del="${index}" aria-label="Excluir tarefa">${ic("ms-delete_20_regular")}</button></li>`).join("")}</ul><form data-todo-form>${ic("ms-add_20_regular")}<input name="t" placeholder="Adicionar uma tarefa" autocomplete="off" aria-label="Nova tarefa" /></form></main></section>`;
    if (record.todoWired) return; record.todoWired = true;
    record.content.addEventListener("submit", (event) => {
      if (!event.target.matches("[data-todo-form]")) return;
      event.preventDefault();
      const text = String(new FormData(event.target).get("t") || "").trim();
      if (!text) return;
      data.todo.push({ text: text.slice(0, 120), done: false }); save(); emit("todo:added", { text, count: data.todo.length });
      todo(record); record.content.querySelector("[data-todo-form] input").focus();
    });
    record.content.addEventListener("click", (event) => {
      const check = event.target.closest("[data-todo-check]")?.dataset.todoCheck, del = event.target.closest("[data-todo-del]")?.dataset.todoDel;
      if (check !== undefined) { const task = data.todo[check]; task.done = !task.done; save(); if (task.done) emit("todo:done", { text: task.text }); todo(record); }
      if (del !== undefined) { data.todo.splice(Number(del), 1); save(); todo(record); }
    });
  }

  // ---------------- Relógio (cronômetro e temporizador) ----------------
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")},${String(Math.floor(ms % 1000 / 10)).padStart(2, "0")}`; };
  function clock(record) {
    record.clk ||= { tab: "stopwatch", elapsed: 0, startedAt: null, laps: [], timer: 5 * 60000, timerEnd: null };
    const k = record.clk, running = k.startedAt != null, total = k.elapsed + (running ? Date.now() - k.startedAt : 0);
    const left = k.timerEnd ? Math.max(0, k.timerEnd - Date.now()) : k.timer;
    record.content.innerHTML = `<section class="sa-clock"><aside><button type="button" class="${k.tab === "timer" ? "is-on" : ""}" data-clk-tab="timer">${ic("ms-timer_20_regular")}Temporizador</button><button type="button" class="${k.tab === "stopwatch" ? "is-on" : ""}" data-clk-tab="stopwatch">${ic("ms-timer_20_regular")}Cronômetro</button><button type="button" class="${k.tab === "world" ? "is-on" : ""}" data-clk-tab="world">🌐 Relógio</button></aside><main>${k.tab === "stopwatch" ? `<strong data-clk-face>${fmt(total)}</strong><div><button type="button" class="is-primary" data-clk-run>${running ? "❚❚ Pausar" : "▶ Iniciar"}</button><button type="button" data-clk-lap ${running ? "" : "disabled"}>Volta</button><button type="button" data-clk-reset>Zerar</button></div><ol>${k.laps.map((lap, index) => `<li>Volta ${index + 1}<span>${fmt(lap)}</span></li>`).join("")}</ol>` : k.tab === "timer" ? `<strong data-clk-face>${fmt(left).slice(0, 8)}</strong><div><button type="button" class="is-primary" data-clk-timer>${k.timerEnd ? "Parar" : "▶ Iniciar 5 minutos"}</button></div>` : `<strong>${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong><p>Brasília (horário local)</p>`}</main></section>`;
    if (!record.clkTick) record.clkTick = global.setInterval(() => { if (!record.element?.isConnected) { global.clearInterval(record.clkTick); return; } const face = record.content.querySelector("[data-clk-face]"); const kk = record.clk; if (!face) return; if (kk.tab === "stopwatch") face.textContent = fmt(kk.elapsed + (kk.startedAt != null ? Date.now() - kk.startedAt : 0)); else if (kk.tab === "timer") { const l = kk.timerEnd ? Math.max(0, kk.timerEnd - Date.now()) : kk.timer; face.textContent = fmt(l).slice(0, 8); if (kk.timerEnd && !l) { kk.timerEnd = null; O.ui.notify("Temporizador", "O tempo acabou!", "info", 5000); clock(record); } } }, 100);
    if (record.clkWired) return; record.clkWired = true;
    record.content.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-clk-tab]")?.dataset.clkTab, kk = record.clk;
      if (tab) kk.tab = tab;
      if (event.target.closest("[data-clk-run]")) { if (kk.startedAt != null) { kk.elapsed += Date.now() - kk.startedAt; kk.startedAt = null; } else { kk.startedAt = Date.now(); emit("clock:started", {}); } }
      if (event.target.closest("[data-clk-lap]") && kk.startedAt != null) kk.laps.unshift(kk.elapsed + Date.now() - kk.startedAt);
      if (event.target.closest("[data-clk-reset]")) Object.assign(kk, { elapsed: 0, startedAt: null, laps: [] });
      if (event.target.closest("[data-clk-timer]")) kk.timerEnd = kk.timerEnd ? null : Date.now() + kk.timer;
      clock(record);
    });
  }

  // ---------------- Notas Autoadesivas ----------------
  function stickynotes(record) {
    record.content.innerHTML = `<section class="sa-notes"><header><strong>Notas Autoadesivas</strong><button type="button" data-note-add aria-label="Nova nota">${ic("ms-add_20_regular")}</button></header><div>${data.notes.map((note, index) => `<article><textarea data-note="${index}" aria-label="Nota ${index + 1}" placeholder="Anote algo...">${safe(note)}</textarea><button type="button" data-note-del="${index}" aria-label="Excluir nota">${ic("ms-delete_20_regular")}</button></article>`).join("") || '<p>Nenhuma nota ainda. Clique em + para criar.</p>'}</div></section>`;
    if (record.notesWired) return; record.notesWired = true;
    record.content.addEventListener("input", (event) => { const i = event.target.dataset?.note; if (i !== undefined) { data.notes[i] = event.target.value.slice(0, 1000); save(); } });
    record.content.addEventListener("click", (event) => {
      if (event.target.closest("[data-note-add]")) { data.notes.unshift(""); save(); emit("notes:added", {}); stickynotes(record); record.content.querySelector("textarea")?.focus(); }
      const del = event.target.closest("[data-note-del]")?.dataset.noteDel;
      if (del !== undefined) { data.notes.splice(Number(del), 1); save(); stickynotes(record); }
    });
  }

  const renderers = { chatgpt, spotify, netflix, discord, ibispaint, calculator, todo, clock, stickynotes };
  O.storeApps = {
    ids: new Set(["msstore", ...Object.keys(renderers)]),
    CREDENTIALS,
    render(record) { if (record.appId === "msstore") O.storeApp.render(record); else renderers[record.appId]?.(record); },
    /** usado pela trilha ao reiniciar uma missão */
    resetApp(app) { if (app === "chatgpt") data.chat = []; if (app === "todo") data.todo = []; if (CREDENTIALS[app]) delete data.sessions[app]; Object.keys(data).filter((key) => app === "discord" && key.startsWith("dc-")).forEach((key) => delete data[key]); save(); },
    session: (app) => Boolean(data.sessions[app]),
    todoItems: () => data.todo.map((task) => ({ ...task })),
  };
})(window);
