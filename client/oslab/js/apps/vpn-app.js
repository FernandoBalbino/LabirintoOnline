(function createVpnApp(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  let connectingId = null;
  let debugVisible = false;

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function icon(name) { return OSLab.learningPath.icon(name); }
  function serverAsset(server) { return server.flag || server.icon || icon("shield_checkmark"); }
  function renderServer(server, current) {
    const selected = current.serverId === server.id;
    const connecting = connectingId === server.id;
    return `<button type="button" class="vpn-server ${selected ? "is-selected" : ""}" data-vpn-connect="${server.id}" ${connectingId ? "disabled" : ""}>
      <img src="${serverAsset(server)}" alt="" />
      <span><strong>${safe(server.name)}</strong><small>${server.type === "corporate" ? "Acesso privado" : `${server.latency} ms estimados`}</small></span>
      <em>${connecting ? "Conectando…" : selected ? "Conectada" : "Conectar"}</em>
    </button>`;
  }
  function debugMarkup(vpn) {
    if (!debugVisible) return "";
    const progress = OSLab.vpnLab.getProgress();
    const network = OSLab.network.getSnapshot();
    return `<section class="vpn-debug" aria-label="VPN LAB — DEBUG">
      <header><div><small>Modo professor</small><h2>VPN LAB — DEBUG</h2></div><button type="button" data-vpn-action="debug-close">Fechar</button></header>
      <div class="vpn-debug-state"><span><strong>Missão ativa</strong>${safe(progress.active?.id || "Nenhuma")}</span><span><strong>VPN</strong>${safe(vpn.serverId || "OFF")}</span><span><strong>IP atual</strong>${safe(vpn.currentIp)}</span><span><strong>Wi-Fi</strong>${safe(network.connectedSsid || "Desconectado")}</span></div>
      <h3>Conexão VPN</h3><div class="vpn-debug-actions"><button type="button" data-vpn-debug-server="off">OFF</button>${OSLab.vpn.servers.map((server) => `<button type="button" data-vpn-debug-server="${server.id}">${safe(server.id.toUpperCase())}</button>`).join("")}</div>
      <h3>Wi-Fi</h3><div class="vpn-debug-actions">${["Casa_OS", "Escola_WiFi", "Aeroporto_Free_WiFi", "Cafe_Free"].map((ssid) => `<button type="button" data-vpn-debug-wifi="${ssid}">${safe(ssid)}</button>`).join("")}</div>
      <h3>Missões</h3><div class="vpn-debug-missions">${OSLab.vpnMissionCatalog.map((mission) => `<span><button type="button" data-vpn-debug-start="${mission.id}">${mission.order}. ${safe(mission.title)}</button><label><input type="checkbox" data-vpn-debug-complete="${mission.id}" ${progress.completed[mission.id] ? "checked" : ""} /> Concluída</label></span>`).join("")}</div>
      <button class="vpn-debug-reset" type="button" data-vpn-action="debug-reset">Resetar laboratório VPN</button>
    </section>`;
  }
  function render(record) {
    records.add(record);
    const vpn = OSLab.vpn.getSnapshot();
    const commercial = OSLab.vpn.servers.filter((server) => server.type === "commercial");
    const corporate = OSLab.vpn.servers.filter((server) => server.type === "corporate");
    const activeServer = vpn.server;
    record.address.textContent = "VPN · Conexão simulada";
    record.content.innerHTML = `<section class="vpn-app">
      <header class="vpn-app-hero ${vpn.connected ? "is-connected" : ""}">
        <div class="vpn-shield"><img src="${icon(vpn.connected ? "shield_checkmark" : "lock_closed")}" alt="" /></div>
        <div><small>${connectingId ? "Conectando…" : vpn.connected ? "Conexão protegida" : "Status"}</small><h1>${connectingId ? `Conectando a ${safe(OSLab.vpn.getServer(connectingId)?.name || "servidor")}` : vpn.connected ? safe(activeServer?.name || vpn.countryName) : "Desconectado"}</h1><p>${vpn.connected ? "Seu IP público aparente foi alterado dentro do simulador." : "Escolha uma localização ou uma rede corporativa para iniciar."}</p></div>
        ${vpn.connected ? `<button type="button" data-vpn-action="disconnect" ${connectingId ? "disabled" : ""}>Desconectar</button>` : ""}
      </header>
      <div class="vpn-live-grid">
        <span><small>Seu local aparente</small><strong>${vpn.connected ? safe(vpn.countryName) : "Brasil"}</strong></span>
        <span><small>IP ${vpn.type === "corporate" ? "da rede" : "VPN"}</small><strong>${safe(vpn.currentIp)}</strong></span>
        <span><small>Latência</small><strong>${vpn.latency} ms</strong></span>
        <span><small>Tipo</small><strong>${vpn.type === "corporate" ? "VPN corporativa" : vpn.connected ? "VPN comercial" : "Conexão direta"}</strong></span>
      </div>
      <main class="vpn-server-columns"><section><header><small>Localizações disponíveis</small><h2>Servidores comerciais</h2></header><div class="vpn-server-list">${commercial.map((server) => renderServer(server, vpn)).join("")}</div></section><section><header><small>Acesso remoto</small><h2>VPNs corporativas</h2></header><p class="vpn-section-copy">Conexões corporativas liberam redes internas específicas. Elas não são equivalentes a trocar apenas de país.</p><div class="vpn-server-list">${corporate.map((server) => renderServer(server, vpn)).join("")}</div><aside class="vpn-safety-note"><img src="${icon("shield_checkmark")}" alt="" /><span><strong>Simulação segura</strong>Nenhuma conexão real é criada e nenhum IP verdadeiro é consultado.</span></aside></section></main>
      <footer class="vpn-app-footer"><span>Atalho do professor: Ctrl + Shift + Alt + V</span><button type="button" data-vpn-action="debug-open">Painel do professor</button></footer>
      ${debugMarkup(vpn)}
    </section>`;
    if (!record.vpnWired) {
      record.vpnWired = true;
      record.content.addEventListener("click", async (event) => {
        const connectId = event.target.closest("[data-vpn-connect]")?.dataset.vpnConnect;
        const action = event.target.closest("[data-vpn-action]")?.dataset.vpnAction;
        const debugServer = event.target.closest("[data-vpn-debug-server]")?.dataset.vpnDebugServer;
        const debugWifi = event.target.closest("[data-vpn-debug-wifi]")?.dataset.vpnDebugWifi;
        const debugStart = event.target.closest("[data-vpn-debug-start]")?.dataset.vpnDebugStart;
        if (connectId && !connectingId) {
          connectingId = connectId; renderAll();
          global.setTimeout(() => { OSLab.vpn.connect(connectId); connectingId = null; renderAll(); }, 1100);
        }
        if (action === "disconnect") OSLab.vpn.disconnect();
        if (action === "debug-open") { debugVisible = true; renderAll(); }
        if (action === "debug-close") { debugVisible = false; renderAll(); }
        if (action === "debug-reset" && await OSLab.ui.confirm({ title: "Resetar laboratório VPN?", message: "Conexão, progresso e estado das sete missões serão apagados.", confirmLabel: "Resetar" })) { OSLab.vpnLab.resetProgress(); OSLab.vpn.reset(); OSLab.network.connectWifi("Casa_OS"); renderAll(); }
        if (debugServer) { if (debugServer === "off") OSLab.vpn.disconnect(); else OSLab.vpn.connect(debugServer); }
        if (debugWifi) OSLab.network.connectWifi(debugWifi);
        if (debugStart) { OSLab.vpnLab.debugStart(debugStart); OSLab.shell.openApp("vpnlab"); }
      });
      record.content.addEventListener("change", (event) => {
        const missionId = event.target.closest("[data-vpn-debug-complete]")?.dataset.vpnDebugComplete;
        if (missionId) OSLab.vpnLab.setCompleted(missionId, event.target.checked);
      });
    }
  }
  function renderIndicator() {
    const indicator = document.querySelector("#vpn-indicator");
    if (!indicator) return;
    const vpn = OSLab.vpn.getSnapshot();
    indicator.classList.toggle("is-hidden", !vpn.connected);
    indicator.innerHTML = vpn.connected ? `<img src="${vpn.server?.flag || icon("shield_checkmark")}" alt="" /><span><strong>VPN</strong><small>${safe(vpn.server?.shortName || vpn.countryName)} · ${vpn.latency} ms</small></span>` : "";
    indicator.setAttribute("aria-label", vpn.connected ? `VPN conectada. Servidor: ${vpn.server?.name || vpn.countryName}. IP: ${vpn.currentIp}. Latência: ${vpn.latency} milissegundos.` : "VPN desconectada");
    indicator.title = indicator.getAttribute("aria-label");
  }
  function renderAll() { renderIndicator(); records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); }
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.altKey && event.key.toLocaleLowerCase("pt-BR") === "v") { event.preventDefault(); debugVisible = true; OSLab.shell.openApp("vpn"); renderAll(); }
  });
  OSLab.vpn.subscribe(renderAll);
  OSLab.vpnLab.subscribe(renderAll);
  OSLab.network.subscribe(renderAll);
  renderIndicator();
  OSLab.vpnApp = { render, renderAll, openDebug() { debugVisible = true; OSLab.shell.openApp("vpn"); renderAll(); } };
})(window);
