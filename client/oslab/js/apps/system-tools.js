(function createSystemTools(global) {
  "use strict";
  const OSLab = global.OSLab = global.OSLab || {};
  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function bytes(value) { const number = Number(value) || 0; return number >= 1024 ** 3 ? `${(number / 1024 ** 3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB` : `${(number / 1024 ** 2).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`; }
  function storageMarkup() {
    const storage = OSLab.systemState.getStorage();
    const roots = OSLab.fileSystem.roots;
    const rows = [
      ["Documentos", roots.documents, "assets/icons/win/documents.png"], ["Downloads", roots.downloads, "assets/icons/win/downloads.png"], ["Imagens", roots.pictures, "assets/icons/win/pictures.png"], ["Lixeira", "recycle", "assets/icons/recycle-bin.png"],
    ];
    const recycleBytes = OSLab.fileSystem.recycleItems().reduce((sum, item) => sum + OSLab.fileSystem.bytesForItem(item.id), 0);
    return `<header class="settings-page-heading"><button type="button" data-settings-back="system">‹</button><h1>Armazenamento</h1></header><section class="diagnostic-storage"><div class="storage-drive"><img src="assets/icons/win/disk.png" alt="" /><div><strong>Disco Local (C:)</strong><span>${bytes(storage.usedBytes)} usados de ${bytes(storage.totalBytes)}</span><div><i style="width:${storage.usedBytes / storage.totalBytes * 100}%"></i></div><small>${bytes(storage.freeBytes)} livres</small></div></div><h2>Uso por local</h2><div class="storage-location-list">${rows.map(([name, id, icon]) => { const size = id === "recycle" ? recycleBytes : OSLab.fileSystem.folderBytes(id); return `<button type="button" data-storage-open="${id}"><img src="${icon}" alt="" /><span><strong>${name}</strong><small>${id === "recycle" ? "Itens excluídos ainda ocupam espaço" : "Arquivos e subpastas"}</small></span><em>${bytes(size)}</em></button>`; }).join("")}</div></section>`;
  }
  function networkMarkup() {
    const net = OSLab.network.getSnapshot();
    const title = net.connectionType === "ethernet" ? "Ethernet" : net.connectedSsid ? `Wi-Fi (${net.connectedSsid})` : "Sem conexão";
    const status = net.internetAvailable ? "Conectado à internet" : net.adapterConnected ? "Conectado, sem internet" : "Desconectado";
    return `<header class="settings-page-heading"><h1>Rede e Internet</h1></header><section class="network-diagnostic-panel"><div class="network-live-summary"><img src="assets/settings/Network-internet.webp" alt="" /><span><strong>${safe(title)}</strong><small>${status}</small></span><em class="${net.internetAvailable ? "is-online" : ""}">${net.internetAvailable ? "Online" : "Offline"}</em></div><div class="network-mode-grid"><button type="button" class="${net.wifiEnabled ? "is-active" : ""}" data-network-action="wifi"><img src="assets/icons/ui/wifi.png" alt="" /><span>Wi-Fi</span><small>${net.wifiEnabled ? "Ativado" : "Desativado"}</small></button><button type="button" class="${net.airplaneMode ? "is-active" : ""}" data-network-action="airplane"><img src="assets/icons/ui/airplane.png" alt="" /><span>Modo avião</span><small>${net.airplaneMode ? "Ativado" : "Desativado"}</small></button><button type="button" class="${net.connectionType === "ethernet" ? "is-active" : ""}" data-network-action="ethernet-mode"><img src="assets/icons/settings-rows/ethernet.png" alt="" /><span>Ethernet</span><small>${net.ethernetCableConnected ? "Cabo conectado" : "Cabo desconectado"}</small></button></div>${net.connectionType === "wifi" && net.wifiEnabled ? `<article class="network-card"><h2>Redes disponíveis</h2>${net.availableNetworks.map((network) => `<button type="button" class="network-list-row ${net.connectedSsid === network.ssid ? "is-connected" : ""}" data-network-connect="${safe(network.ssid)}"><img src="assets/icons/ui/wifi.png" alt="" /><span><strong>${safe(network.ssid)}</strong><small>${network.secure ? "Segura" : "Aberta"} · Sinal ${network.signal}%</small></span><em>${net.connectedSsid === network.ssid ? "Conectada" : "Conectar"}</em></button>`).join("")}</article>` : ""}${net.connectionType === "ethernet" ? `<article class="network-card ethernet-cable-card"><h2>Cabo Ethernet</h2><div class="ethernet-visual ${net.ethernetCableConnected ? "is-connected" : ""}"><span class="ethernet-port"></span><span class="ethernet-wire"></span></div><p>${net.ethernetCableConnected ? "O cabo está conectado e o adaptador está ativo." : "O cabo virtual está fora da porta de rede."}</p><button type="button" data-network-action="cable">${net.ethernetCableConnected ? "Desconectar cabo" : "Conectar cabo"}</button></article>` : ""}<article class="network-card"><header><div><h2>Atribuição de IP</h2><p>${net.dhcpEnabled ? "Automática (DHCP)" : "Manual"}</p></div><button type="button" data-network-action="dhcp">${net.dhcpEnabled ? "Usar manual" : "Ativar DHCP"}</button></header><form data-network-ip-form><label>IP<input name="ip" value="${safe(net.ip)}" ${net.dhcpEnabled ? "disabled" : ""} /></label><label>Máscara<input name="mask" value="${safe(net.mask)}" ${net.dhcpEnabled ? "disabled" : ""} /></label><label>Gateway<input name="gateway" value="${safe(net.gateway)}" ${net.dhcpEnabled ? "disabled" : ""} /></label><button type="submit" ${net.dhcpEnabled ? "disabled" : ""}>Salvar IP</button></form></article><article class="network-card"><header><div><h2>Atribuição de DNS</h2><p>${net.dnsAutomatic ? "Automática" : "Manual"}</p></div><button type="button" data-network-action="dns-auto">${net.dnsAutomatic ? "Usar manual" : "Usar automático"}</button></header><form data-network-dns-form><label>Servidor DNS<input name="dns" value="${safe(net.dns)}" ${net.dnsAutomatic ? "disabled" : ""} /></label><button type="submit" ${net.dnsAutomatic ? "disabled" : ""}>Salvar DNS</button></form></article></section>`;
  }
  function wire(record, rerender) {
    if (record.systemToolsWired) return; record.systemToolsWired = true;
    record.content.addEventListener("click", (event) => {
      const storage = event.target.closest("[data-storage-open]")?.dataset.storageOpen;
      const action = event.target.closest("[data-network-action]")?.dataset.networkAction;
      const ssid = event.target.closest("[data-network-connect]")?.dataset.networkConnect;
      if (storage === "recycle") OSLab.shell.openRecycleBin(); else if (storage) OSLab.shell.openFolder(storage);
      if (ssid) { OSLab.network.connectWifi(ssid); rerender(); }
      if (!action) return;
      const net = OSLab.network.getSnapshot();
      if (action === "wifi") OSLab.network.setWifi(!net.wifiEnabled);
      if (action === "airplane") OSLab.network.setAirplaneMode(!net.airplaneMode);
      if (action === "ethernet-mode") OSLab.network.setConnectionType("ethernet");
      if (action === "cable") OSLab.network.setEthernetCable(!net.ethernetCableConnected);
      if (action === "dhcp") OSLab.network.setDhcp(!net.dhcpEnabled);
      if (action === "dns-auto") OSLab.network.setDns(net.dns, !net.dnsAutomatic);
      rerender();
    });
    record.content.addEventListener("submit", (event) => {
      const ipForm = event.target.closest("[data-network-ip-form]"); const dnsForm = event.target.closest("[data-network-dns-form]");
      if (!ipForm && !dnsForm) return; event.preventDefault();
      const values = new FormData(event.target);
      const result = ipForm ? OSLab.network.setIpConfig({ ip: values.get("ip"), mask: values.get("mask"), gateway: values.get("gateway") }) : OSLab.network.setDns(values.get("dns"), false);
      if (!result.ok) OSLab.ui.notify("Configuração inválida", "Informe endereços IPv4 válidos.", "warning"); rerender();
    });
  }
  OSLab.systemTools = { storageMarkup, networkMarkup, wire, formatBytes: bytes };
})(window);
