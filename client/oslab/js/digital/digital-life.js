(function createDigitalLife(global) {
  'use strict';
  const O = global.OSLab = global.OSLab || {};
  const KEY = 'oslab.digital-life.v1';
  const services = ['google', 'outlook', 'yahoo', 'netflix', 'spotify', 'discord'];
  const identity = service => ['gmail', 'youtube', 'drive'].includes(service) ? 'google' : service;
  const clone = value => JSON.parse(JSON.stringify(value));
  const blank = () => ({ version: 1, accounts: {}, sessions: {}, messages: {}, codes: {}, drafts: {}, browsers: {}, progress: { completed: {}, active: null }, serial: 0 });
  let state;
  try { const saved = JSON.parse(global.localStorage.getItem(KEY)); state = saved?.version === 1 ? saved : blank(); } catch (_) { state = blank(); }
  let generation = 0;
  const locks = new Set();
  function save() { global.localStorage.setItem(KEY, JSON.stringify(state)); }
  function notify(action, detail = {}) { save(); O.events.emit('digital-life:action', { action, ...detail }, 'digitalLife'); }
  function fail(message) { throw new Error(message); }
  function email(value) { return String(value || '').trim().toLowerCase(); }
  function owner(service) { return state.accounts[identity(service)] || null; }
  function session(service) { const s = identity(service); if (!state.sessions[s] || state.sessions[s] !== owner(s)?.email) return null; const result = clone(owner(s)); delete result.credentials; return result; }
  function profileData(data) {
    const name = String(data.name || '').trim();
    if (!name || name.length > 60) fail('Informe um nome de até 60 caracteres.');
    const day = Number(data.day), month = Number(data.month), year = Number(data.year);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year < 1900 || year > new Date().getFullYear() || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail('Informe uma data de nascimento válida.');
    return { name, surname: String(data.surname || '').trim().slice(0, 60), day, month, year, gender: String(data.gender || '').slice(0, 30), region: String(data.region || 'Brasil').slice(0, 40) };
  }
  function address(service, value) {
    const s = identity(service), suffix = { google: 'gmail.com', outlook: 'outlook.com', yahoo: 'yahoo.com' }[s];
    let result = email(value);
    if (suffix && !result.includes('@')) result += '@' + suffix;
    if (!/^[a-z0-9][a-z0-9._-]{2,39}@[a-z0-9.-]+\.[a-z]{2,}$/.test(result) || (suffix && result.split('@')[1] !== suffix)) fail('Escolha um endereço válido' + (suffix ? ' terminado em @' + suffix : '') + '.');
    if (['admin', 'suporte', 'teste'].includes(result.split('@')[0]) || owner(s)) fail('Este endereço está indisponível. Use outro nome ou entre na conta já criada.');
    if (!suffix && result !== owner('google')?.email) fail('Use o Gmail criado na primeira missão.');
    return result;
  }
  function validatePassword(password, confirmation) {
    if (typeof password !== 'string' || password.length < 8 || password.length > 128 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) fail('Use uma senha com 8 a 128 caracteres, letras e números.');
    if (password !== confirmation) fail('As senhas não coincidem. Digite novamente.');
  }
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  async function derive(password, salt) {
    const material = await global.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await global.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/../g), b => parseInt(b, 16)), iterations: 120000, hash: 'SHA-256' }, material, 256);
    return hex(new Uint8Array(bits));
  }
  const welcome = 'Sua conta de e-mail foi criada com sucesso! Sua caixa de entrada está pronta. Use seu novo endereço para receber mensagens e acessar seus serviços favoritos.';
  // Update welcome copy for existing students without changing message IDs or read state.
  Object.values(state.messages).flat().filter(message => message.kind === 'welcome').forEach(message => { message.body = welcome; message.from = 'Equipe de boas-vindas'; });
  async function register(service, data) {
    const s = identity(service), epoch = generation;
    if (!services.includes(s)) fail('Serviço inválido.');
    if (locks.has(s)) fail('Aguarde a criação da conta.');
    const target = address(s, data.email), profile = profileData(data);
    validatePassword(data.password, data.confirmation);
    if (s === 'google' && data.use !== 'personal') fail('Escolha Para uso pessoal.');
    if (s === 'yahoo' && !data.phoneConfirmed) fail('Conclua a confirmação.');
    if (s === 'netflix' && !state.codes[target]?.verified) fail('Leia a mensagem no Gmail e verifique o código antes de criar a senha.');
    locks.add(s);
    try {
      const salt = hex(global.crypto.getRandomValues(new Uint8Array(16))), hash = await derive(data.password, salt);
      if (epoch !== generation) fail('A sessão foi reiniciada.');
      state.accounts[s] = { email: target, profile, credentials: { salt, hash, algorithm: 'PBKDF2-SHA256', iterations: 120000 }, createdAt: Date.now(), data: {} };
      state.sessions[s] = target;
      if (['google', 'outlook', 'yahoo'].includes(s)) state.messages[s] = [{ id: s + '-welcome', from: 'Equipe de boas-vindas', to: target, subject: 'Sua conta foi criada com sucesso!', body: welcome, read: false, kind: 'welcome' }];
      notify('registered', { service: s, email: target });
      return session(s);
    } finally { if (epoch === generation) locks.delete(s); }
  }
  async function login(service, value, password) {
    const s = identity(service), account = owner(s), epoch = generation;
    if (!account || account.email !== email(value)) fail('Não encontramos essa conta. Confira o endereço criado nesta trilha.');
    const hash = await derive(String(password || ''), account.credentials.salt);
    if (epoch !== generation) fail('A sessão foi reiniciada.');
    if (hash !== account.credentials.hash) fail('Senha incorreta. Use a senha desta plataforma.');
    state.sessions[s] = account.email;
    state.serial++;
    notify('login', { service: s, email: account.email, serial: state.serial });
    return session(s);
  }
  function logout(service) { const s = identity(service); delete state.sessions[s]; notify('logout', { service: s }); }
  function inbox(service) { return session(service) ? clone(state.messages[identity(service)] || []) : []; }
  function readMessage(service, id) {
    const s = identity(service);
    if (!session(s)) fail('Entre na sua conta para ler esta mensagem.');
    const message = (state.messages[s] || []).find(m => m.id === id && m.to === session(s).email);
    if (!message) fail('Mensagem não encontrada.');
    message.read = true;
    notify('message-read', { service: s, messageId: id, kind: message.kind });
    return clone(message);
  }
  function requestNetflixCode(value) {
    if (!O.digitalLifeTrail?.isPracticing(4)) fail('A verificação por código está disponível somente na missão 04.');
    const target = email(value);
    if (target !== owner('google')?.email) fail('Informe o Gmail que você criou na missão 01.');
    if (state.codes[target]) return { sent: true, verified: state.codes[target].verified };
    // Rejection sampling avoids modulo bias; this training code never leaves the local simulator.
    let random; do { random = global.crypto.getRandomValues(new Uint32Array(1))[0]; } while (random >= 4294000000);
    const code = String(random % 1000000).padStart(6, '0');
    const id = 'netflix-verification';
    state.codes[target] = { value: code, messageId: id, verified: false, consumed: false };
    state.messages.google.push({ id, from: 'Netflix — OSLab', to: target, subject: 'Código de verificação da Netflix', body: code, read: false, kind: 'verification' });
    notify('verification-sent', { service: 'netflix' });
    return { sent: true, verified: false };
  }
  function verifyNetflixCode(value, input) {
    if (!O.digitalLifeTrail?.isPracticing(4)) fail('Retome a missão 04 para confirmar seu cadastro.');
    const entry = state.codes[email(value)];
    if (!entry || entry.consumed) fail('Este código já foi utilizado ou não está disponível.');
    if (!state.messages.google.find(m => m.id === entry.messageId)?.read) fail('Abra e leia a mensagem de verificação no Gmail antes de continuar.');
    if (String(input).trim() !== entry.value) fail('Código incorreto. Confira os seis dígitos na mensagem do Gmail.');
    entry.verified = true; entry.consumed = true; delete entry.value;
    notify('email-verified', { service: 'netflix' });
    return true;
  }
  function requireSession(service) { const a = owner(service); if (!session(service)) fail('Entre na conta para continuar.'); return a; }
  function action(service, name, value) {
    const a = requireSession(service), data = a.data;
    if (service === 'netflix') {
      if (name === 'plan') { if (!['Básico', 'Padrão', 'Premium'].includes(value)) fail('Selecione um plano.'); data.plan = value; }
      else if (name === 'payment') { if (!data.plan) fail('Escolha um plano primeiro.'); data.payment = 'demonstration'; }
      else if (name === 'profile') { if (!data.payment) fail('Adicione o cartão.'); if (!data.profile) { const label = String(value || '').trim(); if (!label || label.length > 30) fail('Informe um nome para o perfil.'); data.profile = label; } data.entered = true; }
      else fail('Ação inválida.');
    } else if (service === 'spotify' && name === 'favorite') { if (!O.digitalContent.songs.some(s => s.id === value)) fail('Música não encontrada.'); data.favorites = [...new Set([...(data.favorites || []), value])]; }
    else if (service === 'spotify' && name === 'open-favorite') { if (!data.favorites?.includes(value)) fail('Escolha um item da sua biblioteca.'); }
    else if (service === 'discord' && name === 'display-name') { const label = String(value || '').trim(); if (!label || label.length > 40) fail('Use um nome de exibição de até 40 caracteres.'); data.displayName = label; }
    else if (service === 'discord' && name === 'community') { if (!data.displayName) fail('Personalize seu nome de exibição.'); data.community = 'Comunidade OSLab'; }
    else if (service === 'drive' && name === 'folder') { const label = String(value || '').trim(); if (!label || label.length > 60 || /[\\/]/.test(label)) fail('Informe um nome de pasta válido.'); if (data.folders?.includes(label)) fail('Já existe uma pasta com esse nome.'); data.folders = [...(data.folders || []), label]; }
    else if (!(service === 'youtube' && name === 'profile-view')) fail('Ação inválida.');
    notify(name, { service, value: String(value || '').slice(0, 60) });
  }
  // Only explicitly allowed fields are persisted. Passwords, verification inputs and card fields are never drafts.
  const draftFields = new Set(['email', 'name', 'surname', 'day', 'month', 'year', 'gender', 'region', 'use', 'phoneConfirmed', 'search', 'category', 'plan']);
  function setDraft(key, draft) { state.drafts[key] = Object.fromEntries(Object.entries(draft).filter(([field]) => draftFields.has(field))); save(); }
  function getDraft(key) { return clone(state.drafts[key] || {}); }
  function browser(id, snapshot) { if (snapshot) { state.browsers[id] = clone(snapshot); save(); } return clone(state.browsers[id] || null); }
  function progress(next) { if (next) { state.progress = clone(next); save(); } return clone(state.progress); }
  function reset() { generation++; state = blank(); locks.clear(); save(); O.events.emit('digital-life:reset', {}, 'digitalLife'); }
  O.digitalLife = { key: KEY, register, login, logout, session, account: service => { const a = owner(service); if (!a) return null; const result = clone(a); delete result.credentials; return result; }, identity, address, profileData, validatePassword, inbox, readMessage, requestNetflixCode, verifyNetflixCode, action, getDraft, setDraft, browser, progress, reset, serial: () => state.serial };
})(window);
