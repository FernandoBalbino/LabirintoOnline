(function createStoreTrailApp(global) {
  "use strict";
  // Página da trilha Microsoft Store e o robô (com o e-mail e a senha das contas de demonstração).
  const O = global.OSLab;
  const safe = (value) => O.ui.escapeHtml(value);
  const L = () => O.storeLab;
  const ICON = "assets/store/trail-icon.svg";
  const sections = [
    { slug: "loja", kicker: "Unidade 1", title: "Conhecer a loja", orders: [1, 2, 3], icon: "apps" },
    { slug: "contas", kicker: "Unidade 2", title: "Apps com conta", orders: [4, 5, 6], icon: "people" },
    { slug: "mais", kicker: "Unidade 3", title: "Mais aplicativos", orders: [7, 8, 9], icon: "globe_search" },
    { slug: "cuidados", kicker: "Unidade 4", title: "Cuidados", orders: [10, 11, 12], icon: "shield_checkmark" },
  ];
  const records = new Set();
  let selectedId = null;
  function render(record) {
    records.add(record);
    const missions = L().getMissions(), progress = L().getProgress(), done = Object.keys(progress.completed).length, T = L().TOTAL;
    if (!selectedId || missions.find((m) => m.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find((m) => m.status === "available")?.id || missions[0].id;
    const m = missions.find((x) => x.id === selectedId), active = progress.active?.id === selectedId ? progress.active : null;
    const actions = active && !active.suspended ? active.phase === "completed" ? `<button data-sl="repeat">Refazer</button><button class="learning-primary" data-sl="next">${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>` : '<button class="learning-primary" data-sl="continue">Continuar no sistema</button><button data-sl="restart">Reiniciar missão</button>' : `<button class="learning-primary" data-sl="start" ${m.status === "locked" ? "disabled" : ""}>${active?.suspended ? "Retomar missão" : progress.completed[m.id] ? "Praticar novamente" : "Iniciar missão"}</button>`;
    record.content.innerHTML = `<section class="learning-page drivers-trail-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="${ICON}" alt="" /></span><div><small>OSLAB · TRILHA PRÁTICA</small><h1>Microsoft Store</h1><p>Aprenda a baixar aplicativos pela loja oficial do Windows: pesquisar, conferir, instalar, entrar, atualizar e desinstalar.</p></div></div><div class="learning-stats"><span><strong>${done}/${T}</strong><small>concluídas</small></span><span><strong>${progress.totalScore}/${T * 10}</strong><small>pontos</small></span><div class="learning-progress"><i style="width:${(done / T) * 100}%"></i></div></div></header><div class="learning-toolbar"><span>${progress.active?.suspended ? "Missão pausada. Retome para continuar." : "Seu progresso é salvo neste computador."}</span><button data-sl="reset">${O.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="Missões da Microsoft Store">${done === T ? `<section class="wifi-finale"><img src="${ICON}" alt="" /><h2>Especialista em Microsoft Store!</h2><p>Você sabe pesquisar, conferir, instalar, atualizar e desinstalar aplicativos com segurança.</p><strong>${T}/${T} missões · ${T * 10} pontos</strong></section>` : ""}${O.learningPath.renderSections(missions, sections, selectedId, "store-mission")}</main><aside class="learning-detail-panel"><div class="learning-detail-icon is-${m.status}"><img src="${m.icon}" alt="" /></div><div class="learning-detail-heading"><small>Missão ${String(m.order).padStart(2, "0")} · ${safe(m.difficulty)}</small><h2>${safe(m.title)}</h2><span class="learning-status is-${m.status}">${O.learningPath.statusLabel(m.status, true)}</span></div><section class="learning-goal"><h3>Aprenda fazendo</h3><p>${safe(m.goal)}</p></section><div class="learning-detail-actions">${actions}</div></aside></div></section>`;
    record.address.textContent = "Microsoft Store";
    if (record.slWired) return; record.slWired = true;
    record.content.addEventListener("click", async (event) => {
      const pick = event.target.closest("[data-store-mission-select]")?.dataset.storeMissionSelect;
      if (pick) { selectedId = pick; render(record); return; }
      const a = event.target.closest("[data-sl]")?.dataset.sl;
      if (a === "start") { const mm = L().getMissions().find((x) => x.id === selectedId); if (mm?.status === "completed" && !await O.ui.confirm({ title: "Refazer missão?", message: "A missão começa de novo do zero.", confirmLabel: "Refazer" })) return; if (L().start(selectedId).ok) O.windowManager.minimize(record.windowId); }
      if (a === "continue") { O.assistantRobot.expand(); O.windowManager.minimize(record.windowId); }
      if (a === "repeat") L().finish("repeat");
      if (a === "next") L().finish("next");
      if (a === "restart" && await confirmRestart()) L().restart();
      if (a === "reset" && await O.ui.confirm({ title: "Redefinir a trilha da Microsoft Store?", message: "As conclusões, a tentativa atual e os pontos desta trilha serão apagados. Os aplicativos instalados continuam.", confirmLabel: "Redefinir" })) { L().reset(); selectedId = null; render(record); }
    });
  }
  const confirmRestart = () => O.ui.confirm({ title: "Reiniciar a missão?", message: "Tudo volta ao começo desta missão: os passos são zerados e os aplicativos voltam ao estado inicial (desinstalados ou instalados, como a missão pede). Use quando algo deu errado.", confirmLabel: "Reiniciar missão" });

  function recordForm(m, a) {
    const sel = (name, label, opts) => `<label>${label}<select name="${name}" required><option value="">Selecione</option>${opts.map((o) => `<option>${o}</option>`).join("")}</select></label>`;
    const fields = m.order === 2
      ? sel("publisher", "Editor do ChatGPT", ["Microsoft Corporation", "OpenAI", "Google"]) + sel("price", "Preço", ["Gratuito", "R$ 11,07", "R$ 99,60"]) + sel("rating", "Nota dos usuários", ["3,5", "4,0", "4,7"])
      : sel("forza", "Preço do Forza Horizon 5", ["Gratuito", "R$ 11,07", "R$ 99,60"]) + sel("minecraft", "Idade do Minecraft Launcher", ["Livre", "10 anos", "12 anos", "14 anos"]);
    return `<form class="wifi-record-form" data-store-record-form><h3>Registre o que encontrou</h3>${fields}<button type="submit">Conferir</button>${a.recordFeedback ? `<div class="wifi-answer-feedback ${a.recordFeedback.ok ? "is-correct" : "is-wrong"}" role="status">${safe(a.recordFeedback.text)}</div>` : ""}</form>`;
  }
  function credentials(m) {
    const c = O.storeApps?.CREDENTIALS?.[m.app];
    return c ? `<div class="sl-cred"><strong>Conta de demonstração</strong><span>E-mail <code>${c.email}</code></span><span>Senha <code>${c.password}</code></span></div>` : "";
  }
  function quiz(m, a) {
    const f = a.feedback;
    return `<section class="wifi-question" aria-label="Pergunta da missão"><h3>Antes de continuar</h3><p>${safe(m.quiz.text)}</p><div class="wifi-question-options">${m.quiz.options.map((o, i) => `<button type="button" data-store-answer="${i}" class="${f?.index === i ? f.correct ? "is-correct" : "is-wrong" : ""}" ${a.phase === "completed" ? "disabled" : ""}>${safe(o)}</button>`).join("")}</div>${f ? `<div class="wifi-answer-feedback ${f.correct ? "is-correct" : "is-wrong"}" role="status"><strong>${f.correct ? "Resposta correta!" : "Ainda não. Tente novamente."}</strong> ${safe(f.text)}</div>` : "<p>Escolha uma opção.</p>"}</section>`;
  }
  function assistantView() {
    const a = L()?.getProgress?.().active;
    if (!a || a.suspended) return null;
    const m = O.storeMissionCatalog.find((x) => x.id === a.id), completed = a.phase === "completed", T = L().TOTAL;
    const step = m.steps.find((x) => !a.checklist[x.objectiveId]), icon = O.learningPath.actionIcon;
    return {
      kind: "store-lab", mascot: completed ? "celebrate" : a.notice || a.hintsUsed || a.feedback?.correct === false ? "help" : "neutral",
      eyebrow: `Microsoft Store · Missão ${m.order}/${T}`, title: m.title,
      message: a.phase === "practice" ? step?.text || "Tudo feito. Confira o resultado." : completed ? "Prática e pergunta concluídas. Você ganhou 10 pontos!" : "Você fez a prática. Agora confira o que aprendeu.",
      body: a.phase === "practice" ? `${a.notice ? `<div class="wifi-answer-feedback is-wrong" role="status">${safe(a.notice)}</div>` : ""}${credentials(m)}<div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, a)}${m.order === 2 || m.order === 10 ? recordForm(m, a) : ""}${a.lastHint ? `<div class="wifi-answer-feedback">Dica ${a.hintsUsed}/3: ${safe(a.lastHint)}</div>` : ""}` : quiz(m, a),
      actions: completed ? `<button data-assistant-action="store-open">${icon("target_arrow")}Ver trilha</button><button data-assistant-action="store-repeat">${icon("arrow_reset")}Refazer</button><button class="is-primary" data-assistant-action="store-next">${icon("arrow_right")}${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>`
        : `<button data-assistant-action="store-tool">${icon("apps")}Abrir a loja</button><button data-assistant-action="store-hint" ${a.phase !== "practice" ? "disabled" : ""}>${icon("lightbulb")}${a.hintsUsed >= 3 ? "Rever dica 3/3" : `Dica ${a.hintsUsed + 1}/3`}</button><button data-assistant-action="store-restart">${icon("arrow_reset")}Reiniciar missão</button><button data-assistant-action="store-pause">${icon("pause")}Pausar</button>`,
    };
  }
  async function action(name, event) {
    if (name === "store-open") O.shell.openApp("storelab");
    if (name === "store-tool") { event?.stopPropagation(); O.shell.openApp("msstore"); }
    if (name === "store-hint") L().useHint();
    if (name === "store-restart" && await confirmRestart()) L().restart();
    if (name === "store-repeat") L().finish("repeat");
    if (name === "store-next") L().finish("next");
    if (name === "store-pause") { L().stop(); O.shell.openApp("storelab"); }
  }
  L().subscribe((p, reason) => { if (reason === "started") selectedId = p.active?.id || selectedId; records.forEach((r) => (r.element?.isConnected ? render(r) : records.delete(r))); });
  O.storeTrailApp = { render, assistantView, action };
})(window);
