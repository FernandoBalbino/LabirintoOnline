(function createMissionsApp(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const sections = [
    { slug: "primeiros-passos", kicker: "Unidade 1 · Missões 1–2", title: "Primeiros passos", description: "Aprenda a abrir aplicativos e controlar janelas.", orders: [1, 2], icon: "play" },
    { slug: "arquivos-pastas", kicker: "Unidade 2 · Missões 3–8", title: "Arquivos e pastas", description: "Crie, mova, copie, recupere e encontre documentos.", orders: [3, 4, 5, 6, 7, 8], icon: "folder_add" },
    { slug: "personalizacao", kicker: "Unidade 3 · Missões 9–10", title: "Personalização", description: "Ajuste o ambiente para cada situação.", orders: [9, 10], icon: "paint_brush" },
    { slug: "diagnostico-seguranca", kicker: "Unidade 4 · Missões 11–12", title: "Diagnóstico e segurança", description: "Resolva falhas e organize o sistema com autonomia.", orders: [11, 12], icon: "shield_checkmark" },
  ];
  let selectedId = null;
  let lastActiveId = null;

  function safe(value) { return OSLab.learningPath.safe(value); }
  function statusLabel(status) { return OSLab.learningPath.statusLabel(status, true); }
  function completedObjectives(selected, progress) {
    if (selected.status === "completed") return Object.fromEntries(selected.objectives.map((objective) => [objective.id, true]));
    return progress.active?.id === selected.id ? progress.active.checklist : {};
  }
  function detailMarkup(selected, progress) {
    const done = completedObjectives(selected, progress);
    const result = progress.completed[selected.id];
    const hint = progress.active?.id === selected.id ? OSLab.missions.getHint() : null;
    const blocked = selected.status === "locked";
    const primaryLabel = selected.status === "completed" ? "Refazer missão" : selected.status === "active" ? "Continuar no sistema" : blocked ? "Missão bloqueada" : "Iniciar missão";
    const primaryAction = selected.status === "active" ? "continue" : "start";
    return `<aside class="learning-detail-panel mission-detail" aria-live="polite">
      <div class="learning-detail-icon is-${selected.status}"><img src="${safe(selected.icon)}" alt="" /></div>
      <div class="learning-detail-heading"><span class="learning-status is-${selected.status}"><img src="${OSLab.learningPath.statusIcon(selected.status)}" alt="" />${statusLabel(selected.status)}</span><small>Missão ${String(selected.order).padStart(2, "0")}</small><h2>${safe(selected.title)}</h2><div class="learning-chips"><span>${safe(selected.categories[0])}</span><span>${safe(selected.difficulty)}</span></div></div>
      <p class="learning-description">${safe(selected.description)}</p>
      <section class="learning-objectives"><h3>O que você vai fazer</h3><ul>${selected.objectives.map((objective) => `<li class="${done?.[objective.id] ? "is-done" : ""}"><img src="${OSLab.learningPath.icon(done?.[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul></section>
      ${blocked ? `<div class="learning-locked-note"><img src="${OSLab.learningPath.icon("lock_closed")}" alt="" /><span><strong>Conclua a etapa atual</strong>A trilha libera uma missão por vez para que nenhum conceito importante seja pulado.</span></div>` : ""}
      ${result ? `<div class="learning-result-summary"><span><strong>${Number(result.score) || 0}</strong>pontos</span><span><strong>${Number(result.hintsUsed) || 0}</strong>dica usada</span><span><strong>${Number(result.mistakes) || 0}</strong>erros</span></div>` : ""}
      ${OSLab.learningPath.renderHint(hint, "Dica da missão")}
      <div class="learning-detail-actions"><button class="learning-primary" type="button" data-mission-action="${primaryAction}" ${blocked ? "disabled" : ""}>${OSLab.learningPath.actionIcon(selected.status === "completed" ? "arrow_reset" : "play")}${primaryLabel}</button>${selected.status === "active" ? `<button type="button" data-mission-action="hint">${OSLab.learningPath.actionIcon("lightbulb")}${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-mission-action="restart">${OSLab.learningPath.actionIcon("arrow_reset")}Reiniciar</button>` : ""}</div>
    </aside>`;
  }

  function render(record) {
    records.add(record);
    const missions = OSLab.missions.getMissions();
    const progress = OSLab.missions.getProgress();
    if (progress.active?.id && progress.active.id !== lastActiveId) selectedId = progress.active.id;
    lastActiveId = progress.active?.id || null;
    if (!selectedId || !missions.some((mission) => mission.id === selectedId && mission.status !== "locked")) {
      selectedId = progress.active?.id || missions.find((mission) => mission.status === "available")?.id || missions.find((mission) => mission.status === "completed")?.id || missions[0].id;
    }
    const selected = missions.find((mission) => mission.id === selectedId) || missions[0];
    const completedCount = missions.filter((mission) => mission.status === "completed").length;
    const nextMission = missions.find((mission) => mission.status === "active") || missions.find((mission) => mission.status === "available");
    record.address.textContent = "Trilha de Missões";
    record.content.innerHTML = `<section class="learning-page missions-page">
      <header class="learning-hero">
        <div class="learning-hero-copy"><span class="learning-app-mark"><img src="${OSLab.learningPath.icon("target_arrow")}" alt="" /></span><div><small>OSLab · Trilha de Missões</small><h1>Aprenda fazendo, uma etapa por vez</h1><p>Explore o sistema simulado, conclua objetivos reais e acompanhe cada conquista.</p></div></div>
        <div class="learning-stats" aria-label="Progresso das missões"><span><img src="${OSLab.learningPath.icon("checkmark_circle")}" alt="" /><strong>${completedCount}/12</strong><small>concluídas</small></span><span><img src="${OSLab.learningPath.icon("trophy")}" alt="" /><strong>${Number(progress.totalScore) || 0}</strong><small>pontos</small></span><span><img src="${OSLab.learningPath.icon("ribbon")}" alt="" /><strong>${progress.medals.length}</strong><small>medalhas</small></span><div class="learning-progress"><i style="width:${Math.round(completedCount / 12 * 100)}%"></i></div></div>
      </header>
      <div class="learning-toolbar"><span>${nextMission ? `Próxima etapa: <strong>${safe(nextMission.title)}</strong>` : "Trilha concluída: todas as missões foram vencidas."}</span><button type="button" data-mission-action="reset-progress">${OSLab.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div>
      <div class="learning-layout"><main class="learning-trail-scroller" aria-label="Trilha de missões">${OSLab.learningPath.renderSections(missions, sections, selected.id, "mission")}</main>${detailMarkup(selected, progress)}</div>
    </section>`;

    if (!record.missionsWired) {
      record.missionsWired = true;
      record.content.addEventListener("click", async (event) => {
        const select = event.target.closest("[data-mission-select]")?.dataset.missionSelect;
        const action = event.target.closest("[data-mission-action]")?.dataset.missionAction;
        if (select) {
          selectedId = select;
          render(record);
          window.requestAnimationFrame(() => record.content.querySelector(`[data-mission-select="${CSS.escape(select)}"]`)?.focus());
          return;
        }
        if (!action) return;
        if (action === "start") {
          const selectedMission = OSLab.missions.getMissions().find((mission) => mission.id === selectedId);
          if (!selectedMission || selectedMission.status === "locked") return;
          if (selectedMission.status === "completed" && !await OSLab.ui.confirm({ title: "Refazer missão?", message: "Um novo cenário será preparado e a melhor pontuação continuará registrada.", confirmLabel: "Refazer" })) return;
          const started = OSLab.missions.start(selectedId);
          if (started.ok) OSLab.windowManager?.minimize?.(record.windowId);
          renderAll();
        }
        if (action === "continue") OSLab.windowManager?.minimize?.(record.windowId);
        if (action === "hint") { OSLab.missions.useHint(); renderAll(); OSLab.assistantRobot?.expand?.(); }
        if (action === "restart" && await OSLab.ui.confirm({ title: "Reiniciar missão?", message: "O cenário atual será limpo e preparado novamente.", confirmLabel: "Reiniciar" })) OSLab.missions.restart();
        if (action === "reset-progress" && await OSLab.ui.confirm({ title: "Redefinir todo o progresso?", message: "Pontuações, medalhas e cenários das missões serão removidos.", confirmLabel: "Redefinir" })) { OSLab.missions.resetProgress(); selectedId = null; }
      });
    }
    OSLab.assistantRobot?.render?.();
  }

  function renderAll() { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  OSLab.missions.subscribe(renderAll);
  OSLab.missionsApp = { render, renderAll };
})(window);
