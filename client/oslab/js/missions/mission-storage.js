(function createMissionStorage(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.missions.progress";
  const defaults = () => ({ version: 1, completed: {}, active: null, medals: [], totalScore: 0, lastUpdatedAt: null });

  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(KEY) || "null");
      if (!parsed || typeof parsed !== "object") return defaults();
      return { ...defaults(), ...parsed, completed: parsed.completed || {}, medals: Array.isArray(parsed.medals) ? parsed.medals : [] };
    } catch (_error) { return defaults(); }
  }

  function save(progress) {
    progress.lastUpdatedAt = new Date().toISOString();
    try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_error) { /* O laboratório continua em memória. */ }
    return progress;
  }

  OSLab.missionStorage = { key: KEY, load, save, reset() { global.localStorage.removeItem(KEY); return defaults(); } };
})(window);
