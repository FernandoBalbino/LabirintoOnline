(function createLearningPath(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const ICON_ROOT = "assets/learning/icons";

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function icon(name) { return `${ICON_ROOT}/${name}.svg`; }
  function statusLabel(status, feminine = false) {
    const labels = feminine
      ? { completed: "Concluída", active: "Em andamento", available: "Disponível", locked: "Bloqueada" }
      : { completed: "Concluído", active: "Em andamento", available: "Disponível", locked: "Bloqueado" };
    return labels[status] || status;
  }
  function statusIcon(status) {
    return icon(status === "completed" ? "checkmark_circle" : status === "locked" ? "lock_closed" : status === "active" ? "play" : "target_arrow");
  }
  // atributo de seleção de cada trilha (os aplicativos escutam cliques por ele)
  const SELECT_ATTR = { mission: "data-mission-select", "vpn-mission": "data-vpn-mission-select", "install-mission": "data-install-mission-select", "browser-mission": "data-browser-mission-select", "digital-mission": "data-digital-mission-select", "users-mission": "data-users-mission-select", "wifi-mission": "data-wifi-mission-select", "drivers-mission": "data-drivers-mission-select", "audio-mission": "data-audio-mission-select", "task-mission": "data-task-mission-select", "store-mission": "data-store-mission-select" };
  /** cada missão vira uma "fase": número grande, ícone, nome e situação; todas cabem na tela sem rolar */
  function nodeMarkup(item, index, selectedId, kind) {
    const isMission = kind !== "exercise";
    const selectAttr = SELECT_ATTR[kind] || "data-exercise-select";
    return `<button type="button" class="phase-tile is-${item.status}${item.id === selectedId ? " is-selected" : ""}" ${selectAttr}="${safe(item.id)}" ${item.status === "locked" ? "disabled" : ""} ${item.status === "active" ? 'aria-current="step"' : ""} aria-label="${safe(`Fase ${item.order}: ${item.title}. ${statusLabel(item.status, isMission)}`)}">
      <span class="phase-num">${String(item.order).padStart(2, "0")}</span>
      <img class="phase-state" src="${statusIcon(item.status)}" alt="" />
      <img class="phase-icon" src="${safe(item.icon)}" alt="" />
      <strong>${safe(item.title)}</strong>
    </button>`;
  }

  function renderSections(items, sections, selectedId, kind) {
    return `<div class="phase-board">${sections.map((section) => {
      const sectionItems = items.filter((item) => section.orders.includes(item.order));
      const done = sectionItems.filter((item) => item.status === "completed").length;
      return `<section class="phase-unit" aria-labelledby="${kind}-unit-${section.slug}">
        <h2 id="${kind}-unit-${section.slug}"><span>${safe(String(section.kicker || "").split("·")[0].trim())}</span>${safe(section.title)}<em>${done}/${sectionItems.length}</em></h2>
        <div class="phase-row">${sectionItems.map((item, index) => nodeMarkup(item, index, selectedId, kind)).join("")}</div>
      </section>`;
    }).join("")}</div>`;
  }

  function renderHint(hint, label = "Dica passo a passo") {
    if (!hint) return "";
    return `<section class="learning-hint" data-learning-hint><header><img src="${icon("lightbulb")}" alt="" /><span><small>${safe(label)}</small><strong>${safe(hint.title)}</strong></span></header><p>${safe(hint.intro)}</p><ol>${hint.steps.map((step) => `<li>${safe(step)}</li>`).join("")}</ol><div class="learning-hint-check"><img src="${icon("checkmark_circle")}" alt="" /><span><strong>Como conferir</strong>${safe(hint.check)}</span></div></section>`;
  }

  function actionIcon(name) { return `<img src="${icon(name)}" alt="" />`; }

  function renderSteps(mission, active, completed = false) {
    const current = mission.objectives.find((item) => !active?.checklist?.[item.id])?.id;
    return `<section class="learning-instructions"><h3>Passo a passo</h3><ol>${(mission.steps || []).map((step) => {
      const done = completed || Boolean(active?.checklist?.[step.objectiveId]);
      return `<li class="${done ? "is-done" : step.objectiveId === current ? "is-current" : ""}"><span>${safe(step.text)}</span>${done ? actionIcon("checkmark_circle") : ""}</li>`;
    }).join("")}</ol></section>`;
  }

  OSLab.learningPath = {
    renderSteps,
    icon,
    safe,
    statusLabel,
    statusIcon,
    renderSections,
    renderHint,
    actionIcon,
  };
})(window);
