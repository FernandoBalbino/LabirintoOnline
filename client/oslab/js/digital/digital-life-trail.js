(function createDigitalLifeTrail(global) {
  'use strict';
  const O = global.OSLab;
  const rows = [
    ['Primeiro Gmail', 'google', 'No Google, pesquise “Criar Gmail” e abra o primeiro resultado. Clique em Criar conta → Para uso pessoal. Informe nome, data de nascimento e um endereço @gmail.com. Crie e confirme uma senha com pelo menos 8 caracteres, letras e números. Ao chegar à caixa de entrada, abra a mensagem de boas-vindas.', ['search', 'registered', 'message-read']],
    ['Seu endereço Outlook', 'outlook', 'Pesquise “Outlook” no Google e abra o serviço. Clique em Criar conta, escolha um endereço @outlook.com e uma senha própria. Preencha nome, data de nascimento e país. Termine o cadastro e abra a caixa de entrada.', ['search', 'registered', 'inbox-view']],
    ['Yahoo Mail', 'yahoo', 'Pesquise “Yahoo Mail” e abra o serviço. Clique em Criar conta, escolha seu endereço @yahoo.com e uma senha própria. Preencha seus dados, marque a confirmação da conta e avance até a caixa de entrada.', ['registered', 'inbox-view']],
    ['Uma conta Netflix', 'netflix', 'Clique no + do navegador para abrir uma nova aba. Pesquise “Netflix” e abra o primeiro resultado. Inicie o cadastro com o Gmail da missão 01. Abra o Gmail em outra aba, leia a mensagem da Netflix e copie o código. Volte, confirme o código e crie uma senha própria. Escolha um plano, clique em Preencher cartão e confirme. Crie seu perfil e entre nele.', ['new-tab', 'search', 'first-result', 'email-verified', 'registered', 'plan', 'payment', 'profile']],
    ['Sua música no Spotify', 'spotify', 'Pesquise “Spotify”, abra o serviço e clique em Inscrever-se. Use o Gmail da missão 01 e crie uma senha própria para o Spotify. Abra uma música pelo cartão e clique no botão Favoritar, com o coração. Encontre a música na seção Favoritos da Sua Biblioteca.', ['registered', 'song-open', 'favorite']],
    ['Comunidade no Discord', 'discord', 'Pesquise “Discord” e abra o serviço. Crie sua conta com o Gmail da missão 01 e uma senha própria. Na comunidade, preencha Seu nome de exibição e clique em Salvar nome. Depois clique em Entrar na Comunidade OSLab.', ['registered', 'display-name', 'community']],
    ['Seu perfil no YouTube', 'youtube', 'Pesquise “YouTube” e abra o serviço. Se aparecer Fazer login, entre com o endereço e a senha do Gmail da missão 01. Clique no botão com a inicial do seu nome, no canto superior direito, e confira seu perfil. Se a conta Google já estiver aberta, vá direto ao perfil.', ['profile-view']],
    ['Organize o Google Drive', 'drive', 'Pesquise “Google Drive” e abra o serviço. Entre com a mesma conta do Gmail, se necessário. Em Nome da nova pasta, digite exatamente “Meus Documentos” e clique em Criar pasta. Confira a pasta na área Meu Drive.', ['folder']],
    ['Retorno ao Outlook', 'outlook', 'Abra o Outlook e clique em Sair caso sua conta esteja aberta. Pesquise “Outlook Entrar” no Google e abra o resultado. Digite o endereço da missão 02, avance e informe a senha do Outlook. Depois abra a mensagem de boas-vindas da sua caixa de entrada.', ['search', 'login', 'message-read']],
    ['Retorno ao Yahoo', 'yahoo', 'Abra o Yahoo Mail e clique em Sair caso sua conta esteja aberta. Pesquise “Yahoo Entrar” e abra o serviço. Digite o endereço criado na missão 03, avance e informe a senha do Yahoo. A missão termina quando você abrir a caixa dessa conta.', ['login', 'inbox-view']],
    ['Retorno à Netflix', 'netflix', 'Abra a Netflix e clique em Sair. Pesquise “Netflix Entrar” e entre com o Gmail usado no cadastro e a senha própria da Netflix. Na tela Quem está assistindo?, clique no perfil que você criou na missão 04.', ['login', 'profile']],
    ['Retorno ao Spotify', 'spotify', 'Abra o Spotify e clique em Sair. Pesquise “Spotify Entrar” e entre com o Gmail usado no cadastro e a senha própria do Spotify. Abra Favoritos, na Sua Biblioteca, e clique em Abrir favorito na música salva na missão 05.', ['login', 'open-favorite']],
  ];
  const labels = { search: 'Pesquisar o serviço', registered: 'Criar a conta', 'message-read': 'Ler a mensagem inicial', 'inbox-view': 'Abrir a caixa de entrada', 'new-tab': 'Abrir uma nova aba', 'first-result': 'Acessar o primeiro resultado', 'email-verified': 'Verificar o e-mail pelo Gmail', plan: 'Escolher um plano', payment: 'Adicionar o cartão', profile: 'Entrar no perfil', 'song-open': 'Abrir uma música', favorite: 'Favoritar uma música', 'display-name': 'Personalizar o nome', community: 'Entrar na Comunidade OSLab', 'profile-view': 'Visualizar o perfil Google', folder: 'Criar Meus Documentos', login: 'Fazer um novo login', 'open-favorite': 'Abrir o favorito preservado' };
  const catalog = rows.map(([title, service, instruction, actions], index) => ({ id: 'digital-' + (index + 1), order: index + 1, title, service, instruction, description: instruction, icon: 'assets/digital/brands/' + ({google:'gmail.png',outlook:'outlook.svg',yahoo:'yahoo-icon.png',netflix:'netflix.png',spotify:'spotify.png',discord:'discord.svg',youtube:'../youtube/mark.svg',drive:'drive.png'}[service]), objectives: actions.map(id => ({ id, label: labels[id] })) }));
  const listeners = new Set();
  let progress = O.digitalLife.progress();
  function publish() { O.digitalLife.progress(progress); listeners.forEach(fn => fn()); }
  function getMissions() { return catalog.map((m, i) => ({ ...m, status: progress.completed[m.id] ? 'completed' : progress.active?.id === m.id ? 'active' : !i || progress.completed[catalog[i - 1].id] ? 'available' : 'locked' })); }
  function isPracticing(order) { return progress.active?.id === 'digital-' + order && !progress.active.suspended && progress.active.phase !== 'completed'; }
  function start(id) {
    const mission = getMissions().find(m => m.id === id);
    if (!mission || mission.status === 'locked' || mission.status === 'completed') return { ok: false };
    O.activityCoordinator.claim('digital-life');
    if (progress.active?.id !== id) progress.active = { id, checklist: {}, baseline: O.digitalLife.serial(), startedAt: Date.now(), phase: 'practice', suspended: false, hint: false };
    progress.active.suspended = false;
    const created = O.digitalLife.account(mission.service);
    if (created && progress.active.startedAt && created.createdAt >= progress.active.startedAt && mission.objectives.some(o => o.id === "registered")) progress.active.checklist.registered = true;
    publish();
    O.shell?.openApp?.('google');
    return { ok: true };
  }
  function stop() { if (progress.active) { progress.active.suspended = true; publish(); } O.activityCoordinator.release('digital-life'); }
  function next() { const current = catalog.find(m => m.id === progress.active?.id); if (current && progress.completed[current.id] && current.order < 12) return start('digital-' + (current.order + 1)); O.shell?.openApp?.('digitallife'); }
  function accept(action, service, detail = {}) {
    const active = progress.active, mission = catalog.find(m => m.id === active?.id);
    if (!mission || active.suspended || active.phase === 'completed') return;
    const ownService = O.digitalLife.identity(mission.service);
    if (service && O.digitalLife.identity(service) !== ownService) return;
    if (mission.order >= 9 && action !== 'search' && action !== 'logout' && action !== 'login' && !active.checklist.login) return;
    if (action === 'login' && detail.serial <= active.baseline) return;
    if (action === 'message-read' && detail.kind !== 'welcome') return;
    if (action === 'folder' && detail.value !== 'Meus Documentos') return;
    if (action === 'first-result' && !active.checklist.search) return;
    if (mission.order === 4 && action === 'search' && !active.checklist['new-tab']) return;
    if (mission.objectives.some(o => o.id === action)) active.checklist[action] = true;
    if (mission.objectives.every(o => active.checklist[o.id]) && O.digitalLife.session(mission.service)) {
      progress.completed[mission.id] = { at: Date.now(), title: mission.title };
      active.phase = 'completed';
    }
    publish();
  }
  O.events.subscribe('digital-life:action', event => accept(event.detail.action, event.detail.service, event.detail));
  O.events.subscribe('browser:action', event => {
    const d = event.detail;
    const mission = catalog.find(m => m.id === progress.active?.id);
    if (!mission) return;
    if (d.action === 'new-tab') accept('new-tab');
    const term = String(d.query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const alias = mission.service === 'google' ? 'gmail' : mission.service;
    if ((d.action === 'search' || (d.url || '').startsWith('search:')) && term.includes(alias) && (mission.order !== 9 || term.includes('entrar'))) accept('search');
    if (d.action === 'first-result' && (d.url || '').startsWith(mission.service + '.oslab.local')) accept('first-result');
  });
  O.events.subscribe('digital-life:reset', () => { progress = O.digitalLife.progress(); O.activityCoordinator.release('digital-life'); publish(); });
  O.activityCoordinator.register('digital-life', { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });
  O.digitalLifeTrail = { catalog, getMissions, getProgress: () => JSON.parse(JSON.stringify(progress)), start, stop, next, isPracticing, observe: (action, service, detail = {}) => { if (['inbox-view','song-open','open-favorite','profile-view'].includes(action) && O.digitalLife.session(service)) accept(action, service, detail); }, hint: () => { if (progress.active) { progress.active.hint = !progress.active.hint; publish(); } }, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
