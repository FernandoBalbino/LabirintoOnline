(function createExercisesApp(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const sections = [
    { slug: "sistema", kicker: "Unidade 1 · Exercícios 1–5", title: "Sistema", description: "Investigue armazenamento, processos, memória e inicialização.", orders: [1, 2, 3, 4, 5], icon: "wrench" },
    { slug: "rede", kicker: "Unidade 2 · Exercícios 6–10", title: "Rede", description: "Recupere conexões e diagnostique falhas de comunicação.", orders: [6, 7, 8, 9, 10], icon: "globe_search" },
  ];
  let selectedId = null;
  let lastSessionId = null;

  function safe(value) { return OSLab.learningPath.safe(value); }
  function detailSteps(selected, session) {
    const completed = selected.status === "completed" || session?.phase === "completed";
    const correcting = completed || ["awaiting-test", "testing"].includes(session?.phase);
    const investigating = completed || Boolean(session);
    return [
      ["Investigar o sintoma e localizar a causa", investigating],
      ["Aplicar a correção na ferramenta adequada", correcting],
      ["Testar novamente e confirmar o resultado", completed],
    ];
  }
  function detailMarkup(selected, progress, session, exercises) {
    const blockedBy = selected.status === "locked" ? exercises.find((exercise) => exercise.order < selected.order && exercise.status !== "completed") : null;
    const activeSession = session?.id === selected.id ? session : null;
    const hint = activeSession ? OSLab.exercises.getHint() : null;
    const result = progress.completed[selected.id];
    const primaryLabel = selected.status === "completed" ? "Refazer exercício" : selected.status === "active" ? "Continuar no sistema" : selected.status === "locked" ? "Exercício bloqueado" : "Iniciar exercício";
    const primaryAction = selected.status === "active" ? "continue" : "start";
    return `<aside class="learning-detail-panel exercise-detail" aria-live="polite">
      <div class="learning-detail-icon is-${selected.status}"><img src="${safe(selected.icon)}" alt="" /></div>
      <div class="learning-detail-heading"><span class="learning-status is-${selected.status}"><img src="${OSLab.learningPath.statusIcon(selected.status)}" alt="" />${OSLab.learningPath.statusLabel(selected.status)}</span><small>Exercício ${String(selected.order).padStart(2, "0")}</small><h2>${safe(selected.title)}</h2><div class="learning-chips"><span>${safe(selected.category)}</span><span>${safe(selected.difficulty)}</span></div></div>
      <p class="learning-description">${safe(selected.description)}</p>
      <section class="learning-goal"><h3>Objetivo geral</h3><p>${safe(selected.goal)}</p></section>
      <section class="learning-objectives"><h3>Etapas da atividade</h3><ul>${detailSteps(selected, activeSession).map(([label, done]) => `<li class="${done ? "is-done" : ""}"><img src="${OSLab.learningPath.icon(done ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(label)}</span></li>`).join("")}</ul></section>
      ${blockedBy ? `<div class="learning-locked-note"><img src="${OSLab.learningPath.icon("lock_closed")}" alt="" /><span><strong>Exercício bloqueado</strong>Conclua primeiro o exercício ${String(blockedBy.order).padStart(2, "0")}, ${safe(blockedBy.title)}.</span></div>` : ""}
      ${result ? `<div class="learning-result-summary"><span><strong>${Number(result.attempt) || 1}</strong>tentativa</span><span><strong>${result.hintUsed ? "Sim" : "Não"}</strong>usou dica</span><span><strong>100%</strong>confirmado</span></div>` : ""}
      <div class="learning-detail-actions"><button class="learning-primary" type="button" data-exercise-action="${primaryAction}" ${selected.status === "locked" ? "disabled" : ""}>${OSLab.learningPath.actionIcon(selected.status === "completed" ? "arrow_reset" : "play")}${primaryLabel}</button>${selected.status === "active" ? `<button type="button" data-exercise-action="hint">${OSLab.learningPath.actionIcon("lightbulb")}${hint ? "Reabrir dica" : "Dica"}</button><button type="button" data-exercise-action="restart">${OSLab.learningPath.actionIcon("arrow_reset")}Reiniciar</button>` : ""}</div>
    </aside>`;
  }

  function render(record) {
    records.add(record);
    const exercises = OSLab.exercises.getExercises();
    const progress = OSLab.exercises.getProgress();
    const session = OSLab.exercises.getSession();
    if (session?.id && session.id !== lastSessionId) selectedId = session.id;
    lastSessionId = session?.id || null;
    if (!selectedId || !exercises.some((exercise) => exercise.id === selectedId && exercise.status !== "locked")) {
      selectedId = session?.id || exercises.find((exercise) => exercise.status === "available")?.id || exercises.find((exercise) => exercise.status === "completed")?.id || exercises[0].id;
    }
    const selected = exercises.find((exercise) => exercise.id === selectedId) || exercises[0];
    const completed = exercises.filter((exercise) => exercise.status === "completed").length;
    const attempts = Object.values(progress.attempts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const hints = Object.values(progress.hints).filter((entry) => entry?.used).length;
    const nextExercise = exercises.find((exercise) => exercise.status === "active") || exercises.find((exercise) => exercise.status === "available");
    record.address.textContent = "Trilha de Exercícios";
    record.content.innerHTML = `<section class="learning-page exercises-page">
      <header class="learning-hero">
        <div class="learning-hero-copy"><span class="learning-app-mark"><img src="${OSLab.learningPath.icon("wrench")}" alt="" /></span><div><small>OSLab · Trilha de Diagnóstico</small><h1>Investigue, corrija e confirme</h1><p>Resolva problemas reais do computador com orientação apenas quando você pedir.</p></div></div>
        <div class="learning-stats" aria-label="Progresso dos exercícios"><span><img src="${OSLab.learningPath.icon("checkmark_circle")}" alt="" /><strong>${completed}/10</strong><small>concluídos</small></span><span><img src="${OSLab.learningPath.icon("arrow_reset")}" alt="" /><strong>${attempts}</strong><small>tentativas</small></span><span><img src="${OSLab.learningPath.icon("lightbulb")}" alt="" /><strong>${hints}</strong><small>dicas usadas</small></span><div class="learning-progress"><i style="width:${progress.overallProgress}%"></i></div></div>
      </header>
      <div class="learning-toolbar"><span>${nextExercise ? `Próximo diagnóstico: <strong>${safe(nextExercise.title)}</strong>` : "Percurso concluído: todos os diagnósticos foram resolvidos."}</span><button type="button" data-exercise-action="reset-progress">${OSLab.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div>
      <div class="learning-layout"><main class="learning-trail-scroller" aria-label="Trilha de exercícios">${OSLab.learningPath.renderSections(exercises, sections, selected.id, "exercise")}</main>${detailMarkup(selected, progress, session, exercises)}</div>
    </section>`;

    if (!record.exercisesWired) {
      record.exercisesWired = true;
      record.content.addEventListener("click", async (event) => {
        const select = event.target.closest("[data-exercise-select]")?.dataset.exerciseSelect;
        const action = event.target.closest("[data-exercise-action]")?.dataset.exerciseAction;
        if (select) {
          selectedId = select;
          render(record);
          window.requestAnimationFrame(() => record.content.querySelector(`[data-exercise-select="${CSS.escape(select)}"]`)?.focus());
          return;
        }
        if (!action) return;
        if (action === "start") {
          const selectedExercise = OSLab.exercises.getExercises().find((exercise) => exercise.id === selectedId);
          if (!selectedExercise || selectedExercise.status === "locked") return;
          if (selectedExercise.status === "completed" && !await OSLab.ui.confirm({ title: "Refazer exercício?", message: "Um novo ambiente será preparado e a tentativa anterior continuará no histórico.", confirmLabel: "Refazer" })) return;
          const started = OSLab.exercises.start(selectedId);
          if (started.ok) OSLab.windowManager?.minimize?.(record.windowId);
          renderAll();
        }
        if (action === "continue") OSLab.windowManager?.minimize?.(record.windowId);
        if (action === "hint") { OSLab.exercises.useHint(); renderAll(); OSLab.assistantRobot?.expand?.(); }
        if (action === "restart" && await OSLab.ui.confirm({ title: "Reiniciar exercício?", message: "O ambiente será restaurado e o problema preparado novamente.", confirmLabel: "Reiniciar" })) OSLab.exercises.restart();
        if (action === "reset-progress" && await OSLab.ui.confirm({ title: "Redefinir todo o progresso?", message: "Tentativas, dicas e conclusões dos exercícios serão removidas.", confirmLabel: "Redefinir" })) { OSLab.exercises.resetProgress(); selectedId = null; }
      });
    }
    OSLab.assistantRobot?.render?.();
  }

  function renderAll() { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  OSLab.exercises.subscribe(renderAll);
  OSLab.exercisesApp = { render, renderAll };
})(window);
