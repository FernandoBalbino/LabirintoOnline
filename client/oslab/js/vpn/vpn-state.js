(function createVpnState(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const KEY = "oslab.vpn.state.v1";
  const listeners = new Set();
  const servers = Object.freeze([
    { id: "br", type: "commercial", country: "BR", name: "Brasil", ip: "198.51.100.10", latency: 35, flag: "assets/vpn/flags/br.svg" },
    { id: "us", type: "commercial", country: "US", name: "Estados Unidos", ip: "198.51.100.84", latency: 145, flag: "assets/vpn/flags/us.svg" },
    { id: "de", type: "commercial", country: "DE", name: "Alemanha", ip: "198.51.100.31", latency: 210, flag: "assets/vpn/flags/de.svg" },
    { id: "jp", type: "commercial", country: "JP", name: "Japão", ip: "198.51.100.62", latency: 310, flag: "assets/vpn/flags/jp.svg" },
    { id: "gb", type: "commercial", country: "GB", name: "Reino Unido", ip: "198.51.100.73", latency: 172, flag: "assets/vpn/flags/gb.svg" },
    { id: "ca", type: "commercial", country: "CA", name: "Canadá", ip: "198.51.100.95", latency: 158, flag: "assets/vpn/flags/ca.svg" },
    { id: "fr", type: "commercial", country: "FR", name: "França", ip: "198.51.100.47", latency: 196, flag: "assets/vpn/flags/fr.svg" },
    { id: "empresa-os", type: "corporate", country: "BR", name: "Empresa OS — Matriz Maceió", shortName: "Empresa OS", ip: "10.20.30.15", gateway: "10.20.30.1", latency: 48, corporateNetwork: "empresa-os", icon: "assets/learning/icons/building.svg" },
    { id: "escola-admin", type: "corporate", country: "BR", name: "Administração da Escola", shortName: "Escola OS", ip: "203.0.113.50", gateway: "203.0.113.1", latency: 42, corporateNetwork: "escola-admin", icon: "assets/learning/icons/shield_checkmark.svg" },
  ]);
  const defaults = () => ({
    version: 1,
    connected: false,
    type: null,
    serverId: null,
    country: "BR",
    countryName: "Brasil",
    originalCountry: "BR",
    originalCountryName: "Brasil",
    originalIp: "192.0.2.25",
    currentIp: "192.0.2.25",
    latency: 22,
    corporateNetwork: null,
    gateway: null,
    wifiCurrent: "Casa_OS",
    connectedAt: null,
    lastUpdatedAt: null,
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function load() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(KEY) || "null");
      return parsed && typeof parsed === "object" ? { ...defaults(), ...parsed } : defaults();
    } catch (_error) { return defaults(); }
  }
  let state = load();
  function server(id) { return servers.find((entry) => entry.id === id) || null; }
  function snapshot() {
    const activeServer = server(state.serverId);
    return { ...clone(state), server: activeServer ? clone(activeServer) : null };
  }
  function persist() {
    state.lastUpdatedAt = new Date().toISOString();
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_error) { /* Mantém o laboratório em memória. */ }
  }
  function notify(reason, detail = {}) {
    persist();
    const current = snapshot();
    listeners.forEach((listener) => listener(current, reason, detail));
    OSLab.events.emit("vpn:changed", { reason, vpn: current, ...detail }, "vpnState");
    return current;
  }
  function connect(id) {
    const target = server(id);
    if (!target) return { ok: false, reason: "missing-server" };
    state = {
      ...state,
      connected: true,
      type: target.type,
      serverId: target.id,
      country: target.country,
      countryName: target.name,
      currentIp: target.ip,
      latency: target.latency,
      corporateNetwork: target.corporateNetwork || null,
      gateway: target.gateway || null,
      connectedAt: new Date().toISOString(),
    };
    const current = notify("connected", { serverId: id });
    OSLab.ui?.notify?.("VPN", `Conectado a ${target.name}. Seu IP público aparente foi alterado.`, "success", 4300);
    return { ok: true, vpn: current };
  }
  function disconnect() {
    if (!state.connected) return { ok: true, vpn: snapshot() };
    state = { ...state, connected: false, type: null, serverId: null, country: state.originalCountry, countryName: state.originalCountryName, currentIp: state.originalIp, latency: 22, corporateNetwork: null, gateway: null, connectedAt: null };
    const current = notify("disconnected");
    OSLab.ui?.notify?.("VPN", "Conexão encerrada. O IP aparente voltou ao local original.", "info", 3600);
    return { ok: true, vpn: current };
  }
  function reset() {
    global.localStorage.removeItem(KEY);
    state = defaults();
    const network = OSLab.network?.getSnapshot?.();
    if (network?.connectedSsid) state.wifiCurrent = network.connectedSsid;
    return notify("reset");
  }
  function syncWifi(network, reason) {
    if (!network) return;
    state.wifiCurrent = network.connectedSsid || null;
    persist();
    if (reason === "wifi-connected") {
      const selected = network.availableNetworks.find((entry) => entry.ssid === network.connectedSsid);
      if (selected && !selected.secure) OSLab.ui?.notify?.("Rede pública", "Esta rede não possui proteção Wi-Fi configurada no simulador. Em uma rede não confiável, use HTTPS e considere um túnel VPN.", "warning", 6200);
    }
  }

  OSLab.network?.subscribe?.(syncWifi);
  OSLab.vpn = {
    key: KEY,
    servers: servers.map(clone),
    getSnapshot: snapshot,
    getServer: (id) => { const found = server(id); return found ? clone(found) : null; },
    connect,
    disconnect,
    reset,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
})(window);
