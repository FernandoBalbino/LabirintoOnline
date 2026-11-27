(function createWifiUI(global) {
  "use strict";
  const O = global.OSLab, safe = value => O.ui.escapeHtml(value), panel = document.getElementById("quick-panel");
  const img = (name, label = "") => `<img src="assets/wifi/icons/${name === "audio" ? "audio-output" : name}.${["captions", "audio"].includes(name) ? "png" : "svg"}" alt="${safe(label)}" />`;
  let selected = null, passwordEntry = false, pendingAutoConnect = true, error = "", focusBeforeDialog = null;
  const toggle = (name, enabled, attr) => `<button type="button" class="wifi-switch ${enabled ? "is-on" : ""}" role="switch" aria-checked="${enabled}" aria-label="${safe(name)}" ${attr}><span></span></button>`;
  const tile = (name, text, action, split = false) => `<div class="quick-control"><div class="quick-tile ${split ? "quick-split" : ""}" ${action === "wifi" ? 'id="quick-wifi-tile"' : ""}><button type="button" ${action === "wifi" ? 'data-wifi-action="toggle"' : action === "accessibility" ? 'data-wifi-action="accessibility"' : `data-quick-action="${action}"`} aria-label="${safe(text)}">${img(name)}</button>${split ? `<button type="button" data-wifi-action="${action === "wifi" ? "list" : "accessibility"}" aria-label="${action === "wifi" ? "Gerenciar conexões Wi-Fi" : "Opções de acessibilidade"}">${img("chevron")}</button>` : ""}</div><span ${action === "wifi" ? 'id="quick-wifi-label"' : ""}>${safe(text)}</span></div>`;
  panel.innerHTML = `<div id="quick-main-view"><div class="quick-controls-scroll"><div class="quick-actions">${tile("wifi", "Wi-Fi", "wifi", true)}${tile("airplane", "Modo avião", "airplane")}${tile("accessibility", "Acessibilidade", "accessibility", true)}${tile("leaf", "Economia de energia", "battery-saver")}${tile("captions", "Legendas ao vivo", "captions")}${tile("sun", "Luz noturna", "night-light")}</div><details class="quick-more"><summary aria-label="Mais controles">${img("more")}${img("chevron")}</summary><div class="quick-actions">${tile("bluetooth", "Bluetooth", "bluetooth")}</div><label class="quick-slider">${img("sun", "Brilho")}<input id="brightness-slider" type="range" min="20" max="100" value="86" aria-label="Brilho" /></label><span class="battery-status">Bateria <strong>100%</strong></span></details></div><div class="quick-sliders"><label class="quick-slider">${img("speaker", "Volume")}<input id="volume-slider" type="range" min="0" max="100" value="100" aria-label="Volume" /><button type="button" data-wifi-action="audio" aria-label="Configurações de som">${img("audio")}</button></label></div><footer class="quick-footer"><button type="button" data-wifi-action="settings" aria-label="Abrir Configurações">${img("settings")}</button></footer></div><div id="quick-wifi-view" class="is-hidden"><header class="wifi-flyout-heading"><button type="button" data-wifi-action="back" aria-label="Voltar às Configurações rápidas">${img("back")}</button><strong>Wi-Fi</strong><span id="wifi-flyout-switch"></span></header><div id="wifi-network-list" class="wifi-network-list"></div><footer class="wifi-flyout-footer"><button type="button" data-wifi-action="wifi-settings">Mais configurações de Wi-Fi</button><button type="button" data-wifi-action="refresh" aria-label="Atualizar redes">${img("refresh")}</button></footer></div>`;
  function show(view = "main") {
    document.getElementById("quick-main-view").classList.toggle("is-hidden", view !== "main");
    document.getElementById("quick-wifi-view").classList.toggle("is-hidden", view !== "wifi");
    panel.classList.toggle("is-wifi-view", view === "wifi");
    if (view === "wifi") O.events.emit("wifi:list-opened", {}, "quickSettings");
    render();
  }
  function render() {
    const n = O.network.getSnapshot();
    document.getElementById("quick-wifi-tile").classList.toggle("is-active", n.wifiEnabled);
    const wifiToggle = panel.querySelector('[data-wifi-action="toggle"]');
    wifiToggle.setAttribute("aria-pressed", String(n.wifiEnabled));
    document.getElementById("quick-wifi-label").textContent = n.connectedSsid || "Wi-Fi";
    panel.querySelectorAll("[data-quick-action]").forEach(button => button.closest(".quick-tile")?.classList.toggle("is-active", button.classList.contains("is-active")));
    document.getElementById("wifi-flyout-switch").innerHTML = toggle("Wi-Fi", n.wifiEnabled, 'data-wifi-action="toggle"');
    const list = document.getElementById("wifi-network-list");
    if (!n.wifiEnabled) { list.innerHTML = `<div class="wifi-empty">${img("wifi")}<strong>O Wi-Fi está desativado</strong><p>Ative o Wi-Fi para procurar redes disponíveis.</p></div>`; return; }
    const networks = [...n.availableNetworks].sort((a, b) => Number(b.ssid === n.connectedSsid) - Number(a.ssid === n.connectedSsid));
    list.innerHTML = networks.map(network => {
      const connected = network.ssid === n.connectedSsid, expanded = selected === network.ssid || connected, known = n.knownNetworks?.[network.ssid];
      return `<article class="wifi-network ${connected ? "is-connected" : ""} ${expanded ? "is-expanded" : ""}"><div class="wifi-network-top"><button type="button" class="wifi-network-select" data-wifi-select="${safe(network.ssid)}" aria-expanded="${expanded}"><span class="wifi-signal-icon" data-strength="${network.signal < 35 ? "low" : network.signal < 70 ? "medium" : "high"}">${img("wifi")}${network.secure ? img("lock") : ""}</span><span><strong>${safe(network.ssid)}</strong>${connected ? '<small>Conectado, seguro</small>' : expanded ? `<small>${network.secure ? "Segura" : "Aberta"} · Sinal ${network.signal}%</small>` : ""}</span></button>${connected ? `<button type="button" class="wifi-info-button" data-wifi-info="${safe(network.ssid)}" aria-label="Propriedades de ${safe(network.ssid)}">${img("info")}</button>` : ""}</div>${expanded ? `<div class="wifi-network-actions">${connected ? '<button class="win-button" type="button" data-wifi-action="disconnect">Desconectar</button>' : passwordEntry && selected === network.ssid ? `<form data-wifi-password-form><label>Inserir a chave de segurança de rede<input name="password" type="password" autocomplete="off" aria-label="Senha da rede ${safe(network.ssid)}" required /></label><label class="wifi-show-password"><input type="checkbox" data-show-wifi-password />Mostrar senha</label>${error ? `<p class="wifi-auth-error" role="alert">${safe(error)}</p>` : ""}<div><button type="button" class="win-button" data-wifi-action="cancel">Cancelar</button><button type="submit" class="win-button is-primary">Avançar</button></div></form>` : `<label class="wifi-auto-choice"><input type="checkbox" data-wifi-auto ${known?.autoConnect !== false ? "checked" : ""} />Conectar automaticamente</label><button type="button" class="win-button" data-wifi-connect="${safe(network.ssid)}">Conectar</button>`}</div>` : ""}</article>`;
    }).join("");
  }
  function resetPanels() { selected = null; passwordEntry = false; error = ""; panel.classList.add("is-hidden"); document.getElementById("quick-settings-button")?.setAttribute("aria-expanded", "false"); render(); }
  function connect(ssid, options) {
    const result = O.network.connectWifi(ssid, options);
    if (!result.ok) { passwordEntry = true; error = result.reason === "authentication" ? "A chave de segurança de rede não está correta. Tente novamente." : ""; }
    else { passwordEntry = false; error = ""; }
    render(); if (passwordEntry) panel.querySelector('[name="password"]')?.focus();
  }
  panel.addEventListener("click", event => {
    event.stopPropagation();
    const action = event.target.closest("[data-wifi-action]")?.dataset.wifiAction;
    const choice = event.target.closest("[data-wifi-select]")?.dataset.wifiSelect;
    const connecting = event.target.closest("[data-wifi-connect]")?.dataset.wifiConnect;
    const info = event.target.closest("[data-wifi-info]")?.dataset.wifiInfo;
    if (choice) { selected = choice; passwordEntry = false; error = ""; O.events.emit("wifi:network-selected", { ssid: choice }, "quickSettings"); render(); }
    if (connecting) { pendingAutoConnect = Boolean(panel.querySelector("[data-wifi-auto]")?.checked); connect(connecting, { autoConnect: pendingAutoConnect }); }
    if (info) { O.shell.openWifiProperties(info); resetPanels(); }
    if (action === "toggle") { selected = null; passwordEntry = false; O.network.setWifi(!O.network.getSnapshot().wifiEnabled, "quickSettings"); }
    if (action === "list") show("wifi");
    if (action === "back") show("main");
    if (action === "disconnect") { O.network.disconnectWifi(); selected = null; render(); }
    if (action === "cancel") { passwordEntry = false; error = ""; render(); }
    if (action === "settings") { resetPanels(); O.shell.openSettings("home"); }
    if (action === "wifi-settings") { resetPanels(); O.shell.openSettings("wifi"); }
    if (action === "audio") { resetPanels(); O.shell.openSettings("system"); }
    if (action === "accessibility") { resetPanels(); O.shell.openSettings("accessibility"); }
    if (action === "refresh") { render(); O.ui.notify("Wi-Fi", "A lista de redes disponíveis foi atualizada.", "info", 1800); }
    if (event.target.closest("[data-quick-action]")) requestAnimationFrame(render);
  });
  panel.addEventListener("change", event => { if (event.target.matches("[data-show-wifi-password]")) panel.querySelector('[name="password"]').type = event.target.checked ? "text" : "password"; });
  panel.addEventListener("submit", event => { if (!event.target.matches("[data-wifi-password-form]")) return; event.preventDefault(); connect(selected, { password: new FormData(event.target).get("password"), autoConnect: pendingAutoConnect }); });
  function heading(title, crumbs = []) { return `<header class="wifi-settings-heading">${crumbs.map(([label, page]) => `<button type="button" data-settings-page="${page}">${safe(label)}</button>${img("chevron")}`).join("")}<h1>${safe(title)}</h1></header>`; }
  function settingsMarkup(page, record) {
    const n = O.network.getSnapshot(), ssid = record.wifiSsid || n.connectedSsid;
    const network = n.availableNetworks.find(v => v.ssid === ssid), known = n.knownNetworks?.[ssid];
    if (page === "wifi-known") return `${heading("Gerenciar redes conhecidas", [["Rede e Internet", "network"], ["Wi-Fi", "wifi"]])}<p class="wifi-settings-intro">Gerencie os perfis de rede salvos neste computador.</p><div class="wifi-settings-cards">${Object.keys(n.knownNetworks).length ? Object.keys(n.knownNetworks).map(name => `<article class="wifi-settings-row"><button class="wifi-row-link" data-open-wifi-properties="${safe(name)}">${img("wifi")}<span>${safe(name)}</span></button><button class="win-button" data-wifi-forget="${safe(name)}">Esquecer</button></article>`).join("") : '<p class="wifi-settings-row">Nenhuma rede conhecida.</p>'}</div>`;
    if (page === "wifi-properties" && network && known) return `${heading(ssid, [["Rede e Internet", "network"], ["Wi-Fi", "wifi"]])}<details class="wifi-properties" open><summary>Propriedades de ${safe(ssid)}${img("chevron")}</summary><div class="wifi-property-line"><span>Senha de rede Wi-Fi</span><button class="win-button" data-wifi-reveal="${safe(ssid)}">Mostrar</button></div><label class="wifi-property-line wifi-auto-property"><input type="checkbox" data-wifi-property="autoConnect" data-ssid="${safe(ssid)}" ${known.autoConnect ? "checked" : ""} /><span>Conectar automaticamente quando estiver no alcance</span></label><fieldset class="wifi-profile"><legend>Tipo de perfil da rede</legend><label><input type="radio" name="wifi-profile" value="public" data-wifi-property="profile" data-ssid="${safe(ssid)}" ${known.profile === "public" ? "checked" : ""} /><span><strong>Rede pública (recomendado)</strong><small>Seu dispositivo não é detectável na rede. Use na maioria dos casos — quando conectado a uma rede em casa, no trabalho ou em um local público.</small></span></label><label><input type="radio" name="wifi-profile" value="private" data-wifi-property="profile" data-ssid="${safe(ssid)}" ${known.profile === "private" ? "checked" : ""} /><span><strong>Rede privada</strong><small>Seu dispositivo é detectável na rede. Selecione esta opção se precisar de compartilhamento de arquivos ou usar aplicativos que se comunicam por esta rede. Você deve conhecer e confiar nas pessoas e nos dispositivos na rede.</small></span></label><button class="wifi-text-link" data-wifi-help="firewall">Configurar definições de segurança e do firewall</button></fieldset><div class="wifi-metered-property"><div><strong>Conexão limitada</strong><small>Alguns aplicativos podem funcionar de forma diferente para reduzir o uso de dados quando você estiver conectado a esta rede</small><button class="wifi-text-link" data-wifi-help="data">Definir um limite de dados para ajudar a controlar o uso de dados nesta rede</button></div><span>${known.metered ? "Ativado" : "Desativado"}</span>${toggle("Conexão limitada", known.metered, `data-wifi-metered="${safe(ssid)}"`)}</div><div class="wifi-property-line"><span>Atribuição de IP:</span><span>${n.dhcpEnabled ? "Automático (DHCP)" : "Manual"}</span><button class="win-button" data-settings-page="network-advanced">Editar</button></div><div class="wifi-property-line"><span>Atribuição de servidor DNS:</span><span>${n.dnsAutomatic ? "Automático (DHCP)" : "Manual"}</span><button class="win-button" data-settings-page="network-advanced">Editar</button></div><div class="wifi-technical-details"><dl>${[["SSID:", ssid], ["Protocolo:", network.band === "5 GHz" ? "Wi-Fi 5 (802.11ac)" : "Wi-Fi 4 (802.11n)"], ["Tipo de segurança:", network.security], ["Fabricante:", "Realtek Semiconductor Corp."], ["Descrição:", "Adaptador Wi-Fi do laboratório OSLab"], ["Versão do driver:", "1030.52.1216.2025"], ["Banda de rede (canal):", `${network.band} (${network.channel})`], ["Velocidade do link agregado (Recepção/Transmissão):", "650/650 (Mbps)"], ["Intensidade do sinal:", `${network.signal}%`]].map(([name, value]) => `<dt>${safe(name)}</dt><dd>${safe(value)}</dd>`).join("")}</dl><button class="win-button" data-wifi-copy="${safe(ssid)}">Copiar</button></div></details>`;
    return `${heading("Wi-Fi", [["Rede e Internet", "network"]])}<div class="wifi-settings-cards"><article class="wifi-settings-row">${img("wifi")}<span><strong>Wi-Fi</strong><small>${n.wifiEnabled ? "Ativado" : "Desativado"}</small></span>${toggle("Wi-Fi", n.wifiEnabled, 'data-settings-wifi-toggle')}</article>${n.connectedSsid ? `<button class="wifi-settings-row" data-open-wifi-properties="${safe(n.connectedSsid)}">${img("wifi")}<span><strong>Propriedades de ${safe(n.connectedSsid)}</strong><small>Conectado, seguro</small></span>${img("chevron")}</button>` : ""}<button class="wifi-settings-row" data-wifi-open-list>${img("wifi")}<span><strong>Mostrar redes disponíveis</strong><small>Conectar a uma rede sem fio próxima</small></span>${img("chevron")}</button><button class="wifi-settings-row" data-settings-page="wifi-known">${img("settings")}<span><strong>Gerenciar redes conhecidas</strong><small>Adicionar, modificar ou esquecer redes</small></span>${img("chevron")}</button></div>`;
  }
  function networkMarkup() {
    const n = O.network.getSnapshot();
    return `${heading("Rede e Internet")}<section class="wifi-network-overview">${img("wifi")}<div><h2>${safe(n.connectedSsid || "Não conectado")}</h2><p>${n.internetAvailable ? "Conectado, seguro" : n.adapterConnected ? "Conectado, sem internet" : "Você não está conectado a nenhuma rede."}</p></div></section><div class="wifi-settings-cards"><button class="wifi-settings-row" data-settings-page="wifi">${img("wifi")}<span><strong>Wi-Fi</strong><small>Conectar, gerenciar redes conhecidas e propriedades</small></span><span>${n.wifiEnabled ? "Ativado" : "Desativado"}</span>${img("chevron")}</button><article class="wifi-settings-row">${img("airplane")}<span><strong>Modo avião</strong><small>Interromper as conexões sem fio</small></span>${toggle("Modo avião", n.airplaneMode, 'data-settings-airplane-toggle')}</article><button class="wifi-settings-row" data-settings-page="network-advanced">${img("settings")}<span><strong>Configurações avançadas de rede</strong><small>Ethernet, adaptadores, IP e DNS</small></span>${img("chevron")}</button></div>`;
  }
  function openPasswordDialog(ssid) {
    const result = O.network.revealPassword(ssid); if (!result.ok) return;
    document.getElementById("wifi-password-dialog")?.remove(); focusBeforeDialog = document.activeElement;
    const qr = global.qrcode(0, "M");
    const escapeWifi = value => String(value).replace(/([\\;,:\"])/g, "\\$1");
    qr.addData(`WIFI:T:WPA;S:${escapeWifi(ssid)};P:${escapeWifi(result.password)};;`); qr.make();
    const dialog = document.createElement("dialog"); dialog.id = "wifi-password-dialog"; dialog.className = "wifi-password-dialog"; dialog.setAttribute("aria-label", "Senha de rede Wi-Fi");
    dialog.innerHTML = `<h2>Senha de rede Wi-Fi</h2><p>Use estas informações para se conectar à rede.</p><img class="wifi-qr" src="${qr.createDataURL(5, 20)}" alt="QR Code da rede fictícia ${safe(ssid)}" /><dl><dt>Nome da rede</dt><dd>${safe(ssid)}</dd><dt>Senha</dt><dd class="wifi-password-value">${safe(result.password)}</dd></dl><small>Rede e senha fictícias do laboratório OSLab.</small><footer><button type="button" class="win-button is-primary" data-close-wifi-dialog>Fechar</button></footer>`;
    document.body.appendChild(dialog); dialog.showModal(); dialog.querySelector("button").focus();
    dialog.querySelector("button").onclick = () => dialog.close(); dialog.addEventListener("close", () => { dialog.remove(); if (focusBeforeDialog?.isConnected) focusBeforeDialog.focus(); });
  }
  function wireSettings(record, rerender) {
    if (record.wifiWired) return; record.wifiWired = true;
    record.content.addEventListener("click", event => {
      const target = event.target.closest("button"); if (!target) return;
      if (target.hasAttribute("data-open-wifi-properties")) O.shell.openWifiProperties(target.dataset.openWifiProperties);
      if (target.hasAttribute("data-wifi-open-list")) { event.stopPropagation(); O.shell.openQuickSettings("wifi"); }
      if (target.hasAttribute("data-settings-wifi-toggle")) O.network.setWifi(!O.network.getSnapshot().wifiEnabled, "settings");
      if (target.hasAttribute("data-settings-airplane-toggle")) O.network.setAirplaneMode(!O.network.getSnapshot().airplaneMode);
      if (target.dataset.wifiForget) { O.network.forgetWifi(target.dataset.wifiForget); rerender(); }
      if (target.dataset.wifiReveal) openPasswordDialog(target.dataset.wifiReveal);
      if (target.dataset.wifiMetered) { const ssid = target.dataset.wifiMetered; O.network.setWifiProperty(ssid, "metered", !O.network.getSnapshot().knownNetworks[ssid].metered); }
      if (target.dataset.wifiHelp) O.ui.notify("Configurações de rede", target.dataset.wifiHelp === "data" ? "A conexão limitada ajuda a economizar a franquia de dados desta rede." : "O firewall ajuda a controlar conexões de entrada e saída do computador.", "info");
      if (target.dataset.wifiCopy) { const n = O.network.getSnapshot(), v = n.availableNetworks.find(v => v.ssid === target.dataset.wifiCopy); const text = `SSID: ${v.ssid}\nBanda: ${v.band}\nSegurança: ${v.security}\nSinal: ${v.signal}%`; global.navigator.clipboard?.writeText(text).then(() => O.ui.notify("Wi-Fi", "Propriedades copiadas.", "success")).catch(() => O.ui.notify("Wi-Fi", text, "info")); }
    });
    record.content.addEventListener("change", event => { const el = event.target; if (el.dataset.wifiProperty) O.network.setWifiProperty(el.dataset.ssid, el.dataset.wifiProperty, el.type === "checkbox" ? el.checked : el.value); });
  }
  O.network.subscribe(render);
  O.wifiUI = { show, render, resetPanels, settingsMarkup, networkMarkup, wireSettings, img };
  render();
})(window);
