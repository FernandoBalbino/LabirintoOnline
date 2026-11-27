(function createWifiLabApp(global) {
  "use strict";
  const O = global.OSLab, safe = value => O.ui.escapeHtml(value), records = new Set();
  let selectedId = null;
  const sections = [
    { slug: "connect", kicker: "Unidade 1 · Missões 1–4", title: "Vamos conectar", description: "Ative o adaptador, escolha a rede e resolva a senha.", orders: [1, 2, 3, 4], icon: "wifi_1" },
    { slug: "profiles", kicker: "Unidade 2 · Missões 5–8", title: "Conheça sua conexão", description: "Consulte propriedades e gerencie as redes salvas.", orders: [5, 6, 7, 8], icon: "settings" },
    { slug: "diagnose", kicker: "Unidade 3 · Missões 9–10", title: "Sinal e consumo", description: "Melhore a posição do computador e economize dados.", orders: [9, 10], icon: "wrench" },
  ];
  function quizMarkup(mission, active) {
    const feedback = active.feedback;
    return `<section class="wifi-question" aria-label="Pergunta da missão"><h3>Antes de continuar</h3><p>${safe(mission.quiz.text)}</p><div class="wifi-question-options">${mission.quiz.options.map((option, index) => `<button type="button" data-wifi-answer="${index}" class="${feedback?.index === index ? feedback.correct ? "is-correct" : "is-wrong" : ""}" ${active.phase === "completed" ? "disabled" : ""}>${safe(option)}</button>`).join("")}</div>${feedback ? `<div class="wifi-answer-feedback ${feedback.correct ? "is-correct" : "is-wrong"}" role="status"><strong>${feedback.correct ? "Resposta correta!" : "Ainda não. Tente novamente."}</strong> ${safe(feedback.text)}</div>` : '<p>Escolha uma opção para enviar sua resposta.</p>'}</section>`;
  }
  function propertyForm(active) {
    return `<form class="wifi-record-form" data-wifi-record-form><h3>Registre o que encontrou</h3><label>Banda da rede<select name="band" required><option value="">Selecione a banda</option><option>2,4 GHz</option><option>5 GHz</option><option>6 GHz</option></select></label><label>Tipo de segurança<select name="security" required><option value="">Selecione a segurança</option><option>WPA2-Personal</option><option>WPA3-Personal</option><option>Aberta</option></select></label><button type="submit">Verificar informações</button>${active.propertyFeedback ? `<div class="wifi-answer-feedback ${active.propertyCorrect ? "is-correct" : "is-wrong"}" role="status">${safe(active.propertyFeedback)}</div>` : ""}</form>`;
  }
  function assistantView() {
    const progress = O.wifiLab.getProgress(), active = progress.active;
    if (!active || active.suspended) return null;
    const mission = O.wifiMissionCatalog.find(m => m.id === active.id), completed = active.phase === "completed";
    const step = mission.steps.find(step => !active.checklist[step.objectiveId]);
    return {
      kind: "wifi-lab", mascot: completed ? "celebrate" : active.feedback?.correct === false || active.hintsUsed ? "help" : "neutral",
      eyebrow: `Diagnóstico de Wi-Fi · Missão ${mission.order}/10`, title: mission.title,
      message: active.phase === "practice" ? step?.text || mission.goal : completed ? "Prática e pergunta concluídas. Você ganhou 10 pontos!" : "Você realizou a prática. Agora confira o que aprendeu.",
      body: active.phase === "practice" ? `${O.learningPath.renderSteps(mission, active)}${active.id === "wifi-6" ? propertyForm(active) : ""}${active.lastHint ? `<div class="wifi-answer-feedback">Dica ${active.hintsUsed}/3: ${safe(active.lastHint)}</div>` : ""}` : quizMarkup(mission, active),
      actions: completed ? `<button data-assistant-action="wifi-open">${O.learningPath.actionIcon("target_arrow")}Ver trilha</button><button data-assistant-action="wifi-repeat">${O.learningPath.actionIcon("arrow_reset")}Refazer</button><button class="is-primary" data-assistant-action="wifi-next">${O.learningPath.actionIcon("arrow_right")}${mission.order < 10 ? "Próxima missão" : "Ver conclusão"}</button>` : `<button data-assistant-action="wifi-tool">${O.learningPath.actionIcon("apps")}Abrir ferramenta</button><button data-assistant-action="wifi-hint" ${active.phase !== "practice" ? "disabled" : ""}>${O.learningPath.actionIcon("lightbulb")}${active.hintsUsed >= 3 ? "Rever dica 3/3" : `Dica ${active.hintsUsed + 1}/3`}</button><button data-assistant-action="wifi-restart">${O.learningPath.actionIcon("arrow_reset")}Reiniciar</button><button data-assistant-action="wifi-pause">${O.learningPath.actionIcon("pause")}Pausar</button>`,
    };
  }
  function openTool() {
    const order = O.wifiMissionCatalog.find(m => m.id === O.wifiLab.getProgress().active?.id)?.order;
    if (order <= 4) O.shell.openQuickSettings(order >= 3 ? "wifi" : "main");
    else if (order === 9) { const record = O.shell.openApp("wifilab"); record.wifiSignal = true; render(record); O.events.emit("wifi:page-opened", { page: "signal" }, "wifiLabApp"); }
    else O.shell.openSettings("network");
  }
  function signalMarkup() {
    const n = O.network.getSnapshot(), network = n.availableNetworks.find(v => v.ssid === "Escola_Alunos");
    const positions = [["distant", "No fundo da sala", "Distante · duas paredes"], ["wall", "Atrás da parede", "Distância média · uma parede"], ["corridor", "No corredor", "Mais perto · uma parede"], ["near", "Perto do roteador", "Próximo · caminho livre"]];
    return `<section class="wifi-signal-lab"><button class="win-button" data-wifi-lab-action="trail">Voltar à trilha</button><h1>Encontre um sinal melhor</h1><p>Mude a posição do computador. O roteador permanece no mesmo lugar.</p><div class="wifi-room" aria-label="Sala e área de cobertura do Wi-Fi"><div class="wifi-router">${O.wifiUI.img("router")}<span>Roteador · área de cobertura da sala</span></div>${positions.map(([id, title, detail]) => `<button class="wifi-position" data-wifi-position="${id}" aria-pressed="${n.signalPosition === id}">${O.wifiUI.img(n.signalPosition === id ? "computer" : "wifi")}<strong>${title}</strong><small>${detail}</small></button>`).join("")}</div><div class="wifi-signal-meter"><span>Intensidade do sinal</span><meter min="0" max="100" low="35" high="70" optimum="90" value="${network?.signal || 0}">${network?.signal || 0}%</meter><strong>${network?.signal || 0}% · ${network?.signal >= 70 ? "Bom" : network?.signal >= 35 ? "Regular" : "Fraco"}</strong></div><p class="wifi-map-note">Cada posição representa uma distância e quantidade de paredes. Use Tab e Enter ou clique para mover o computador.</p></section>`;
  }
  function render(record) {
    records.add(record);
    const missions = O.wifiLab.getMissions(), progress = O.wifiLab.getProgress(), completed = Object.keys(progress.completed).length;
    if (record.wifiSignal && progress.active?.id === "wifi-9" && !progress.active.suspended) record.content.innerHTML = signalMarkup();
    else {
      record.wifiSignal = false;
      if (!selectedId || missions.find(m => m.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find(m => m.status === "available")?.id || missions[0].id;
      const mission = missions.find(m => m.id === selectedId), active = progress.active?.id === selectedId ? progress.active : null;
      const actions = active && !active.suspended ? active.phase === "completed" ? '<button data-wifi-lab-action="repeat">Refazer</button><button class="learning-primary" data-wifi-lab-action="next">'+(mission.order < 10 ? "Próxima missão" : "Ver conclusão")+'</button>' : '<button class="learning-primary" data-wifi-lab-action="continue">Continuar no sistema</button><button data-wifi-lab-action="tool">Abrir ferramenta</button><button data-wifi-lab-action="restart">Reiniciar missão</button>' : `<button class="learning-primary" data-wifi-lab-action="start" ${mission.status === "locked" ? "disabled" : ""}>${active?.suspended ? "Retomar missão" : progress.completed[mission.id] ? "Praticar novamente" : "Iniciar missão"}</button>`;
      record.content.innerHTML = `<section class="learning-page wifi-trail-page"><header class="learning-hero wifi-learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="assets/wifi/trail-icon.png" alt="" /></span><div><small>OSLAB · TRILHA PRÁTICA</small><h1>Diagnóstico de Wi-Fi</h1><p>Observe, configure e descubra como resolver problemas de conexão.</p></div></div><div class="learning-stats"><span><strong>${completed}/10</strong><small>concluídas</small></span><span><strong>${progress.totalScore}/100</strong><small>pontos</small></span><div class="learning-progress"><i style="width:${completed * 10}%"></i></div></div></header><div class="learning-toolbar"><span>${progress.active?.suspended ? "Missão pausada. Retome para continuar de onde parou." : "Seu progresso é salvo neste dispositivo."}</span><button data-wifi-lab-action="reset">${O.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="As dez missões de Wi-Fi">${completed === 10 ? '<section class="wifi-finale"><img src="assets/wifi/trail-icon.png" alt="" /><h2>Diagnóstico concluído!</h2><p>Você resolveu dez situações de Wi-Fi e confirmou o que aprendeu.</p><strong>10/10 missões · 100 pontos</strong></section>' : ""}${O.learningPath.renderSections(missions, sections, selectedId, "wifi-mission")}</main><aside class="learning-detail-panel"><div class="learning-detail-icon is-${mission.status}"><img src="${mission.icon}" alt="" /></div><div class="learning-detail-heading"><small>Missão ${String(mission.order).padStart(2, "0")}</small><h2>${safe(mission.title)}</h2><span class="learning-status is-${mission.status}">${O.learningPath.statusLabel(mission.status, true)}</span></div><p class="learning-description">${safe(mission.description)}</p><section class="learning-goal"><h3>Aprenda fazendo</h3><p>${safe(mission.goal)}</p></section>${O.learningPath.renderSteps(mission, active)}<p class="learning-description">Depois da prática, responda à pergunta no robô para concluir a missão.</p><div class="learning-detail-actions">${actions}</div></aside></div></section>`;
    }
    record.address.textContent = "Diagnóstico de Wi-Fi";
    if (record.wifiLabWired) return; record.wifiLabWired = true;
    record.content.addEventListener("click", async event => {
      const selection = event.target.closest("[data-wifi-mission-select]")?.dataset.wifiMissionSelect;
      if (selection) { selectedId = selection; render(record); return; }
      const position = event.target.closest("[data-wifi-position]")?.dataset.wifiPosition;
      if (position) { O.network.setSignalPosition(position); return; }
      const action = event.target.closest("[data-wifi-lab-action]")?.dataset.wifiLabAction;
      if (action === "start") { if (O.wifiLab.start(selectedId).ok) O.windowManager.minimize(record.windowId); }
      if (action === "continue") { O.assistantRobot.expand(); O.windowManager.minimize(record.windowId); }
      if (action === "tool") { event.stopPropagation(); openTool(); }
      if (action === "repeat") O.wifiLab.finish("repeat");
      if (action === "next") O.wifiLab.finish("next");
      if (action === "restart") O.wifiLab.restart();
      if (action === "trail") { record.wifiSignal = false; render(record); }
      if (action === "reset" && await O.ui.confirm({ title: "Redefinir Diagnóstico de Wi-Fi?", message: "As conclusões, a tentativa atual e os pontos desta trilha serão apagados.", confirmLabel: "Redefinir" })) { O.wifiLab.reset(); selectedId = null; render(record); }
    });
  }
  function renderAll() { records.forEach(record => record.element?.isConnected ? render(record) : records.delete(record)); }
  O.wifiLab.subscribe((progress, reason) => { if (reason === "started" || reason === "resumed") selectedId = progress.active?.id || selectedId; renderAll(); });
  O.network.subscribe(() => records.forEach(record => { if (record.wifiSignal && record.element?.isConnected) render(record); }));
  O.wifiLabApp = { render, assistantView, openTool };
})(window);
