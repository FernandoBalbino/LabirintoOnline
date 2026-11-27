(function createUsersPermissionsApp(global) {
  "use strict";
  const O = global.OSLab;
  const records = new Set();
  let selectedId = null;
  const sections = [
    { slug: "identity", kicker: "Unidade 1 · Missões 1–2", title: "Contas e perfis", description: "Crie uma identidade local e personalize seu espaço.", orders: [1, 2], icon: "apps" },
    { slug: "separation", kicker: "Unidade 2 · Missões 3–4", title: "Separação e compartilhamento", description: "Compare arquivos privados e aplicativos por usuário.", orders: [3, 4], icon: "folder_search" },
    { slug: "control", kicker: "Unidade 3 · Missões 5–7", title: "Privilégios e laboratório", description: "Autorize ações, ajuste permissões e configure a escola.", orders: [5, 6, 7], icon: "shield_checkmark" },
  ];
  const safe = (value) => O.learningPath.safe(value);
  function render(record) {
    records.add(record);
    const missions = O.userMissions.getMissions();
    const progress = O.userMissions.getProgress();
    if (!selectedId || missions.find((item) => item.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find((item) => item.status === "available")?.id || missions[0].id;
    const selected = missions.find((item) => item.id === selectedId) || missions[0];
    const active = progress.active?.id === selected.id ? progress.active : null;
    const completed = missions.filter((item) => item.status === "completed").length;
    const objectives = selected.objectives.map((objective) => {
      const done = selected.status === "completed" || Boolean(active?.checklist?.[objective.id]);
      return `<li class="${done ? "is-done" : ""}"><img src="${O.learningPath.icon(done ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`;
    }).join("");
    const hasNext = selected.order < missions.length;
    const actions = active?.phase === "completed"
      ? `<button type="button" data-users-action="repeat">${O.learningPath.actionIcon("arrow_reset")}Refazer</button><button class="learning-primary" type="button" data-users-action="next">${O.learningPath.actionIcon(hasNext ? "arrow_right" : "target_arrow")}${hasNext ? "Próxima missão" : "Ver conclusão"}</button>`
      : active && !active.suspended
        ? `<button class="learning-primary" type="button" data-users-action="continue">${O.learningPath.actionIcon("play")}Continuar no sistema</button><button type="button" data-users-action="hint">${O.learningPath.actionIcon("lightbulb")}Dica</button><button type="button" data-users-action="tool">${O.learningPath.actionIcon("apps")}Abrir ferramenta</button>`
        : `<button class="learning-primary" type="button" data-users-action="start" ${selected.status === "locked" ? "disabled" : ""}>${O.learningPath.actionIcon("target_arrow")}${active?.suspended ? "Retomar missão" : selected.status === "completed" ? "Praticar novamente" : "Iniciar missão"}</button>`;
    const detail = `<aside class="learning-detail-panel users-detail" aria-live="polite">
      <div class="learning-detail-icon is-${selected.status}"><img src="${selected.icon}" alt="" /></div>
      <div class="learning-detail-heading"><span class="learning-status is-${selected.status}">${O.learningPath.statusLabel(selected.status, true)}</span><small>Missão ${String(selected.order).padStart(2, "0")}</small><h2>${safe(selected.title)}</h2><div class="learning-chips"><span>${safe(selected.category)}</span><span>${safe(selected.difficulty)}</span></div></div>
      <p class="learning-description">${safe(selected.description)}</p>
      <section class="learning-goal"><h3>Aprenda fazendo</h3><p>${safe(selected.goal)}</p></section>
      ${O.learningPath.renderSteps(selected, active, selected.status === "completed")}
      <section class="learning-objectives"><h3>Verificação automática</h3><ul>${objectives}</ul></section>
      ${active?.lastHint ? O.learningPath.renderHint(active.lastHint, "Dica da missão") : ""}
      <div class="learning-detail-actions">${actions}</div>
    </aside>`;
    const finale = completed === 7 ? `<section class="users-finale"><img src="assets/users-permissions/trail-icon.png" alt="" /><small>7 / 7 MISSÕES</small><h2>Laboratório pronto!</h2><p>Você configurou contas, perfis, aplicativos e documentos compartilhados com privilégios adequados.</p></section>` : "";
    record.address.textContent = "Gerenciamento de Usuários e Permissões";
    record.content.innerHTML = `<section class="learning-page users-permissions-page">
      <header class="learning-hero users-learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="assets/users-permissions/trail-icon.png" alt="" /></span><div><small>OSLAB · Trilha prática</small><h1>Gerenciamento de Usuários e Permissões</h1><p>Um computador, vários perfis. Aprenda a separar, compartilhar e proteger.</p></div></div><div class="learning-stats"><span><img src="${O.learningPath.icon("checkmark_circle")}" alt="" /><strong>${completed}/7</strong><small>concluídas</small></span><span><img src="${O.learningPath.icon("apps")}" alt="" /><strong>${O.users.list().length}</strong><small>contas</small></span><span><img src="${O.learningPath.icon("ribbon")}" alt="" /><strong>${progress.totalScore}</strong><small>pontos</small></span><div class="learning-progress"><i style="width:${Math.round(completed / 7 * 100)}%"></i></div></div></header>
      <div class="learning-toolbar"><span>${progress.active?.suspended ? "Missão pausada. Clique em Retomar missão para continuar." : completed === 7 ? "Configuração concluída e preservada neste dispositivo." : "Sua sessão é salva automaticamente neste dispositivo."}</span><button type="button" data-users-action="reset">${O.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div>
      <div class="learning-layout"><main class="learning-trail-scroller" aria-label="As sete missões de usuários e permissões">${finale}${O.learningPath.renderSections(missions, sections, selected.id, "users-mission")}</main>${detail}</div>
    </section>`;
    if (!record.usersPermissionsWired) {
      record.usersPermissionsWired = true;
      record.content.addEventListener("click", async (event) => {
        const choice = event.target.closest("[data-users-mission-select]")?.dataset.usersMissionSelect;
        const action = event.target.closest("[data-users-action]")?.dataset.usersAction;
        if (choice) { selectedId = choice; render(record); return; }
        if (action === "start") { if (O.userMissions.start(selectedId).ok) O.windowManager.minimize(record.windowId); }
        if (action === "continue") O.windowManager.minimize(record.windowId);
        if (action === "repeat") O.userMissions.finish("repeat");
        if (action === "next") O.userMissions.finish("next");
        if (action === "tool") { const mission = O.userMissionCatalog.find((item) => item.id === selectedId); if (mission?.tool) O.shell.openApp(mission.tool, mission.tool === "settings" ? { settingsView: "accounts" } : {}); }
        if (action === "hint") { const shown = O.userMissions.useHint(); O.ui.notify(shown?.title || "Dica", shown?.intro || "Observe os objetivos da missão.", "info"); }
        if (action === "reset" && await O.ui.confirm({ title: "Redefinir a trilha?", message: "As conclusões e a pontuação serão apagadas. As contas e os arquivos criados continuarão no computador simulado.", confirmLabel: "Redefinir" })) { O.userMissions.reset(); selectedId = null; }
      });
    }
  }
  function renderAll() { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  O.userMissions.subscribe((progress, reason) => { if (reason === "started" && progress.active?.id) selectedId = progress.active.id; renderAll(); });
  O.users.subscribe(renderAll);
  O.usersPermissionsApp = { render, renderAll };
})(window);
