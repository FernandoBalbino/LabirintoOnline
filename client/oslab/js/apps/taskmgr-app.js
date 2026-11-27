(function createTaskManagerTrailApp(global) {
  "use strict";
  // Página da trilha Gerenciador de Tarefas, robô (com a animação "como abrir") e o Discord que abre com o Windows.
  const O = global.OSLab;
  const safe = (value) => O.ui.escapeHtml(value);
  const L = () => O.taskLab;
  const ICON = "assets/taskmgr/trail-icon.svg";

  const sections = [
    { slug: "open", kicker: "Unidade 1 · Missões 1–2", title: "Abrir e entender", description: "Abrir pela barra de tarefas e ler os grupos da aba Processos.", orders: [1, 2], icon: "apps" },
    { slug: "hung", kicker: "Unidade 2 · Missões 3–5", title: "Programas travados", description: "O X que não fecha, o PID certo e o Windows Explorer.", orders: [3, 4, 5], icon: "dismiss_circle" },
    { slug: "slow", kicker: "Unidade 3 · Missões 6–9", title: "Computador lento", description: "CPU em 100%, memória cheia, Modo de eficiência e Desempenho.", orders: [6, 7, 8, 9], icon: "top_speed" },
    { slug: "boot", kicker: "Unidade 4 · Missões 10–12", title: "Inicialização", description: "Programas que abrem sozinhos, reinício e o chamado final.", orders: [10, 11, 12], icon: "timer" },
  ];

  /** animação curta e em loop: cursor vai até um espaço vazio da barra, zoom, toque com dois dedos e o menu abre */
  function howTo() {
    const bar = ["assets/icons/start.png", "assets/icons/search.png", "assets/icons/explorer.png", "assets/browser/chrome.svg", "assets/icons/settings.png"];
    return `<figure class="tl-howto" aria-label="Como abrir o Gerenciador de Tarefas: botão direito em um espaço vazio da barra de tarefas e depois Gerenciador de Tarefas">
      <div class="tl-stage" aria-hidden="true"><div class="tl-zoom">
        <div class="tl-window"><i></i><i></i><i></i></div>
        <div class="tl-bar"><span class="tl-icons">${bar.map((src) => `<img src="${src}" alt="" />`).join("")}</span><span class="tl-empty"></span><span class="tl-clock">10:30</span></div>
        <div class="tl-menu"><span class="is-target"><img src="assets/icons/taskmanager.png" alt="" />Gerenciador de Tarefas</span><span><img src="assets/icons/settings.png" alt="" />Configurações da barra de tarefas</span></div>
        <i class="tl-ring"></i><i class="tl-click"></i>
        <img class="tl-cursor" src="assets/icons/taskmanager/fluent/cursor.svg" alt="" />
      </div>
      <div class="tl-pad"><span class="tl-pad-surface"><i></i><i></i></span><small>2 dedos</small></div></div>
      <figcaption><ol><li>Espaço <b>vazio</b> da barra de tarefas</li><li><b>Botão direito</b>: toque com 2 dedos no touchpad</li><li>Clique em <b>Gerenciador de Tarefas</b></li></ol></figcaption>
    </figure>`;
  }

  // ---------------- página da trilha ----------------
  const records = new Set();
  let selectedId = null;
  function trail(record) {
    records.add(record);
    const missions = L().getMissions(), progress = L().getProgress(), done = Object.keys(progress.completed).length, T = L().TOTAL;
    if (!selectedId || missions.find((m) => m.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find((m) => m.status === "available")?.id || missions[0].id;
    const m = missions.find((x) => x.id === selectedId), active = progress.active?.id === selectedId ? progress.active : null;
    const actions = active && !active.suspended ? active.phase === "completed" ? `<button data-tl="repeat">Refazer</button><button class="learning-primary" data-tl="next">${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>` : '<button class="learning-primary" data-tl="continue">Continuar no sistema</button><button data-tl="tool">Abrir ferramenta</button><button data-tl="restart">Reiniciar missão</button>' : `<button class="learning-primary" data-tl="start" ${m.status === "locked" ? "disabled" : ""}>${active?.suspended ? "Retomar missão" : progress.completed[m.id] ? "Praticar novamente" : "Iniciar missão"}</button>`;
    record.content.innerHTML = `<section class="learning-page drivers-trail-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="${ICON}" alt="" /></span><div><small>OSLAB · TRILHA PRÁTICA</small><h1>Gerenciador de Tarefas</h1><p>Programa travado, computador lento e programas que abrem sozinhos: resolva tudo pelo Gerenciador, como um técnico.</p></div></div><div class="learning-stats"><span><strong>${done}/${T}</strong><small>concluídas</small></span><span><strong>${progress.totalScore}/${T * 10}</strong><small>pontos</small></span><div class="learning-progress"><i style="width:${(done / T) * 100}%"></i></div></div></header><div class="learning-toolbar"><span>${progress.active?.suspended ? "Missão pausada. Retome para continuar." : "Seu progresso é salvo neste computador, mesmo se reiniciar."}</span><button data-tl="reset">${O.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="Missões do Gerenciador de Tarefas">${done === T ? `<section class="wifi-finale"><img src="${ICON}" alt="" /><h2>Técnico do Gerenciador aprovado!</h2><p>Você fecha programa travado, acha o que deixa o PC lento e controla o que abre com o Windows.</p><strong>${T}/${T} missões · ${T * 10} pontos</strong></section>` : ""}${O.learningPath.renderSections(missions, sections, selectedId, "task-mission")}</main><aside class="learning-detail-panel"><div class="learning-detail-icon is-${m.status}"><img src="${m.icon}" alt="" /></div><div class="learning-detail-heading"><small>Missão ${String(m.order).padStart(2, "0")} · ${safe(m.difficulty)}</small><h2>${safe(m.title)}</h2><span class="learning-status is-${m.status}">${O.learningPath.statusLabel(m.status, true)}</span></div><p class="learning-description">${safe(m.description)}</p><section class="learning-goal"><h3>Aprenda fazendo</h3><p>${safe(m.goal)}</p></section><div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, active)}<p class="learning-description">Depois da prática, responda à pergunta no robô para concluir.</p><div class="learning-detail-actions">${actions}</div></aside></div></section>`;
    record.address.textContent = "Gerenciador de Tarefas";
    if (record.tlWired) return; record.tlWired = true;
    record.content.addEventListener("click", async (event) => {
      const pick = event.target.closest("[data-task-mission-select]")?.dataset.taskMissionSelect;
      if (pick) { selectedId = pick; trail(record); return; }
      const a = event.target.closest("[data-tl]")?.dataset.tl;
      if (a === "start") {
        const m = L().getMissions().find((x) => x.id === selectedId);
        if (m?.status === "completed" && !await O.ui.confirm({ title: "Refazer missão?", message: "A tentativa desta missão começa de novo.", confirmLabel: "Refazer" })) return;
        if (L().start(selectedId).ok) O.windowManager.minimize(record.windowId);
      }
      if (a === "continue") { O.assistantRobot.expand(); O.windowManager.minimize(record.windowId); }
      if (a === "tool") { event.stopPropagation(); openTool(); }
      if (a === "repeat") L().finish("repeat");
      if (a === "next") L().finish("next");
      if (a === "restart") L().restart();
      if (a === "reset" && await O.ui.confirm({ title: "Redefinir a trilha do Gerenciador?", message: "As conclusões, a tentativa atual e os pontos desta trilha serão apagados. Os programas de inicialização voltam ao padrão.", confirmLabel: "Redefinir" })) { L().reset(); selectedId = null; trail(record); }
    });
  }
  /** "Abrir ferramenta": na missão 1 só destaca a barra de tarefas (o aluno precisa fazer o caminho) */
  function openTool() {
    const m = O.taskMgrMissionCatalog.find((x) => x.id === L().getProgress().active?.id);
    if (!m) return;
    if (m.tool === "taskbar") { document.body.classList.remove("is-taskbar-hint"); void document.body.offsetWidth; document.body.classList.add("is-taskbar-hint"); global.setTimeout(() => document.body.classList.remove("is-taskbar-hint"), 4200); return; }
    const record = O.shell.openApp("taskmanager");
    const page = { 6: "performance", 9: "performance", 10: "startup", 11: "startup" }[m.order];
    if (record && page && record.taskNav !== page) { record.taskNav = page; O.events.emit("taskmanager:nav", { page }, "taskManager"); O.taskManagerApp.render(record); }
  }

  // ---------------- robô ----------------
  function recordForm(m, a) {
    const sel = (name, label, opts) => `<label>${label}<select name="${name}" required><option value="">Selecione</option>${opts.map((o) => `<option>${o}</option>`).join("")}</select></label>`;
    const groups = ["Aplicativos", "Processos em segundo plano", "Processos do Windows"];
    const fields = m.order === 2
      ? sel("chrome", "Google Chrome está em…", groups) + sel("antimalware", "Antimalware Service Executable está em…", groups) + sel("dwm", "Gerenciador de Janelas da Área de Trabalho está em…", groups)
      : sel("cpu", "Processador (CPU)", ["Intel(R) Celeron(R) N4500", "Intel(R) Core(TM) i7-12700", "AMD Ryzen 5 5600"]) + sel("memory", "Memória total", ["2,0 GB", "4,0 GB", "8,0 GB", "16,0 GB"]) + sel("disk", "Tipo do Disco 0 (C:)", ["HD", "SSD"]);
    return `<form class="wifi-record-form" data-task-record-form><h3>Registre o que encontrou</h3>${fields}<button type="submit">Conferir</button>${a.recordFeedback ? `<div class="wifi-answer-feedback ${a.recordFeedback.ok ? "is-correct" : "is-wrong"}" role="status">${safe(a.recordFeedback.text)}</div>` : ""}</form>`;
  }
  function quiz(m, a) {
    const f = a.feedback;
    return `<section class="wifi-question" aria-label="Pergunta da missão"><h3>Antes de continuar</h3><p>${safe(m.quiz.text)}</p><div class="wifi-question-options">${m.quiz.options.map((o, i) => `<button type="button" data-task-answer="${i}" class="${f?.index === i ? f.correct ? "is-correct" : "is-wrong" : ""}" ${a.phase === "completed" ? "disabled" : ""}>${safe(o)}</button>`).join("")}</div>${f ? `<div class="wifi-answer-feedback ${f.correct ? "is-correct" : "is-wrong"}" role="status"><strong>${f.correct ? "Resposta correta!" : "Ainda não. Tente novamente."}</strong> ${safe(f.text)}</div>` : "<p>Escolha uma opção.</p>"}</section>`;
  }
  function assistantView() {
    const a = L()?.getProgress?.().active;
    if (!a || a.suspended) return null;
    const m = O.taskMgrMissionCatalog.find((x) => x.id === a.id), completed = a.phase === "completed", T = L().TOTAL;
    const step = m.steps.find((x) => !a.checklist[x.objectiveId]), icon = O.learningPath.actionIcon;
    const boot = m.order === 11 && a.after != null ? `<div class="wifi-answer-feedback is-correct">Inicialização: antes ${a.before} s · agora ${a.after} s</div>` : "";
    return {
      kind: "task-lab", mascot: completed ? "celebrate" : a.notice || a.hintsUsed || a.feedback?.correct === false ? "help" : "neutral",
      eyebrow: `Gerenciador de Tarefas · Missão ${m.order}/${T}`, title: m.title,
      message: a.phase === "practice" ? step?.text || "Tudo feito. Confira o resultado." : completed ? "Prática e pergunta concluídas. Você ganhou 10 pontos!" : "Você fez a prática. Agora confira o que aprendeu.",
      body: a.phase === "practice" ? `${a.notice ? `<div class="wifi-answer-feedback is-wrong" role="status">${safe(a.notice)}</div>` : ""}${howTo()}<div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, a)}${m.order === 2 || m.order === 9 ? recordForm(m, a) : ""}${a.lastHint ? `<div class="wifi-answer-feedback">Dica ${a.hintsUsed}/3: ${safe(a.lastHint)}</div>` : ""}` : `${boot}${quiz(m, a)}${howTo()}`,
      actions: completed ? `<button data-assistant-action="task-open">${icon("target_arrow")}Ver trilha</button><button data-assistant-action="task-repeat">${icon("arrow_reset")}Refazer</button><button class="is-primary" data-assistant-action="task-next">${icon("arrow_right")}${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>`
        : `<button data-assistant-action="task-tool">${icon("apps")}${m.tool === "taskbar" ? "Mostrar a barra" : "Abrir Gerenciador"}</button><button data-assistant-action="task-hint" ${a.phase !== "practice" ? "disabled" : ""}>${icon("lightbulb")}${a.hintsUsed >= 3 ? "Rever dica 3/3" : `Dica ${a.hintsUsed + 1}/3`}</button><button data-assistant-action="task-restart">${icon("arrow_reset")}Reiniciar missão</button><button data-assistant-action="task-pause">${icon("pause")}Pausar</button>`,
    };
  }

  L().subscribe((p, reason) => { if (reason === "started") selectedId = p.active?.id || selectedId; records.forEach((r) => (r.element?.isConnected ? trail(r) : records.delete(r))); });
  O.taskLabApps = { ids: new Set(["tasklab"]), render(record) { if (record.appId === "tasklab") trail(record); } };
  O.taskLabApp = { assistantView, openTool, howTo };
})(window);
