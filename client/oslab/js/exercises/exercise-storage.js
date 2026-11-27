(function createExerciseStorage(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.exercises.progress.v1";
  const defaults = () => ({ version: 1, completed: {}, attempts: {}, hints: {}, overallProgress: 0, lastExerciseId: null, lastUpdatedAt: null });
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(KEY) || "null");
      if (!parsed || typeof parsed !== "object") return defaults();
      return { ...defaults(), ...parsed, completed: parsed.completed || {}, attempts: parsed.attempts || {}, hints: parsed.hints || {} };
    } catch (_error) { return defaults(); }
  }
  function save(progress) {
    progress.overallProgress = Math.round(Object.keys(progress.completed || {}).length / 10 * 100);
    progress.lastUpdatedAt = new Date().toISOString();
    try { global.localStorage.setItem(KEY, JSON.stringify(progress)); } catch (_error) { /* Mantém a sessão em memória. */ }
    return progress;
  }
  OSLab.exerciseStorage = { key: KEY, load, save, reset() { global.localStorage.removeItem(KEY); return defaults(); } };
})(window);
