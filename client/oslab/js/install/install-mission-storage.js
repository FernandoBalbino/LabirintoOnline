(function createInstallMissionStorage(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.install.missions.progress.v1";
  const defaults = () => ({ version: 1, completed: {}, active: null, lastMissionId: null, lastUpdatedAt: null });
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(KEY) || "null");
      if (!parsed || typeof parsed !== "object") return defaults();
      return { ...defaults(), ...parsed, completed: parsed.completed || {} };
    } catch (_error) { return defaults(); }
  }
  function save(progress) {
    progress.lastUpdatedAt = new Date().toISOString();
    try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_error) { /* O laboratório continua em memória. */ }
    return progress;
  }
  OSLab.installMissionStorage = { key: KEY, load, save, reset() { global.localStorage.removeItem(KEY); return defaults(); } };
})(window);
