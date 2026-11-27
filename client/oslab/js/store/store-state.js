(function createStoreState(global) {
  "use strict";
  // Estado da Microsoft Store do OSLab: o que está instalado, downloads em andamento e atualizações.
  const O = global.OSLab = global.OSLab || {};
  const KEY = "oslab.store.v1";
  const listeners = new Set();
  const PREINSTALLED = ["whatsapp"];
  const catalog = () => O.storeCatalog || [];
  const byId = (id) => catalog().find((item) => item.id === id || item.app === id) || null;
  const blank = () => ({ version: 1, installed: Object.fromEntries(PREINSTALLED.map((id) => [id, { at: 0, version: 1 }])), updates: {} });
  let state = blank();
  try { const saved = JSON.parse(global.localStorage.getItem(KEY)); if (saved?.version === 1) state = { ...blank(), ...saved }; } catch (_) { /* começa limpo */ }
  const downloads = new Map(); // id -> { progress, timer, kind: "install" | "update" }
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* sem armazenamento */ } }
  function publish(type, detail = {}) {
    save();
    listeners.forEach((fn) => fn(type, detail));
    O.events?.emit?.(`store:${type}`, detail, "store");
  }
  const isInstalled = (id) => { const item = byId(id); return Boolean(item && state.installed[item.id]); };

  /** baixar leva alguns segundos e mostra porcentagem, como na loja de verdade (tamanho maior = mais demorado) */
  function install(id, options = {}) {
    const item = byId(id);
    if (!item || !item.app) return { ok: false, reason: "not-available" };
    if (state.installed[item.id] || downloads.has(item.id)) return { ok: false, reason: "busy" };
    if (options.instant) { state.installed[item.id] = { at: Date.now(), version: 1 }; publish("installed", { id: item.id, app: item.app, silent: true }); return { ok: true }; }
    const total = Math.min(9000, 3500 + item.size * 12), started = Date.now();
    const entry = { progress: 0, kind: "install" };
    downloads.set(item.id, entry);
    publish("install-started", { id: item.id, app: item.app });
    entry.timer = global.setInterval(() => {
      entry.progress = Math.min(100, Math.round((Date.now() - started) / total * 100));
      if (entry.progress < 100) { publish("progress", { id: item.id, progress: entry.progress }); return; }
      global.clearInterval(entry.timer); downloads.delete(item.id);
      state.installed[item.id] = { at: Date.now(), version: 1 };
      delete state.updates[item.id];
      publish("installed", { id: item.id, app: item.app });
      O.ui?.notify?.(`${item.title.split(" - ")[0]} instalado`, "Já está no menu Iniciar. Clique em Abrir para usar.", "success", 4200);
    }, 250);
    return { ok: true };
  }
  function uninstall(id, options = {}) {
    const item = byId(id);
    if (!item || !state.installed[item.id]) return { ok: false };
    if (downloads.has(item.id)) { global.clearInterval(downloads.get(item.id).timer); downloads.delete(item.id); }
    delete state.installed[item.id]; delete state.updates[item.id];
    if (item.app && O.shell?.isWindowOpen?.(item.app)) O.shell.closeApp(item.app);
    publish("uninstalled", { id: item.id, app: item.app, silent: Boolean(options.silent) });
    return { ok: true };
  }
  function cancel(id) {
    const entry = downloads.get(id);
    if (!entry) return;
    global.clearInterval(entry.timer); downloads.delete(id);
    publish("canceled", { id });
  }
  function markUpdates(ids) { ids.forEach((id) => { if (state.installed[id]) state.updates[id] = true; }); publish("updates-available", { ids }); }
  /** "Obter atualizações" na Biblioteca: baixa uma por uma */
  function updateAll() {
    const ids = Object.keys(state.updates).filter((id) => state.installed[id] && !downloads.has(id));
    if (!ids.length) { publish("up-to-date", {}); return { ok: true, count: 0 }; }
    ids.forEach((id, index) => {
      const entry = { progress: 0, kind: "update" }; downloads.set(id, entry);
      const started = Date.now() + index * 1200;
      entry.timer = global.setInterval(() => {
        entry.progress = Math.max(0, Math.min(100, Math.round((Date.now() - started) / 2600 * 100)));
        if (entry.progress < 100) { publish("progress", { id, progress: entry.progress }); return; }
        global.clearInterval(entry.timer); downloads.delete(id);
        state.installed[id].version += 1; delete state.updates[id];
        publish("updated", { id });
        if (!Object.keys(state.updates).length) publish("updates-done", { count: ids.length });
      }, 250);
    });
    publish("updates-started", { ids });
    return { ok: true, count: ids.length };
  }
  function installedApps() {
    return catalog().filter((item) => item.app && state.installed[item.id]).map((item) => ({ id: item.app, product: item.id, name: item.title.split(":")[0].replace(" - Músicas e Podcasts", "").replace("Alarmes e Relógio do Windows", "Relógio"), icon: item.icon, version: state.installed[item.id].version, at: state.installed[item.id].at, update: Boolean(state.updates[item.id]) }));
  }
  function reset() { downloads.forEach((entry) => global.clearInterval(entry.timer)); downloads.clear(); state = blank(); publish("reset", {}); }

  O.store = {
    get: byId, isInstalled, install, uninstall, cancel, updateAll, markUpdates, installedApps, reset,
    download: (id) => { const d = downloads.get(byId(id)?.id); return d ? { progress: d.progress, kind: d.kind } : null; },
    hasUpdate: (id) => Boolean(state.updates[byId(id)?.id]),
    updatesCount: () => Object.keys(state.updates).length,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})(window);
