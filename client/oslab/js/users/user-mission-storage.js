(function createUserMissionStorage(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.users.missions.v1";
  const blank = () => ({ version: 1, completed: {}, active: null, totalScore: 0, lastMissionId: null });
  OSLab.userMissionStorage = {
    key: KEY,
    load() { try { return { ...blank(), ...(JSON.parse(global.localStorage.getItem(KEY) || "null") || {}) }; } catch (_error) { return blank(); } },
    save(value) { try { global.localStorage.setItem(KEY, JSON.stringify(value)); } catch (_error) { /* progresso permanece em memória */ } return value; },
    reset() { const value = blank(); try { global.localStorage.removeItem(KEY); } catch (_error) {} return value; },
  };
})(window);
