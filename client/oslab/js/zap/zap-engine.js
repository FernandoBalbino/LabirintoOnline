(function createZapEngine(global) {
  "use strict";

  // Motor da trilha Segurança Digital (WhatsApp): libera um contato por minuto, toca as falas com
  // "digitando…", aplica as escolhas do aluno e confere as tarefas no estado real do OSLab.
  const O = global.OSLab = global.OSLab || {};
  const KEY = "oslab.zap.v1";
  const GUIDE = "oslab";
  const story = () => O.zapStory;
  const norm = (value) => story().norm(value);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const params = new URLSearchParams(global.location?.search || "");
  // ?zapintervalo=10 encurta a espera para o professor testar a trilha.
  const custom = Number(params.get("zapintervalo"));
  const INTERVAL = custom >= 3 && custom <= 600 ? custom * 1000 : 60000;
  const listeners = new Set();
  const timers = new Set();
  const pumping = new Set();
  let focusedChat = null;
  let ticker = null;

  function initialSites() {
    return {
      netflix: {
        session: null,
        accounts: {
          "carol.martins@gmail.com": { owner: "carol", name: "Carol", password: "Carol@2010", profiles: ["Carol", "HACKER 😈"], devicesOut: false },
          "antonio.vizinho@gmail.com": { owner: "antonio", name: "Antônio", password: "Antonio1955", profiles: ["Netinho"], devicesOut: false },
        },
      },
      facebook: { session: null, email: "junior.silva@gmail.com", password: "junior123", passwordChanged: false, spamDeleted: false, twoFactor: false, pendingCode: null },
    };
  }
  const SETTINGS = () => ({ twoStep: false, lastSeen: "all", photo: "all" });
  const blank = () => ({ version: 1, theme: null, profile: null, phone: null, settings: SETTINGS(), flags: {}, startedAt: null, released: 0, lastReleaseAt: 0, chats: {}, sites: initialSites(), seq: 0, finished: false });

  let state = blank();
  try {
    const saved = JSON.parse(global.localStorage.getItem(KEY));
    if (saved?.version === 1) state = saved;
  } catch (_) { /* armazenamento indisponível: a trilha roda só nesta sessão */ }
  Object.values(state.chats).forEach((chat) => { chat.typing = null; });
  state.settings = { ...SETTINGS(), ...(state.settings || {}) };
  state.flags = state.flags || {};

  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* sem persistência */ } }
  function emit(type, detail = {}) {
    save();
    listeners.forEach((listener) => { try { listener(type, detail); } catch (error) { console.error(error); } });
    O.events?.emit?.(`zap:${type}`, detail, "zap");
  }
  function later(fn, ms) {
    const id = global.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }

  function contact(id) { return id === GUIDE ? story().guide : story().contacts.find((item) => item.id === id) || null; }
  function asMessage(value) { return typeof value === "string" ? { t: "text", text: value } : { ...value }; }
  function labelFor(option) {
    if (option.label) return option.label;
    if (option.text) return option.text;
    return "Enviar";
  }

  function newChat(id) {
    return { id, messages: [], queue: [], view: null, lastView: null, step: null, status: "active", outcome: null, unread: 0, typing: null, blocked: false, lastAt: Date.now() };
  }
  function firstName() { return String(state.profile?.name || "").split(" ")[0] || "você"; }
  const fill = (text) => String(text).replace(/\{nome\}/g, firstName());
  function push(id, from, message) {
    const chat = state.chats[id];
    const entry = { id: ++state.seq, from, at: Date.now(), ...asMessage(message) };
    if (from !== "me") { if (entry.text) entry.text = fill(entry.text); if (entry.caption) entry.caption = fill(entry.caption); }
    if (from === "me") entry.status = "sent";
    chat.messages.push(entry);
    chat.lastAt = entry.at;
    if (from === "them" && focusedChat !== id) chat.unread += 1;
    emit("message", { chatId: id, message: entry, focused: focusedChat === id });
    return entry;
  }

  // ---------- Fila de falas: mensagens e controles tocados em ordem ----------
  function typingDelay(message) {
    if (message.t === "text") return Math.min(2600, 650 + String(message.text).length * 26);
    if (message.t === "audio") return 2200;
    if (["image", "link", "file"].includes(message.t)) return 1300;
    if (message.t === "lesson" || message.t === "report") return 1400;
    return 0;
  }
  function enqueue(id, items) {
    const chat = state.chats[id];
    chat.queue.push(...items);
    save();
    pump(id);
  }
  function pump(id) {
    const chat = state.chats[id];
    if (!chat || pumping.has(id)) return;
    if (!chat.queue.length) return;
    pumping.add(id);
    const item = chat.queue[0];
    // Tira o item da fila ANTES de mostrar o efeito dele: a tela consulta a fila para saber se
    // ainda tem alguém digitando; com o item lá, as respostas só apareciam ao reabrir a conversa.
    const take = () => { chat.queue.shift(); save(); };
    const next = (pause = 380) => later(() => { pumping.delete(id); pump(id); }, chat.queue.length ? pause : 0);
    if (item.ctl) {
      if (item.ctl === "wait") { later(() => { take(); next(0); }, item.ms || 0); return; }
      take();
      runControl(id, item);
      next(0);
      return;
    }
    const message = asMessage(item);
    const delay = typingDelay(message);
    chat.messages.forEach((entry) => { if (entry.from === "me") entry.status = "read"; });
    if (!delay) { take(); push(id, message.t === "system" || message.t === "call" ? "system" : "them", message); next(); return; }
    chat.typing = message.t === "audio" ? "audio" : "text";
    emit("typing", { chatId: id, typing: chat.typing });
    later(() => {
      chat.typing = null;
      take();
      push(id, "them", message);
      next();
    }, delay);
  }
  function runControl(id, item) {
    const chat = state.chats[id];
    if (item.ctl === "view") presentStep(id, item.step);
    if (item.ctl === "stay") { chat.view = chat.lastView; emit("view", { chatId: id }); }
    if (item.ctl === "block") {
      chat.blocked = true;
      push(id, "system", { t: "system", text: item.report ? "Você bloqueou e denunciou este contato." : "Você bloqueou este contato." });
    }
    if (item.ctl === "end") finish(id, item.end, item.lesson);
  }

  // ---------- Etapas e escolhas ----------
  function ctx() {
    return {
      O, norm, state,
      wifi() {
        const net = O.network?.getSnapshot?.() || {};
        const ssid = net.connectedSsid || "REDE_OSLAB";
        const password = net.knownNetworks?.[ssid]?.password || net.availableNetworks?.find((item) => item.ssid === ssid)?.password || "oslab2026";
        return { ssid, password };
      },
      disk() {
        const storage = O.systemState.getStorage();
        const format = O.systemTools.formatBytes;
        return { free: format(storage.freeBytes), total: format(storage.totalBytes), used: format(storage.usedBytes) };
      },
      shuffle(items, key) {
        let seed = Array.from(`${key}${state.startedAt}`).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
        const result = items.slice();
        for (let index = result.length - 1; index > 0; index -= 1) {
          seed = (seed * 1103515245 + 12345) >>> 0;
          const swap = seed % (index + 1);
          [result[index], result[swap]] = [result[swap], result[index]];
        }
        return result;
      },
      net() {
        const net = O.network?.getSnapshot?.() || {};
        return { ip: net.ip || "192.168.1.100", gateway: net.gateway || "192.168.1.1", mask: net.mask || "255.255.255.0" };
      },
      freeze() {
        state.flags.freezeAt = Date.now();
        save();
        O.shell?.openTextEditor?.({ frozen: true, missionId: "zap-travado" });
      },
      seedFile, seedTrashedFile, seedNestedFile, folderCheck, netflixCheck, facebookCheck,
      zapSecurityCheck, exeCheck, frozenCheck, vpnCheck, userCheck, recycleCheck,
      sms(text) { emit("sms", { text }); },
    };
  }
  function presentStep(id, stepId) {
    const chat = state.chats[id];
    const step = contact(id).steps[stepId];
    const dynamic = typeof step.options === "function";
    const options = dynamic ? step.options(ctx()) : step.options;
    chat.step = stepId;
    chat.view = { step: stepId, labels: options.map(labelFor), dyn: dynamic ? clone(options) : null };
    chat.lastView = chat.view;
    emit("view", { chatId: id });
  }
  function stepItems(id, stepId) {
    const step = contact(id).steps[stepId];
    return [...(step.say || []), { ctl: "view", step: stepId }];
  }
  function optionDef(id, index) {
    const chat = state.chats[id];
    if (!chat?.view) return null;
    return chat.view.dyn ? chat.view.dyn[index] : contact(id).steps[chat.view.step]?.options[index] || null;
  }
  const EFFECT_WAIT = { call: 3400, hijack: 5200 };
  function followUp(id, outcome, replies, effects) {
    const list = [].concat(effects || []);
    const items = [];
    const wait = Math.max(0, ...list.map((effect) => EFFECT_WAIT[effect] || 0));
    if (wait) items.push({ ctl: "wait", ms: wait });
    items.push(...(replies || []));
    if (list.includes("block") || outcome.block) items.push({ ctl: "block", report: true });
    if (outcome.end) items.push({ ctl: "end", end: outcome.end, lesson: outcome.lesson || null });
    else if (outcome.go) items.push(...stepItems(id, outcome.go));
    else items.push({ ctl: "stay" });
    if (list.length) emit("effect", { chatId: id, effects: list });
    enqueue(id, items);
  }

  function choose(id, index) {
    const chat = state.chats[id];
    if (!chat || chat.status !== "active" || chat.queue.length || !chat.view) return { ok: false, reason: "busy" };
    const def = optionDef(id, index);
    if (!def) return { ok: false, reason: "missing" };
    if (def.attach) return { ok: true, attach: true };
    chat.lastView = chat.view;
    chat.view = null;
    // Bloquear, ligar e clicar em link são ações: só "envia" mensagem quem tem texto ou anexo.
    if (def.send || def.text) push(id, "me", def.send || { t: "text", text: def.text });
    def.run?.(ctx());
    if (def.verify) {
      const failures = def.verify(ctx());
      if (failures?.length) { followUp(id, { stay: true }, failures); return { ok: true, verified: false }; }
      followUp(id, def, def.okReply, def.effect);
      return { ok: true, verified: true };
    }
    followUp(id, def, def.reply, def.effect);
    return { ok: true };
  }

  function attach(id, index, fileId) {
    const chat = state.chats[id];
    const def = optionDef(id, index);
    const file = O.fileSystem?.get?.(fileId);
    if (!chat || !def?.attach || !file || file.kind !== "file" || file.trashedAt) return { ok: false };
    chat.lastView = chat.view;
    chat.view = null;
    const image = /^image\//.test(file.mime || "") && /^assets\//.test(file.content || "");
    push(id, "me", image ? { t: "image", src: file.content, caption: "", fileName: file.name } : { t: "file", name: file.name, size: sizeLabel(O.fileSystem.bytesForItem(file.id)), mime: file.mime || "" });
    const result = def.attach.check(clone(file), ctx());
    followUp(id, result.ok ? result : { stay: true }, result.reply, result.effect);
    return { ok: true, accepted: Boolean(result.ok) };
  }

  function sizeLabel(bytes) {
    return bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function finish(id, end, lessonKey) {
    const chat = state.chats[id];
    chat.status = "done";
    chat.outcome = end;
    chat.view = null;
    emit("finished", { chatId: id, outcome: end });
    const lesson = lessonKey ? story().lessons[lessonKey] : null;
    if (lesson) enqueue(GUIDE, [{ t: "lesson", contactId: id, contactName: contact(id).name, ...lesson }]);
    const done = summary();
    if (done.done === story().order.length && !state.finished) {
      state.finished = true;
      enqueue(GUIDE, [{ t: "report", ...done }]);
    }
  }

  // ---------- Liberação dos contatos ----------
  function release() {
    const id = story().order[state.released];
    if (!id) return;
    state.released += 1;
    state.lastReleaseAt = Date.now();
    state.chats[id] = newChat(id);
    const person = contact(id);
    try { person.seed?.(ctx()); } catch (error) { console.error("Falha ao preparar a conversa", id, error); }
    person.onRelease?.(ctx());
    emit("released", { chatId: id });
    enqueue(id, stepItems(id, "start"));
  }
  function tick() {
    if (!state.startedAt || state.released >= story().order.length || !O.users?.getCurrent?.()) return;
    if (Date.now() - state.lastReleaseAt >= INTERVAL) release();
  }
  function startTicker() { if (!ticker) ticker = global.setInterval(tick, 1000); }
  function start() {
    if (state.startedAt) { startTicker(); return false; }
    state.startedAt = Date.now();
    // A primeira pessoa chega poucos segundos depois das boas-vindas do robô.
    state.lastReleaseAt = state.startedAt - INTERVAL + 7000;
    state.chats[GUIDE] = newChat(GUIDE);
    emit("started", {});
    enqueue(GUIDE, story().guide.welcome.slice());
    startTicker();
    return true;
  }
  function resume() {
    if (!state.startedAt) return;
    startTicker();
    Object.keys(state.chats).forEach(pump);
  }

  function summary() {
    const chats = story().order.map((id) => ({ id, chat: state.chats[id], kind: contact(id).kind }));
    const done = chats.filter((item) => item.chat?.status === "done");
    return {
      total: story().order.length,
      released: state.released,
      done: done.length,
      helped: done.filter((item) => item.kind === "learn" && item.chat.outcome === "good").length,
      learnTotal: chats.filter((item) => item.kind === "learn").length,
      avoided: done.filter((item) => item.kind !== "learn" && item.chat.outcome === "good").length,
      fell: done.filter((item) => item.kind !== "learn" && item.chat.outcome === "bad").length,
    };
  }

  // ---------- Preparação e conferência no OSLab ----------
  function root(name) { return O.fileSystem.roots[name]; }
  function zapItems(owner) { return O.fileSystem.snapshot().items.filter((item) => item.sourceId === `zap-${owner}`); }
  function fileSpec(owner, spec, parentId) {
    return { parentId, name: spec.name, kind: "file", mime: spec.mime, content: spec.content, sizeBytes: spec.sizeBytes, sourceId: `zap-${owner}`, missionId: "zap", createdByMission: true };
  }
  function seedFile(owner, spec) {
    if (zapItems(owner).length) return null;
    return O.fileSystem.create(fileSpec(owner, spec, root(spec.parent)));
  }
  function seedTrashedFile(owner, spec) {
    if (zapItems(owner).length) return null;
    const item = O.fileSystem.create(fileSpec(owner, spec, root(spec.parent)));
    O.fileSystem.delete(item.id);
    return item;
  }
  function seedNestedFile(owner, spec) {
    if (zapItems(owner).length) return null;
    let parentId = root(spec.parent);
    spec.folders.forEach((name) => {
      const folder = O.fileSystem.find(parentId, name, "folder") || O.fileSystem.create({ parentId, name, kind: "folder", missionId: "zap", createdByMission: true });
      parentId = folder.id;
    });
    return O.fileSystem.create(fileSpec(owner, spec, parentId));
  }
  function folderCheck() {
    const folder = O.fileSystem.list(root("desktop")).find((item) => item.kind === "folder" && norm(item.name) === "curriculos");
    if (!folder) return ["Não achei a pasta “Currículos” na sua Área de Trabalho 🤔", "Botão direito num espaço vazio → Novo → Pasta"];
    const inside = O.fileSystem.list(folder.id).some((item) => norm(item.name) === "curriculo-joao.pdf");
    if (!inside) return ["A pasta está lá! Mas o curriculo-joao.pdf não está dentro dela 📁", "Ele está em Downloads: recorta e cola dentro de Currículos"];
    return null;
  }
  function netflixAccount(owner) { return Object.values(state.sites.netflix.accounts).find((item) => item.owner === owner); }
  function netflixCheck(owner) {
    const account = netflixAccount(owner);
    if (owner === "antonio") {
      return account.profiles.some((name) => norm(name) === "antonio") ? null : ["Ainda não apareceu nenhum perfil “Antônio” aqui 🤔", "Entra na conta e clica em Gerenciar perfis → Adicionar perfil"];
    }
    if (account.password === "Carol@2010") return ["Tentei aqui e a senha antiga ainda funciona 😬", "Entra em netflix.com/login e vai em Conta → Alterar senha"];
    if (account.password !== "Carol#Segura26") return ["A senha mudou, mas não é a que eu pedi 😅", "A nova tem que ser Carol#Segura26"];
    if (!account.devicesOut) return ["A senha mudou! Mas o hacker continua assistindo 😱", "Na página Conta, clica em “Sair de todos os aparelhos”"];
    return null;
  }
  function facebookCheck() {
    const fb = state.sites.facebook;
    const missing = [];
    if (!fb.spamDeleted) missing.push("• o post da propaganda ainda está no meu perfil");
    if (!fb.passwordChanged) missing.push("• a senha ainda é a antiga");
    if (!fb.twoFactor) missing.push("• a autenticação de dois fatores está desligada");
    return missing.length ? ["Olhei aqui e ainda falta 👀", ...missing] : null;
  }

  function zapSecurityCheck() {
    const missing = [];
    if (!state.settings.twoStep) missing.push("• a confirmação em duas etapas ainda está desligada");
    if (state.settings.lastSeen === "all") missing.push("• o visto por último ainda aparece para todos");
    if (state.settings.photo === "all") missing.push("• sua foto do perfil ainda aparece para todos");
    return missing.length ? ["Conferi aqui e ainda falta 👀", ...missing] : null;
  }
  function exeCheck() {
    return zapItems("paulo").some((item) => !item.trashedAt) ? ["O arquivo ainda está em Downloads 👀", "Clica com o botão direito em comprovante_pix.pdf.exe e escolhe Excluir"] : null;
  }
  function frozenCheck() {
    if (!state.flags.freezeAt) return ["Você ainda nem abriu o arquivo 😅", "Clica em “Abrir o arquivo que ela mandou”"];
    if (O.shell?.isWindowOpen?.("texteditor")) return ["O Editor de Texto continua aberto aqui 👀", "Botão direito na barra de tarefas (a faixa lá embaixo) → Gerenciador de Tarefas → Editor de Texto → Finalizar tarefa"];
    return null;
  }
  function vpnCheck() {
    return O.vpn?.getSnapshot?.()?.connected ? null : ["Aqui ainda aparece que a sua VPN está desligada 🤔", "Abre o app VPN na Área de Trabalho e clica em Conectar"];
  }
  function userCheck() {
    const pedro = (O.users?.list?.() || []).find((account) => norm(account.displayName) === "pedro" || norm(account.username) === "pedro");
    if (!pedro) return ["Não achei nenhuma conta chamada Pedro no seu computador 🤔", "Configurações ⚙️ → Contas → Outros usuários → Adicionar conta"];
    if (pedro.role === "administrator") return ["A conta do Pedro está como Administrador 😬", "Tem que ser Usuário padrão, senão ele instala o que quiser"];
    return null;
  }
  function recycleCheck() {
    return [...zapItems("kaua"), ...zapItems("kaua-2")].length ? ["Ainda tem a gravação antiga ocupando espaço na sua Lixeira 👀", "Abre a Lixeira e clica em Esvaziar Lixeira"] : null;
  }

  function reset() {
    timers.forEach((id) => global.clearTimeout(id));
    timers.clear();
    pumping.clear();
    if (ticker) { global.clearInterval(ticker); ticker = null; }
    try { O.fileSystem?.removeMissionItems?.("zap"); } catch (_) { /* nada a limpar */ }
    state = blank();
    emit("reset", {});
  }

  O.zap = {
    GUIDE, INTERVAL,
    get: () => clone(state),
    chat: (id) => (state.chats[id] ? clone(state.chats[id]) : null),
    contact, summary, start, resume, choose, attach, reset,
    isStarted: () => Boolean(state.startedAt),
    // Tema escolhido pelo aluno no modal de boas-vindas ("light" | "dark"); reiniciar a trilha pergunta de novo.
    theme: () => state.theme || null,
    // Perfil do aluno no WhatsApp: nome escolhido e número aleatório de Maceió (DDD 82).
    profile: () => (state.profile ? clone(state.profile) : null),
    phone() {
      if (!state.phone) {
        const digits = (count) => Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join("");
        state.phone = `+55 82 9${digits(4)}-${digits(4)}`;
        save();
      }
      return state.phone;
    },
    setProfile(name) {
      const clean = String(name || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
      if (clean.length < 2) return false;
      state.profile = { name: clean, phone: this.phone() };
      emit("profile", { profile: clone(state.profile) });
      return true;
    },
    settings: () => clone(state.settings),
    setSetting(key, value) {
      if (key === "twoStep") state.settings.twoStep = Boolean(value);
      else if (["lastSeen", "photo"].includes(key) && ["all", "contacts", "nobody"].includes(value)) state.settings[key] = value;
      else return false;
      emit("settings", { key, value });
      return true;
    },
    setTheme(theme) { state.theme = theme === "dark" ? "dark" : "light"; emit("theme", { theme: state.theme }); },
    setFocus(id) {
      focusedChat = id || null;
      const chat = state.chats[focusedChat];
      if (chat?.unread) { chat.unread = 0; emit("read", { chatId: focusedChat }); }
    },
    nextReleaseIn: () => (state.startedAt && state.released < story().order.length ? Math.max(0, INTERVAL - (Date.now() - state.lastReleaseAt)) : null),
    // Sites simulados (Netflix e Facebook dos amigos) guardam o estado aqui.
    site: (kind) => state.sites[kind],
    touchSite(kind, action, detail = {}) { emit("site", { kind, action, ...detail }); },
    netflixWanted: () => ["carol", "antonio"].some((id) => state.chats[id] && state.chats[id].status !== "done"),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };

  if (global.document) global.document.addEventListener("DOMContentLoaded", resume);
  else resume();
})(window);
