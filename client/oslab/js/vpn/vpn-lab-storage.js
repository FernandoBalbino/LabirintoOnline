(function createVpnLabStorage(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.vpn.progress.v1";
  const defaults = () => ({ version: 1, completed: {}, active: null, lastMissionId: null, lastUpdatedAt: null });
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(KEY) || "null");
      return parsed && typeof parsed === "object" ? { ...defaults(), ...parsed, completed: parsed.completed || {} } : defaults();
    } catch (_error) { return defaults(); }
  }
  function save(progress) {
    progress.lastUpdatedAt = new Date().toISOString();
    try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_error) { /* Mantém o progresso em memória. */ }
    return progress;
  }
  OSLab.vpnLabStorage = { key: KEY, load, save, reset() { global.localStorage.removeItem(KEY); return defaults(); } };
})(window);
