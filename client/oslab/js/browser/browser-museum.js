(function createBrowserMuseum(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.browser.museum.progress.v1";
  const ids = ["google", "edge", "firefox", "brave", "opera"];
  const listeners = new Set();
  const defaults = () => ({ version: 1, visited: {}, completedAt: null });
  function load() { try { const value = JSON.parse(global.localStorage.getItem(KEY) || "null"); return value?.version === 1 ? { ...defaults(), ...value, visited: value.visited || {} } : defaults(); } catch (_) { return defaults(); } }
  let progress = load();
  let selected = null;
  function persist(reason) { try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_) {} listeners.forEach((listener) => listener(getProgress(), reason)); OSLab.events.emit("browser-museum:updated", { reason, progress: getProgress() }, "browserMuseum"); }
  function getProgress() { return JSON.parse(JSON.stringify(progress)); }
  function select(id) { selected = ids.includes(id) ? id : null; listeners.forEach((listener) => listener(getProgress(), "selected")); }
  function open(id) {
    if (!ids.includes(id)) return false;
    select(id);
    const record = OSLab.shell?.openApp?.(id);
    if (!record) { select(null); return false; }
    OSLab.browserApp?.render?.(record);
    if (!progress.visited[id]) {
      progress.visited[id] = new Date().toISOString();
      if (ids.every((entry) => progress.visited[entry])) progress.completedAt = new Date().toISOString();
      persist(progress.completedAt ? "completed" : "visited");
      if (progress.completedAt) OSLab.ui?.notify?.("Trilha concluída!", "Você conheceu cinco navegadores diferentes.", "success", 7000);
    }
    OSLab.windowManager?.minimize?.("browsermuseum");
    return true;
  }
  function resetAll() { progress = defaults(); try { global.localStorage.removeItem(KEY); } catch (_) {} persist("reset"); }
  OSLab.events?.subscribe?.("app:closed", (event) => { if (event.detail?.appId === selected) select(null); });
  OSLab.browserMuseum = { ids, open, select, getSelected: () => selected, getProgress, resetAll, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
})(window);
