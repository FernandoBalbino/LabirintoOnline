(function createWifiStorage(global) {
  "use strict";
  const key = "oslab.wifi.missions.v1";
  const blank = () => ({ version: 1, completed: {}, active: null, totalScore: 0 });
  global.OSLab.wifiMissionStorage = {
    key, blank,
    load() { try { const value = JSON.parse(global.localStorage.getItem(key)); return value?.version === 1 && value.completed && typeof value.completed === "object" ? { ...blank(), ...value } : blank(); } catch (_) { return blank(); } },
    save(value) { try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Continue em memória quando o armazenamento não estiver disponível. */ } },
  };
})(window);
