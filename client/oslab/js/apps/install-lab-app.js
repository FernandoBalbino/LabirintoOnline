(function createInstallLabApp(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const sections = [
    { slug: "pesquisa", kicker: "Unidade 1 · Missões 1–3", title: "Pesquisar com segurança", description: "Abra o navegador, pesquise e escolha o site correto.", orders: [1, 2, 3], icon: "globe_search" },
    { slug: "appjavafx", kicker: "Unidade 2 · Missões 4–8", title: "Instalar um arquivo .exe", description: "Baixe, acompanhe, instale e abra o AppJavaFX.", orders: [4, 5, 6, 7, 8], icon: "window_wrench" },
    { slug: "office", kicker: "Unidade 3 · Missões 9–11", title: "Instalar um pacote", description: "Instale e teste Word, Excel e Apresentações Slides.", orders: [9, 10, 11], icon: "apps" },
    { slug: "remocao", kicker: "Unidade 4 · Missão 12", title: "Remover com segurança", description: "Use o Painel de Controle e confira a limpeza dos atalhos.", orders: [12], icon: "dismiss_circle" },
  ];
  let selectedId = null;
  let lastActiveId = null;

  function safe(value) { return OSLab.learningPath.safe(value); }
  function finalMarkup(progress) {
    if (Object.keys(progress.completed).length !== 12) return "";
    return `<section class="install-lab-finale"><img src="assets/learning/mascot/oslab-mascot-celebrate.png" alt="Mascote do OSLAB celebrando" /><small>12 / 12 MISSÕES</small><h2>Trilha concluída!</h2><p>Você aprendeu a pesquisar, baixar, instalar, executar e desinstalar programas no Windows.</p><div><span>Pesquisa simulada</span><span>Downloads .exe</span><span>Instalação e atalhos</span><span>Programas e Recursos</span></div></section>`;
  }

  function detailMarkup(selected, progress) {
    const active = progress.active?.id === selected.id ? progress.active : null;
    const result = progress.completed[selected.id];
    const hint = active ? OSLab.installLab.getHint() : null;
    const blockedBy = selected.status === "locked" ? OSLab.installLab.getMissions().find((mission) => mission.order < selected.order && mission.status !== "completed") : null;
    const label = selected.status === "completed" ? "Refazer missão" : selected.status === "active" ? "Continuar no sistema" : selected.status === "locked" ? "Missão bloqueada" : "Iniciar missão";
    const action = selected.status === "active" ? "continue" : "start";
    return `<aside class="learning-detail-panel install-lab-detail" aria-live="polite">
      <div class="learning-detail-icon is-${selected.status}"><img src="${safe(selected.icon)}" alt="" /></div>
      <div class="learning-detail-heading"><span class="learning-status is-${selected.status}"><img src="${OSLab.learningPath.statusIcon(selected.status)}" alt="" />${OSLab.learningPath.statusLabel(selected.status, true)}</span><small>Missão ${String(selected.order).padStart(2, "0")}</small><h2>${safe(selected.title)}</h2><div class="learning-chips"><span>${safe(selected.category)}</span><span>${safe(selected.difficulty)}</span></div></div>
      <p class="learning-description">${safe(selected.description)}</p>
      <section class="learning-goal"><h3>Objetivo</h3><p>${safe(selected.goal)}</p><strong>${safe(selected.instruction)}</strong></section>
      <section class="learning-objectives"><h3>Progresso automático</h3><ul>${selected.objectives.map((objective) => { const done = selected.status === "completed" || Boolean(active?.checklist?.[objective.id]); return `<li class="${done ? "is-done" : ""}"><img src="${OSLab.learningPath.icon(done ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`; }).join("")}</ul></section>
      ${blockedBy ? `<div class="learning-locked-note"><img src="${OSLab.learningPath.icon("lock_closed")}" alt="" /><span><strong>Missão bloqueada</strong>Conclua primeiro ${safe(blockedBy.title)}.</span></div>` : ""}
      ${result ? `<div class="install-mission-result"><img src="${OSLab.learningPath.icon("checkmark_circle")}" alt="" /><p><strong>Missão concluída</strong>${safe(result.explanation || selected.success)}</p></div>` : ""}
      ${hint?.visualLabel ? `<div class="install-visual-hint"><img src="${OSLab.learningPath.icon("target_arrow")}" alt="" /><span><strong>Dica visual ativada</strong>${safe(hint.visualLabel)} será destacado na tela correspondente.</span></div>` : ""}
      ${OSLab.learningPath.renderHint(hint, "Dica da missão")}
      <div class="learning-detail-actions"><button class="learning-primary" type="button" data-install-lab-action="${action}" ${selected.status === "locked" ? "disabled" : ""}>${OSLab.learningPath.actionIcon(selected.status === "completed" ? "arrow_reset" : "play")}${label}</button>${active && active.phase !== "completed" ? `<button type="button" data-install-lab-action="hint">${OSLab.learningPath.actionIcon("lightbulb")}${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-install-lab-action="open-tool">${OSLab.learningPath.actionIcon(selected.order === 12 ? "apps" : "globe_search")}${selected.order === 12 ? "Painel de Controle" : "Navegador"}</button>` : ""}</div>
    </aside>`;
  }

  function render(record) {
    records.add(record);
    const missions = OSLab.installLab.getMissions();
    const progress = OSLab.installLab.getProgress();
    const activeId = progress.active?.id || null;
    if (activeId && activeId !== lastActiveId) selectedId = activeId;
    lastActiveId = activeId;
    if (!selectedId || !missions.some((mission) => mission.id === selectedId && mission.status !== "locked")) selectedId = activeId || missions.find((mission) => mission.status === "available")?.id || missions.find((mission) => mission.status === "completed")?.id || missions[0].id;
    const selected = missions.find((mission) => mission.id === selectedId) || missions[0];
    const completed = missions.filter((mission) => mission.status === "completed").length;
    const installed = OSLab.software.getInstalledPrograms().length;
    const downloads = Object.values(OSLab.software.getState().downloads).filter((download) => download.status === "completed").length;
    record.address.textContent = "Instalação e Desinstalação";
    record.content.innerHTML = `<section class="learning-page install-lab-page">
      <header class="learning-hero install-learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="assets/programs/install-lab.svg" alt="" /></span><div><small>OSLAB · Trilha prática</small><h1>Instalação e desinstalação</h1><p>Pesquise, baixe e execute instaladores .exe em uma simulação segura do Windows.</p></div></div><div class="learning-stats"><span><img src="${OSLab.learningPath.icon("checkmark_circle")}" alt="" /><strong>${completed}/12</strong><small>concluídas</small></span><span><img src="${OSLab.learningPath.icon("arrow_counterclockwise")}" alt="" /><strong>${downloads}</strong><small>downloads</small></span><span><img src="${OSLab.learningPath.icon("apps")}" alt="" /><strong>${installed}</strong><small>instalados</small></span><div class="learning-progress"><i style="width:${Math.round(completed / 12 * 100)}%"></i></div></div></header>
      <div class="learning-toolbar"><span>${completed === 12 ? "Percurso concluído: você dominou o ciclo completo de programas." : `Próxima etapa: <strong>${safe(missions.find((mission) => mission.status === "active")?.title || missions.find((mission) => mission.status === "available")?.title || selected.title)}</strong>`}</span><button type="button" data-install-lab-action="reset-progress">${OSLab.learningPath.actionIcon("arrow_reset")}Redefinir trilha</button></div>
      <div class="learning-layout"><main class="learning-trail-scroller" aria-label="Trilha de instalação de programas">${finalMarkup(progress)}${OSLab.learningPath.renderSections(missions, sections, selected.id, "install-mission")}</main>${detailMarkup(selected, progress)}</div>
    </section>`;
    if (!record.installLabWired) {
      record.installLabWired = true;
      record.content.addEventListener("click", async (event) => {
        const select = event.target.closest("[data-install-mission-select]")?.dataset.installMissionSelect;
        const actionName = event.target.closest("[data-install-lab-action]")?.dataset.installLabAction;
        if (select) { selectedId = select; render(record); global.requestAnimationFrame(() => record.content.querySelector(`[data-install-mission-select="${CSS.escape(select)}"]`)?.focus()); return; }
        if (!actionName) return;
        if (actionName === "start") {
          const mission = OSLab.installLab.getMissions().find((entry) => entry.id === selectedId);
          if (!mission || mission.status === "locked") return;
          if (mission.status === "completed" && !await OSLab.ui.confirm({ title: "Refazer missão?", message: "Os objetivos desta tentativa serão reiniciados, mantendo os programas atuais.", confirmLabel: "Refazer" })) return;
          const started = OSLab.installLab.start(selectedId);
          if (started.ok) OSLab.windowManager.minimize(record.windowId);
        }
        if (actionName === "continue") OSLab.windowManager.minimize(record.windowId);
        if (actionName === "hint") { OSLab.installLab.useHint(); OSLab.assistantRobot?.expand?.(); }
        if (actionName === "open-tool") OSLab.shell.openApp(selected.order === 12 ? "controlpanel" : "google");
        if (actionName === "reset-progress" && await OSLab.ui.confirm({ title: "Redefinir a trilha?", message: "As 12 conclusões, downloads e programas instalados pela atividade serão removidos.", confirmLabel: "Redefinir" })) { OSLab.installLab.resetAll(); selectedId = null; }
      });
    }
    OSLab.assistantRobot?.render?.();
  }

  function renderAll() { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  OSLab.installLab.subscribe(renderAll);
  OSLab.software.subscribe(renderAll);
  OSLab.installLabApp = { render, renderAll };
})(window);
