(function createVpnLabApp(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const sections = [{ slug: "vpn", kicker: "Laboratório VPN · Missões 1–7", title: "Conexões, localização e acesso", description: "Aprenda VPN alterando o comportamento de sites e redes simuladas.", orders: [1, 2, 3, 4, 5, 6, 7], icon: "shield_checkmark" }];
  let selectedId = null;
  let lastActiveId = null;

  function safe(value) { return OSLab.learningPath.safe(value); }
  function finalQuiz(progress) {
    if (Object.keys(progress.completed).length !== 7) return "";
    if (progress.finalQuiz?.passed) return `<section class="vpn-lab-finale is-passed"><img src="assets/learning/mascot/oslab-mascot-celebrate.png" alt="Mascote celebrando" /><small>7 / 7 MISSÕES</small><h2>Laboratório VPN concluído</h2><p>Você praticou IP aparente, geolocalização, acesso remoto, redes públicas, latência, bloqueios por localização e allowlist.</p><ul><li>Uma VPN não torna alguém completamente anônimo.</li><li>VPN não substitui antivírus ou firewall.</li><li>Empresas podem usar VPN para acesso remoto à rede interna.</li></ul></section>`;
    return `<form class="vpn-final-quiz" data-vpn-final-quiz><small>7 / 7 MISSÕES</small><h2>Revisão final</h2><p>Responda às três perguntas para encerrar o laboratório.</p>
      <fieldset><legend>1. Uma VPN torna uma pessoa completamente anônima?</legend><label><input type="radio" name="anonymous" value="yes" required /> Sim</label><label><input type="radio" name="anonymous" value="no" required /> Não</label></fieldset>
      <fieldset><legend>2. Uma VPN substitui antivírus ou firewall?</legend><label><input type="radio" name="antivirus" value="yes" required /> Sim</label><label><input type="radio" name="antivirus" value="no" required /> Não</label></fieldset>
      <fieldset><legend>3. Uma empresa pode usar VPN para acesso remoto à rede interna?</legend><label><input type="radio" name="corporate" value="yes" required /> Sim</label><label><input type="radio" name="corporate" value="no" required /> Não</label></fieldset>
      ${progress.finalQuiz && !progress.finalQuiz.passed ? `<p class="vpn-quiz-error">Revise os conceitos: VPN protege um caminho e altera o IP aparente, mas não substitui outras camadas de segurança.</p>` : ""}
      <button class="learning-primary" type="submit">Concluir laboratório</button>
    </form>`;
  }
  function detailMarkup(selected, progress) {
    const active = progress.active?.id === selected.id ? progress.active : null;
    const hint = active ? OSLab.vpnLab.getHint() : null;
    const blockedBy = selected.status === "locked" ? OSLab.vpnLab.getMissions().find((mission) => mission.order < selected.order && mission.status !== "completed") : null;
    const result = progress.completed[selected.id];
    const label = selected.status === "completed" ? "Refazer missão" : selected.status === "active" ? "Continuar no sistema" : selected.status === "locked" ? "Missão bloqueada" : "Iniciar missão";
    const action = selected.status === "active" ? "continue" : "start";
    return `<aside class="learning-detail-panel vpn-lab-detail" aria-live="polite">
      <div class="learning-detail-icon is-${selected.status}"><img src="${safe(selected.icon)}" alt="" /></div>
      <div class="learning-detail-heading"><span class="learning-status is-${selected.status}"><img src="${OSLab.learningPath.statusIcon(selected.status)}" alt="" />${OSLab.learningPath.statusLabel(selected.status)}</span><small>Missão VPN ${String(selected.order).padStart(2, "0")}</small><h2>${safe(selected.title)}</h2><div class="learning-chips"><span>${safe(selected.category)}</span><span>${safe(selected.difficulty)}</span></div></div>
      <p class="learning-description">${safe(selected.description)}</p><section class="learning-goal"><h3>Objetivo</h3><p>${safe(selected.goal)}</p></section>
      <section class="learning-objectives"><h3>Etapas da missão</h3><ul>${selected.objectives.map((objective) => { const done = Boolean(active?.checklist?.[objective.id]) || selected.status === "completed"; return `<li class="${done ? "is-done" : ""}"><img src="${OSLab.learningPath.icon(done ? "checkmark_circle" : "target_arrow")}" alt="" /><span>${safe(objective.label)}</span></li>`; }).join("")}</ul></section>
      ${blockedBy ? `<div class="learning-locked-note"><img src="${OSLab.learningPath.icon("lock_closed")}" alt="" /><span><strong>Missão bloqueada</strong>Conclua primeiro ${safe(blockedBy.title)}.</span></div>` : ""}
      ${result ? `<div class="vpn-mission-explanation"><img src="${OSLab.learningPath.icon("lightbulb")}" alt="" /><p><strong>O que esta missão mostrou</strong>${safe(result.explanation || selected.success)}</p></div>` : ""}
      ${OSLab.learningPath.renderHint(hint, active ? `Dica ${active.hintsUsed} de ${selected.hints.length}` : "Dica")}
      <div class="learning-detail-actions"><button class="learning-primary" type="button" data-vpn-lab-action="${action}" ${selected.status === "locked" ? "disabled" : ""}>${OSLab.learningPath.actionIcon(selected.status === "completed" ? "arrow_reset" : "play")}${label}</button>${active && active.phase !== "completed" ? `<button type="button" data-vpn-lab-action="hint">${OSLab.learningPath.actionIcon("lightbulb")}${active.hintsUsed >= selected.hints.length ? `Rever dica (${selected.hints.length}/${selected.hints.length})` : active.hintsUsed ? `Próxima dica (${active.hintsUsed + 1}/${selected.hints.length})` : "Dica (1/3)"}</button><button type="button" data-vpn-lab-action="open-browser">${OSLab.learningPath.actionIcon("globe_search")}Navegador</button><button type="button" data-vpn-lab-action="open-vpn">${OSLab.learningPath.actionIcon("shield_checkmark")}VPN</button>` : ""}</div>
    </aside>`;
  }
  function render(record) {
    records.add(record);
    const missions = OSLab.vpnLab.getMissions();
    const progress = OSLab.vpnLab.getProgress();
    const activeId = progress.active?.id || null;
    if (activeId && activeId !== lastActiveId) selectedId = activeId;
    lastActiveId = activeId;
    if (!selectedId || !missions.some((mission) => mission.id === selectedId && mission.status !== "locked")) selectedId = activeId || missions.find((mission) => mission.status === "available")?.id || missions.find((mission) => mission.status === "completed")?.id || missions[0].id;
    const selected = missions.find((mission) => mission.id === selectedId) || missions[0];
    const completed = missions.filter((mission) => mission.status === "completed").length;
    const hints = Object.values(progress.completed).reduce((sum, result) => sum + (Number(result.hintsUsed) || 0), Number(progress.active?.hintsUsed) || 0);
    record.address.textContent = "Laboratório VPN";
    record.content.innerHTML = `<section class="learning-page vpn-lab-page">
      <header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="${OSLab.learningPath.icon("shield_checkmark")}" alt="" /></span><div><small>OSLab · Laboratório prático</small><h1>Aprenda VPN observando o que muda</h1><p>Abra aplicativos, atualize sites e valide cada situação dentro do Windows simulado.</p></div></div><div class="learning-stats"><span><img src="${OSLab.learningPath.icon("checkmark_circle")}" alt="" /><strong>${completed}/7</strong><small>concluídas</small></span><span><img src="${OSLab.learningPath.icon("lightbulb")}" alt="" /><strong>${hints}</strong><small>dicas vistas</small></span><span><img src="${OSLab.learningPath.icon("shield_checkmark")}" alt="" /><strong>${OSLab.vpn.getSnapshot().connected ? "ON" : "OFF"}</strong><small>VPN agora</small></span><div class="learning-progress"><i style="width:${Math.round(completed / 7 * 100)}%"></i></div></div></header>
      <div class="learning-toolbar"><span>${completed === 7 ? "Percurso concluído: finalize a revisão rápida." : `Próxima missão: <strong>${safe(missions.find((mission) => mission.status === "active")?.title || missions.find((mission) => mission.status === "available")?.title || selected.title)}</strong>`}</span><button type="button" data-vpn-lab-action="reset-progress">${OSLab.learningPath.actionIcon("arrow_reset")}Redefinir laboratório</button></div>
      <div class="learning-layout"><main class="learning-trail-scroller" aria-label="Trilha do Laboratório VPN">${finalQuiz(progress)}${OSLab.learningPath.renderSections(missions, sections, selected.id, "vpn-mission")}</main>${detailMarkup(selected, progress)}</div>
    </section>`;
    if (!record.vpnLabWired) {
      record.vpnLabWired = true;
      record.content.addEventListener("click", async (event) => {
        const select = event.target.closest("[data-vpn-mission-select]")?.dataset.vpnMissionSelect;
        const action = event.target.closest("[data-vpn-lab-action]")?.dataset.vpnLabAction;
        if (select) { selectedId = select; render(record); global.requestAnimationFrame(() => record.content.querySelector(`[data-vpn-mission-select="${CSS.escape(select)}"]`)?.focus()); return; }
        if (!action) return;
        if (action === "start") {
          const mission = OSLab.vpnLab.getMissions().find((entry) => entry.id === selectedId);
          if (!mission || mission.status === "locked") return;
          if (mission.status === "completed" && !await OSLab.ui.confirm({ title: "Refazer missão VPN?", message: "O estado atual da VPN será mantido, mas os objetivos desta tentativa recomeçarão.", confirmLabel: "Refazer" })) return;
          const started = OSLab.vpnLab.start(selectedId); if (started.ok) OSLab.windowManager.minimize(record.windowId);
        }
        if (action === "continue") OSLab.windowManager.minimize(record.windowId);
        if (action === "hint") { OSLab.vpnLab.useHint(); OSLab.assistantRobot?.expand?.(); }
        if (action === "open-browser") OSLab.shell.openApp("google");
        if (action === "open-vpn") OSLab.shell.openApp("vpn");
        if (action === "reset-progress" && await OSLab.ui.confirm({ title: "Redefinir laboratório VPN?", message: "As sete conclusões, dicas e a conexão VPN serão apagadas.", confirmLabel: "Redefinir" })) { OSLab.vpnLab.resetProgress(); OSLab.vpn.reset(); selectedId = null; }
      });
      record.content.addEventListener("submit", (event) => {
        const form = event.target.closest("[data-vpn-final-quiz]"); if (!form) return;
        event.preventDefault(); const values = new FormData(form); OSLab.vpnLab.setFinalQuiz({ anonymous: values.get("anonymous"), antivirus: values.get("antivirus"), corporate: values.get("corporate") });
      });
    }
    OSLab.assistantRobot?.render?.();
  }
  function renderAll() { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  OSLab.vpnLab.subscribe(renderAll);
  OSLab.vpn.subscribe(renderAll);
  OSLab.vpnLabApp = { render, renderAll };
})(window);
