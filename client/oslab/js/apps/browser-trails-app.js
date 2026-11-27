(function createBrowserTrailsApp(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const trailRecords = new Set();
  const museumRecords = new Set();
  let selectedId = null;
  let lastActiveId = null;
  const sections = [
    { slug: "inicio", kicker: "Unidade 1 · Missões 1–4", title: "Primeiros passos", description: "Abra o navegador e reconheça as duas caixas de texto.", orders: [1, 2, 3, 4], icon: "globe_search" },
    { slug: "paginas", kicker: "Unidade 2 · Missões 5–8", title: "Sites e navegação", description: "Visite páginas, pesquise e use os controles de navegação.", orders: [5, 6, 7, 8], icon: "folder_search" },
    { slug: "organizacao", kicker: "Unidade 3 · Missões 9–12", title: "Organize sua navegação", description: "Trabalhe com abas, favoritos e histórico.", orders: [9, 10, 11, 12], icon: "list_bar" },
    { slug: "final", kicker: "Unidade 4 · Missão 13", title: "Desafio final", description: "Complete sozinho uma sequência de ações reais.", orders: [13], icon: "trophy" },
  ];
  const safe = (value) => OSLab.ui.escapeHtml(value);
  const icon = (name) => OSLab.learningPath.icon(name);
  function detail(mission, progress) {
    const active = progress.active?.id === mission.id ? progress.active : null;
    const result = progress.completed[mission.id];
    const isFinal = mission.order === 13;
    return `<aside class="learning-detail-panel browser-trail-detail" aria-live="polite"><div class="learning-detail-icon is-${mission.status}"><img src="${mission.icon}" alt="" /></div><div class="learning-detail-heading"><span class="learning-status is-${mission.status}"><img src="${OSLab.learningPath.statusIcon(mission.status)}" alt="" />${OSLab.learningPath.statusLabel(mission.status, true)}</span><small>Missão ${String(mission.order).padStart(2, "0")}</small><h2>${safe(mission.title)}</h2><div class="learning-chips"><span>${safe(mission.category)}</span><span>${safe(mission.difficulty)}</span></div></div><p class="learning-description">${safe(mission.description)}</p><section class="learning-goal"><h3>${isFinal ? "Agora faça tudo sozinho" : "Instrução"}</h3><p>${safe(mission.instruction)}</p></section><section class="learning-objectives"><h3>${isFinal ? "Desafio em ordem" : "Progresso automático"}</h3><ul>${mission.objectives.map((objective) => `<li class="${result || active?.checklist?.[objective.id] ? "is-done" : ""}"><img src="${icon(result || active?.checklist?.[objective.id] ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`).join("")}</ul></section>${result ? `<div class="install-mission-result"><img src="${icon("checkmark_circle")}" alt="" /><p><strong>Missão concluída</strong>${safe(result.explanation)}</p></div>` : ""}<div class="learning-detail-actions"><button class="learning-primary" type="button" data-browser-trail-action="${mission.status === "active" ? "continue" : "start"}" ${mission.status === "locked" ? "disabled" : ""}>${OSLab.learningPath.actionIcon(mission.status === "completed" ? "arrow_reset" : "play")}${mission.status === "active" ? "Continuar no sistema" : mission.status === "completed" ? "Refazer missão" : "Iniciar missão"}</button>${active ? `<button type="button" data-browser-trail-action="browser">${OSLab.learningPath.actionIcon("globe_search")}Navegador</button>` : ""}</div></aside>`;
  }
  function renderTrail(record) {
    trailRecords.add(record);
    const missions = OSLab.browserTrail.getMissions();
    const progress = OSLab.browserTrail.getProgress();
    if (progress.active?.id && progress.active.id !== lastActiveId) selectedId = progress.active.id;
    lastActiveId = progress.active?.id || null;
    if (!selectedId || missions.find((item) => item.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find((item) => item.status === "available")?.id || missions[0].id;
    const selected = missions.find((item) => item.id === selectedId) || missions[0];
    const completed = missions.filter((item) => item.status === "completed").length;
    record.address.textContent = "Navegadores e Internet";
    record.content.innerHTML = `<section class="learning-page browser-trail-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="${icon("globe_search")}" alt="" /></span><div><small>OSLAB · Trilha prática</small><h1>Navegadores e Internet</h1><p>Aprenda a navegar fazendo, em páginas locais e seguras.</p></div></div><div class="learning-stats"><span><img src="${icon("checkmark_circle")}" alt="" /><strong>${completed}/13</strong><small>missões</small></span><span><img src="${icon("globe_search")}" alt="" /><strong>12 + 1</strong><small>atividades</small></span><span><img src="${icon("trophy")}" alt="" /><strong>${Math.round(completed / 13 * 100)}%</strong><small>progresso</small></span><div class="learning-progress"><i style="width:${Math.round(completed / 13 * 100)}%"></i></div></div></header><div class="learning-toolbar"><span>${completed === 13 ? "Parabéns! Você concluiu a trilha Navegadores e Internet." : `Próxima etapa: <strong>${safe(missions.find((item) => item.status === "active")?.title || missions.find((item) => item.status === "available")?.title || selected.title)}</strong>`}</span><button type="button" data-browser-trail-action="reset">${OSLab.learningPath.actionIcon("arrow_reset")}Redefinir trilha</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="Trilha Navegadores e Internet">${completed === 13 ? `<section class="browser-finale"><img src="assets/learning/mascot/oslab-mascot-celebrate.png" alt="Mascote celebrando" /><h2>Trilha concluída!</h2><p>Você aprendeu a navegar, pesquisar e organizar páginas.</p></section>` : ""}${OSLab.learningPath.renderSections(missions, sections, selected.id, "browser-mission")}</main>${detail(selected, progress)}</div></section>`;
    if (!record.browserTrailWired) {
      record.browserTrailWired = true;
      record.content.addEventListener("click", async (event) => {
        const select = event.target.closest("[data-browser-mission-select]")?.dataset.browserMissionSelect;
        const action = event.target.closest("[data-browser-trail-action]")?.dataset.browserTrailAction;
        if (select) { selectedId = select; renderTrail(record); return; }
        if (!action) return;
        if (action === "start") { const target = OSLab.browserTrail.getMissions().find((item) => item.id === selectedId); if (target?.status === "completed" && !await OSLab.ui.confirm({ title: "Refazer missão?", message: "A tentativa desta missão será reiniciada.", confirmLabel: "Refazer" })) return; if (OSLab.browserTrail.start(selectedId).ok) OSLab.windowManager.minimize(record.windowId); }
        if (action === "continue") OSLab.windowManager.minimize(record.windowId);
        if (action === "browser") OSLab.shell.openApp("google");
        if (action === "reset" && await OSLab.ui.confirm({ title: "Redefinir a trilha?", message: "As 13 conclusões serão removidas.", confirmLabel: "Redefinir" })) { OSLab.browserTrail.resetAll(); selectedId = null; }
      });
    }
    OSLab.assistantRobot?.render?.();
  }
  function renderMuseum(record) {
    museumRecords.add(record);
    const progress = OSLab.browserMuseum.getProgress();
    const browsers = OSLab.browserApp.browsers;
    const count = Object.keys(progress.visited).length;
    record.address.textContent = "Conhecendo os Navegadores";
    record.content.innerHTML = `<section class="learning-page browser-museum-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="${icon("globe_search")}" alt="" /></span><div><small>OSLAB · Museu interativo</small><h1>Conhecendo os Navegadores</h1><p>Existem vários programas para navegar na internet. Observe e compare suas interfaces.</p></div></div><div class="learning-stats"><span><img src="${icon("checkmark_circle")}" alt="" /><strong>${count}/5</strong><small>visitados</small></span><span><img src="${icon("globe_search")}" alt="" /><strong>5</strong><small>navegadores</small></span><span><img src="${icon("trophy")}" alt="" /><strong>${count * 20}%</strong><small>progresso</small></span><div class="learning-progress"><i style="width:${count * 20}%"></i></div></div></header><div class="learning-toolbar"><span>Abra, observe e explore cada navegador. Volte aqui para escolher o próximo.</span><button type="button" data-browser-museum-reset>${OSLab.learningPath.actionIcon("arrow_reset")}Redefinir visitas</button></div><main class="browser-museum-content">${progress.completedAt ? `<section class="browser-finale"><img src="assets/learning/mascot/oslab-mascot-celebrate.png" alt="Mascote celebrando" /><h2>Você conheceu cinco navegadores diferentes.</h2><p>Todos têm abas, barra de endereço, Voltar, Avançar, Atualizar e menu. Ao aprender um, fica mais fácil usar os demais.</p></section>` : ""}<div class="browser-museum-grid">${OSLab.browserMuseum.ids.map((id) => `<article class="browser-museum-card"><img src="${id === "brave" ? "assets/browser/brave.png" : browsers[id].logo}" alt="Logotipo ${safe(browsers[id].name)}" /><h2>${safe(browsers[id].name)}</h2><p>${safe(browsers[id].description)}</p><span class="${progress.visited[id] ? "is-visited" : ""}">${progress.visited[id] ? "✓ Visitado" : "Ainda não visitado"}</span><button type="button" data-browser-museum-open="${id}">Abrir ${safe(browsers[id].name)}</button></article>`).join("")}</div></main></section>`;
    if (!record.browserMuseumWired) {
      record.browserMuseumWired = true;
      record.content.addEventListener("click", async (event) => {
        const id = event.target.closest("[data-browser-museum-open]")?.dataset.browserMuseumOpen;
        if (id) OSLab.browserMuseum.open(id);
        if (event.target.closest("[data-browser-museum-reset]") && await OSLab.ui.confirm({ title: "Redefinir visitas?", message: "O registro dos cinco navegadores será removido.", confirmLabel: "Redefinir" })) OSLab.browserMuseum.resetAll();
      });
    }
  }
  function renderAll() { trailRecords.forEach((record) => record.element?.isConnected ? renderTrail(record) : trailRecords.delete(record)); museumRecords.forEach((record) => record.element?.isConnected ? renderMuseum(record) : museumRecords.delete(record)); }
  OSLab.browserTrail.subscribe(renderAll);
  OSLab.browserMuseum.subscribe(renderAll);
  OSLab.browserTrailsApp = { renderTrail, renderMuseum, renderAll };
})(window);
