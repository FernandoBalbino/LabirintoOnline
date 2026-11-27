(function createDigitalLifeApp(global) {
  'use strict';
  const O = global.OSLab, records = new Set();
  const safe = value => O.ui.escapeHtml(String(value || ''));
  let selected;
  const sections = [
    { slug:'emails',kicker:'Unidade 1 · Missões 01–03',title:'Seus primeiros e-mails',description:'Crie contas e descubra suas caixas de entrada.',orders:[1,2,3],icon:'globe_search' },
    { slug:'explore',kicker:'Unidade 2 · Missões 04–06',title:'Explore novos serviços',description:'Verifique seu e-mail, crie perfis e faça parte de uma comunidade.',orders:[4,5,6],icon:'apps' },
    { slug:'google',kicker:'Unidade 3 · Missões 07–08',title:'Uma identidade, novas possibilidades',description:'Use sua conta Google no YouTube e no Drive.',orders:[7,8],icon:'folder_search' },
    { slug:'return',kicker:'Unidade 4 · Missões 09–12',title:'Volte com autonomia',description:'Entre novamente e encontre o que você salvou.',orders:[9,10,11,12],icon:'arrow_reset' },
  ];
  function render(record) {
    records.add(record);
    const missions = O.digitalLifeTrail.getMissions(), progress = O.digitalLifeTrail.getProgress();
    if (!selected || missions.find(m => m.id === selected)?.status === 'locked') selected = progress.active?.id || missions.find(m => m.status === 'available')?.id || missions[0].id;
    const current = missions.find(m => m.id === selected), active = progress.active?.id === current.id ? progress.active : null;
    const count = Object.keys(progress.completed).length;
    record.address.textContent = 'Minha Primeira Vida Digital';
    const objectives = current.objectives.map(o => '<li class="' + (progress.completed[current.id] || active?.checklist[o.id] ? 'is-done' : '') + '"><img src="' + O.learningPath.icon(progress.completed[current.id] || active?.checklist[o.id] ? 'checkmark_circle' : 'target_arrow') + '" alt=""><span>' + safe(o.label) + '</span></li>').join('');
    const details = '<aside class="learning-detail-panel dl-trail-detail"><div class="learning-detail-icon is-' + current.status + '"><img src="' + current.icon + '" alt=""></div><div class="learning-detail-heading"><small>Missão ' + String(current.order).padStart(2,'0') + '</small><h2>' + safe(current.title) + '</h2><span class="learning-status is-' + current.status + '">' + O.learningPath.statusLabel(current.status,true) + '</span></div><section class="learning-goal"><h3>Pratique no navegador</h3><p>' + safe(current.instruction) + '</p></section><section class="learning-objectives"><h3>Suas conquistas</h3><ul>' + objectives + '</ul></section><div class="learning-detail-actions">' + (current.status !== 'completed' ? '<button class="learning-primary" type="button" data-digital-trail="start" ' + (current.status === 'locked' ? 'disabled' : '') + '>' + (active ? active.suspended ? 'Retomar missão' : 'Continuar no navegador' : 'Iniciar missão') + '</button>' : '<button class="learning-primary" type="button" data-digital-trail="next">Próxima missão</button>') + '</div></aside>';
    const finale = count === 12 ? '<section class="dl-trail-summary"><h2>Sua primeira vida digital está completa!</h2><p>Você criou contas, verificou seu e-mail, praticou novos logins, organizou uma pasta e reencontrou seus favoritos.</p><strong>12 de 12 missões concluídas</strong></section>' : '';
    record.content.innerHTML = '<section class="learning-page dl-trail-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="' + 'assets/digital/trail-icon.png' + '" alt=""></span><div><small>OSLAB · TRILHA PRÁTICA</small><h1>Minha Primeira Vida Digital</h1><p>Uma conta, uma descoberta. Aprenda fazendo.</p></div></div><div class="learning-stats"><span><strong>' + count + '/12</strong><small>missões</small></span><span><strong>8</strong><small>serviços</small></span><span><strong>' + Math.round(count / 12 * 100) + '%</strong><small>progresso</small></span><div class="learning-progress"><i style="width:' + count / 12 * 100 + '%"></i></div></div></header><div class="learning-toolbar"><span>' + (progress.active?.suspended ? 'Missão pausada. Clique em Retomar missão para continuar.' : 'Sua sessão é salva automaticamente neste dispositivo.') + '</span><button type="button" data-digital-trail="reset">Novo aluno</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="As 12 missões da vida digital">' + finale + O.learningPath.renderSections(missions,sections,selected,'digital-mission') + '</main>' + details + '</div></section>';
    if (!record.digitalTrailWired) {
      record.digitalTrailWired = true;
      record.content.addEventListener('click',async event => {
        const choice = event.target.closest('[data-digital-mission-select]')?.dataset.digitalMissionSelect;
        if (choice) { selected = choice; render(record); }
        const action = event.target.closest('[data-digital-trail]')?.dataset.digitalTrail;
        if (action === 'start' && O.digitalLifeTrail.start(selected).ok) O.windowManager.minimize(record.windowId);
        if (action === 'next') { const next = O.digitalLifeTrail.getMissions().find(m => m.status === 'available' || m.status === 'active'); if (next) { selected = next.id; O.digitalLifeTrail.start(next.id); O.windowManager.minimize(record.windowId); } }
        if (action === 'reset' && await O.ui.confirm({ title:'Novo aluno?',message:'Todas as contas, mensagens, códigos, formulários e conquistas de Minha Primeira Vida Digital serão apagados. Os outros laboratórios manterão seus dados.',confirmLabel:'Começar com novo aluno' })) { selected = null; O.digitalLife.reset(); }
      });
    }
  }
  function assistantView() {
    const progress = O.digitalLifeTrail.getProgress(), active = progress.active;
    if (!active || active.suspended) return null;
    const mission = O.digitalLifeTrail.catalog.find(m => m.id === active.id), done = active.phase === 'completed';
    const next = mission.objectives.find(o => !active.checklist[o.id]);
    return {
      kind:'digital-life',mascot:done ? 'celebrate' : 'neutral',eyebrow:done ? 'Missão concluída' : 'Vida Digital · Missão ' + mission.order,
      title:mission.title,message:done ? (mission.order === 12 ? 'Você concluiu as 12 missões! Veja suas conquistas na trilha.' : 'Muito bem! Sua conquista foi salva.') : mission.instruction,
      body:!done && next ? '<p class="dl-current-step"><strong>Etapa atual:</strong> ' + safe(next.label) + '</p>' : '',
      actions:done ? '<button type="button" data-assistant-action="digital-open">Ver trilha</button><button type="button" class="is-primary" data-assistant-action="digital-next">' + (mission.order === 12 ? 'Ver conclusão' : 'Próxima missão') + '</button>' : '<button type="button" data-assistant-action="digital-browser">Navegador</button><button type="button" data-assistant-action="digital-open">Trilha</button><button type="button" data-assistant-action="digital-pause">Pausar</button>',
    };
  }
  O.digitalLifeTrail.subscribe(() => { records.forEach(r => r.element.isConnected ? render(r) : records.delete(r)); O.assistantRobot?.render(); });
  O.digitalLifeApp = { render, assistantView };
})(window);
