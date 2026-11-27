(function createWifiScenarios(global) {
  "use strict";
  const O = global.OSLab;
  const networks = [
    { ssid: "Escola_Alunos", secure: true, password: "Alunos2026!", signal: 91, band: "5 GHz", security: "WPA2-Personal", channel: 149 },
    { ssid: "Escola_Visitantes", secure: true, password: "Visita2026!", signal: 74, band: "2,4 GHz", security: "WPA2-Personal", channel: 6 },
    { ssid: "Escola_Diretoria", secure: true, password: "Diretoria2026!", signal: 58, band: "5 GHz", security: "WPA3-Personal", channel: 36 },
  ];
  function prepare(order) {
    const connected = order >= 5 && order !== 7;
    const known = connected || order === 4 || order === 7;
    const snapshot = { ...O.network.defaults, wifiEnabled: order !== 1 && order !== 2, airplaneMode: order === 2, connectedSsid: connected ? "Escola_Alunos" : null, availableNetworks: JSON.parse(JSON.stringify(networks)), knownNetworks: known ? { Escola_Alunos: { password: order === 4 || order === 7 ? "SenhaAntiga!" : "Alunos2026!", autoConnect: order !== 8, profile: "private", metered: false } } : {}, connectionStatus: connected ? "connected" : "disconnected", lastError: null, signalPosition: order === 9 ? "distant" : "near" };
    if (order === 9) snapshot.availableNetworks[0].signal = 24;
    O.network.restoreSnapshot(snapshot);
  }
  O.wifiScenarios = { prepare };
})(window);
