(function createBrowserApp(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const knownHosts = ["google.com", "www.google.com", "wikipedia.org", "youtube.com", "hardware.oslab.local", "componentes.oslab.local", "falha.oslab.local", "appjavafx.local", "office.local", "netflix.com", "meuip.com", "portal.empresa.local", "bancoos.com", "speedtest.os", "meet.os", "admin.escola.local", "suporte.printix.com.br", "baixardriversgratis.net", "suporte.vertex.com.br", "facebook.com"];
  const browsers = {
    google: { name: "Google Chrome", logo: "assets/browser/chrome.svg", maker: "Google", description: "O Chrome é um dos navegadores mais utilizados no mundo.", menu: "⋮" },
    edge: { name: "Microsoft Edge", logo: "assets/browser/edge.png", maker: "Microsoft", description: "É o navegador padrão das versões atuais do Windows.", menu: "⋯" },
    firefox: { name: "Mozilla Firefox", logo: "assets/browser/firefox.png", maker: "Mozilla", description: "É um navegador de código aberto, conhecido por seu foco em privacidade e independência.", menu: "☰" },
    brave: { name: "Brave", logo: "assets/browser/brave-icon.png", maker: "Brave Software", description: "Possui recursos integrados voltados para privacidade e bloqueio de rastreadores.", menu: "☰" },
    opera: { name: "Opera", logo: "assets/browser/opera.png", maker: "Opera", description: "Possui diversos recursos integrados à própria interface.", menu: "☰" },
  };
  const movies = [
    ["Supernatural", "15 temporadas", ["Séries", "Terror", "Em alta"]], ["Horizonte de Aço", "Filme", ["Ação", "Populares"]], ["Código Aurora", "2 temporadas", ["Séries", "Ficção científica"]], ["Depois da Névoa", "Filme", ["Terror", "Em alta"]], ["Rota 2049", "Filme", ["Ficção científica", "Ação"]],
    ["Vozes do Vale", "3 temporadas", ["Séries", "Populares"]], ["O Último Farol", "Filme", ["Terror", "Filmes"]], ["Linha de Fuga", "Filme", ["Ação", "Em alta"]], ["Além do Gelo", "1 temporada", ["Séries", "Ficção científica"]], ["Cidade Submersa", "Filme", ["Ficção científica", "Filmes"]],
    ["Ponto de Retorno", "Filme", ["Ação", "Populares"]], ["Arquivo Sete", "4 temporadas", ["Séries", "Terror"]], ["Montanha Vermelha", "Filme", ["Filmes", "Em alta"]], ["Sinal Perdido", "2 temporadas", ["Séries", "Ficção científica"]], ["O Eco da Sala 13", "Filme", ["Terror", "Populares"]],
    ["Expresso Noturno", "Filme", ["Ação", "Filmes"]], ["Ponte para Ontem", "1 temporada", ["Séries", "Em alta"]], ["Órbita Zero", "Filme", ["Ficção científica", "Populares"]], ["Cerco Digital", "Filme", ["Ação", "Em alta"]], ["Maré Silenciosa", "3 temporadas", ["Séries", "Terror"]],
  ].map(([title, meta, categories], index) => ({ id: `title-${index + 1}`, title, meta, categories, poster: `assets/vpn/posters/poster-${String(index + 1).padStart(2, "0")}.jpg` }));
  const categories = ["Populares", "Séries", "Filmes", "Ação", "Terror", "Ficção científica", "Em alta"];

  function safe(value) { return OSLab.ui.escapeHtml(value); }
  function icon(name) { return OSLab.learningPath.icon(name); }
  function highlighted(target) { return OSLab.installLab?.getActiveVisualTarget?.() === target ? " is-hint-target" : ""; }
  function hostFrom(value) {
    const clean = String(value || "").trim().toLocaleLowerCase("pt-BR").replace(/^https?:\/\//, "").split("/")[0];
    if (knownHosts.includes(clean)) return clean;
    if (clean.includes("appjavafx")) return "appjavafx.local";
    if (clean.includes("office") || clean.includes("produtividade")) return "office.local";
    if (clean.includes("netflix")) return "netflix.com";
    if (clean.includes("facebook")) return "facebook.com";
    if (clean.includes("meu ip") || clean.includes("meuip")) return "meuip.com";
    if (clean.includes("speed")) return "speedtest.os";
    if (clean.includes("empresa")) return "portal.empresa.local";
    if (clean.includes("banco")) return "bancoos.com";
    if (clean.includes("escola") || clean.includes("admin")) return "admin.escola.local";
    return clean && !clean.includes(" ") ? clean : "google.com";
  }
  function pageState() { return { vpn: OSLab.vpn.getSnapshot(), network: OSLab.network.getSnapshot(), loadedAt: new Date().toISOString() }; }
  function errorCopy(reason) {
    return ({ disconnected: ["Sem conexão", "Verifique se o Wi-Fi está ativo ou se o cabo Ethernet está conectado."], "local-network": ["Rede local indisponível", "O endereço IP atual não consegue comunicar-se com o gateway."], internet: ["Sem acesso à internet", "A conexão local existe, mas o gateway não oferece acesso externo."], dns: ["Não foi possível localizar o site", "O computador está conectado, mas a resolução de nomes falhou."] })[reason] || ["Página indisponível", "Revise as configurações de rede e tente novamente."];
  }
  function netflixAvailable(state) { return state.vpn.country === "US"; }
  function portalAllowed(state) { return state.vpn.connected && state.vpn.corporateNetwork === "empresa-os"; }
  function schoolAllowed(state) { return state.vpn.connected && state.vpn.currentIp === "203.0.113.50" && state.vpn.corporateNetwork === "escola-admin"; }
  function bankAllowed(state) { return state.vpn.country === "BR"; }
  function speedMetrics(state, jitter = 0) {
    const ping = Math.max(10, Math.round((state.vpn.connected ? state.vpn.latency : 22) + Number(jitter || 0)));
    const base = !state.vpn.connected ? [320, 120] : state.vpn.serverId === "br" ? [280, 105] : state.vpn.serverId === "us" ? [180, 80] : state.vpn.serverId === "de" ? [135, 60] : state.vpn.serverId === "jp" ? [90, 35] : [165, 72];
    return { ping, download: Math.max(20, Math.round(base[0] - Math.abs(jitter) * 2)), upload: Math.max(10, Math.round(base[1] - Math.abs(jitter))) };
  }
  function emit(record, action, detail = {}) {
    const state = record.browserPageState || pageState();
    OSLab.events.emit("vpn-browser:action", { host: record.browserHost, action, vpn: state.vpn, wifi: state.network.connectedSsid, ...detail }, "browser");
  }
  function ensureHistory(record) {
    record.browserState = record.browserState || (OSLab.digitalLifeTrail?.getProgress().active && !OSLab.digitalLifeTrail.getProgress().active.suspended ? OSLab.browserState.hydrate(OSLab.digitalLife.browser(record.appId)) : null) || OSLab.browserState.create(record.appId === "google" && OSLab.browserTrail?.getProgress?.().active?.id !== "browser-13" ? "google.com" : "newtab");
    const tab = OSLab.browserState.active(record.browserState);
    record.browserHistory = tab.history;
    record.browserHistoryIndex = tab.historyIndex;
  }
  function changed(record, action, detail = {}) {
    persistDigitalBrowser(record);
    OSLab.events.emit("browser:action", { browserId: record.appId, action, tabId: record.browserState.activeTab, url: record.browserState.currentUrl, ...detail }, "browserApp");
  }
  function persistDigitalBrowser(record) { if (OSLab.digitalLifeTrail?.getProgress().active && record.browserState) OSLab.digitalLife.browser(record.appId, OSLab.browserState.snapshot(record.browserState)); }
  function load(record, value, options = {}) {
    OSLab.digitalSites?.capture(record);
    ensureHistory(record);
    const raw = String(value || "");
    const isSearch = raw.startsWith("search:");
    const searchQuery = isSearch ? decodeURIComponent(raw.slice(7)) : "";
    const digitalRoute = OSLab.digitalSites?.resolve(raw);
    const host = isSearch ? "google.com" : digitalRoute ? digitalRoute.service + ".oslab.local" : hostFrom(raw);
    const historyValue = isSearch ? `search:${encodeURIComponent(searchQuery)}` : digitalRoute ? digitalRoute.url : raw.includes("/") || raw.includes("?") ? raw.replace(/^https?:\/\//, "") : host;
    const didChange = OSLab.browserState.navigate(record.browserState, historyValue, { push: options.push });
    ensureHistory(record);
    record.browserHost = host;
    record.googleQuery = isSearch ? searchQuery : null;
    record.browserResult = digitalRoute ? { ok: true, host, ip: "127.0.0.1", reason: null } : ["appjavafx.local", "office.local", "newtab", "wikipedia.org", "youtube.com", "hardware.oslab.local", "componentes.oslab.local", "falha.oslab.local", "suporte.printix.com.br", "baixardriversgratis.net", "suporte.vertex.com.br"].includes(host) ? { ok: true, host, ip: "127.0.0.1", reason: null } : OSLab.network.browse(host);
    record.browserPageState = pageState();
    if (host === "speedtest.os") record.speedResult = null;
    if (host === "meet.os") record.meetJoined = false;
    record.browserLoading = !digitalRoute;
    render(record);
    record.content.scrollTop = 0;
    const loadId = record.browserLoadId = (record.browserLoadId || 0) + 1;
    if (!digitalRoute) global.setTimeout(() => { if (!record.element?.isConnected || record.browserLoadId !== loadId) return; record.browserLoading = false; record.toolbar.querySelector(".browser-loading")?.remove(); observe(record); }, 260);
    if (didChange || options.action === "refresh") changed(record, options.action || (isSearch ? "search" : "navigate"), { query: searchQuery, source: options.source || "address", value: historyValue });
    persistDigitalBrowser(record);
    return record.browserResult;
  }
  function performSearch(record, query, source = "page") {
    const term = String(query || "").trim();
    if (!term) return load(record, "google.com");
    OSLab.software?.recordSearch?.(term);
    [OSLab.audioSites, OSLab.driverSites].forEach((sites) => sites?.recordSearch?.(term));
    return load(record, `search:${encodeURIComponent(term)}`, { source });
  }
  function restoreClosed(record) {
    const tab = OSLab.browserState.restore(record.browserState);
    if (!tab) return false;
    record.browserState.historyOpen = false;
    load(record, tab.url, { push: false });
    changed(record, "restore-tab", { restoredUrl: tab.url, restoredTabId: tab.id });
    return true;
  }
  function currentLocation(record) { return record.browserState?.currentUrl || (record.googleQuery ? `search:${encodeURIComponent(record.googleQuery)}` : record.browserHost || "google.com"); }
  function observe(record) {
    const state = record.browserPageState;
    if (!record.browserResult?.ok || !state) return;
    if (record.browserHost === "netflix.com" && String(record.netflixSearch || "").trim().toLocaleLowerCase("pt-BR") === "supernatural") {
      emit(record, netflixAvailable(state) ? "netflix-supernatural-us" : state.vpn.country === "BR" ? "netflix-unavailable-br" : "netflix-unavailable");
    }
    if (record.browserHost === "portal.empresa.local") emit(record, portalAllowed(state) ? "portal-open" : "portal-denied");
    if (record.browserHost === "meuip.com") emit(record, state.vpn.country === "DE" ? "myip-view-de" : state.vpn.country === "BR" ? "myip-view-br" : "myip-view");
    if (record.browserHost === "bancoos.com") emit(record, bankAllowed(state) ? "bank-authorized-br" : state.vpn.country === "JP" ? "bank-blocked-jp" : "bank-blocked");
    if (record.browserHost === "admin.escola.local" && !schoolAllowed(state)) emit(record, "school-denied");
  }
  function toolbar(record) {
    ensureHistory(record);
    record.element.dataset.browserHint = visualTarget(record);
    const browser = browsers[record.appId] || browsers.google;
    record.element.dataset.browser = record.appId;
    record.element.classList.add("sim-browser-window");
    record.toolbar.classList.remove("is-hidden");
    record.toolbar.classList.add("vpn-browser-toolbar");
    const downloads = Object.values(OSLab.software?.getState?.().downloads || {});
    const active = downloads.filter((download) => download.status === "downloading").length;
    const state = record.browserState;
    const address = record.googleQuery ? `google.com/search?q=${record.googleQuery}` : state.currentUrl === "newtab" ? "" : state.currentUrl || "google.com";
    const fav = state.favorites.some((item) => item.url === state.currentUrl);
    const identity = record.titlebar.querySelector(".window-identity");
    identity.classList.add("browser-window-identity");
    let strip = record.titlebar.querySelector(".browser-tabstrip");
    if (!strip) { strip = document.createElement("div"); strip.className = "browser-tabstrip"; record.titlebar.insertBefore(strip, record.titlebar.querySelector(".window-controls")); }
    strip.innerHTML = `${record.appId === "opera" ? `<span class="opera-menu-mark" aria-hidden="true"><img src="${browser.logo}" alt="" /></span>` : ""}${state.tabs.map((tab) => `<div class="browser-tab ${tab.id === state.activeTab ? "is-active" : ""}" data-browser-tab="${tab.id}"><img src="${OSLab.digitalSites?.logo(tab.url) || (tab.url === "newtab" ? browser.logo : tab.url === "google.com" || String(tab.url).startsWith("search:") ? "assets/digital/brands/google.png" : browser.logo)}" alt="" /><button type="button" data-browser-switch="${tab.id}" aria-label="Aba ${safe(tab.title)}" ${tab.id === state.activeTab ? 'aria-current="page"' : ""}>${safe(tab.title)}</button><button type="button" data-browser-close="${tab.id}" aria-label="Fechar aba ${safe(tab.title)}">×</button></div>`).join("")}<button type="button" class="browser-new-tab" data-browser-new-tab aria-label="Nova guia" title="Nova guia">+</button>`;
    record.toolbar.innerHTML = `<button type="button" data-browser-nav="back" aria-label="Voltar" ${record.browserHistoryIndex <= 0 ? "disabled" : ""}>${ms("arrow_back")}</button><button type="button" data-browser-nav="forward" aria-label="Avançar" ${record.browserHistoryIndex >= record.browserHistory.length - 1 ? "disabled" : ""}>${ms("arrow_forward")}</button><button type="button" data-browser-nav="refresh" aria-label="Atualizar">${ms("refresh")}</button><form data-browser-address-form><span class="browser-lock" aria-hidden="true">${record.appId === "firefox" ? "◈" : state.currentUrl === "newtab" ? `<img src="assets/digital/brands/google.png" alt="" />` : ms("tune")}</span><input name="address" value="${safe(address)}" aria-label="Barra de endereço" title="Barra de endereço" spellcheck="false" placeholder="${record.appId === "google" ? "Pesquise no Google ou digite um URL" : "Pesquise ou digite um endereço"}" /><button type="submit" aria-label="Ir para endereço">${ms("arrow_forward")}</button></form>${record.appId === "brave" ? '<button type="button" class="brave-shield" aria-label="Proteções Brave"><img src="assets/learning/icons/shield_checkmark.svg" alt="" /></button>' : ""}<button type="button" class="browser-favorite${fav ? " is-saved" : ""}" data-browser-favorite aria-label="${fav ? "Favorito salvo" : "Adicionar aos favoritos"}" title="Favoritos">${fav ? "★" : ms("star")}</button><button type="button" data-browser-history aria-label="Histórico" title="Histórico">${ms("history")}</button><button type="button" class="browser-download-button${downloads.length ? " has-downloads" : ""}${active ? " has-active" : ""}${highlighted("downloads-panel")}" data-browser-downloads aria-label="Downloads">${ms("download")}${downloads.length ? `<b>${downloads.length}</b>` : ""}</button>${record.appId === "google" ? '<img class="g-avatar-sm" src="assets/icons/avatar.webp" alt="Perfil do aluno" />' : ""}<button type="button" data-browser-menu aria-label="Menu do navegador" title="${record.appId === "google" ? "Personalizar e controlar o Google Chrome" : "Menu do navegador"}">${record.appId === "google" ? ms("more_vert") : browser.menu}</button>${record.browserLoading ? `<span class="browser-loading" aria-label="Carregando"></span>` : ""}`;
  }
  function visualTarget(record) {
    if (record.appId !== "google") return "";
    const active = OSLab.browserTrail?.getProgress?.().active;
    if (!active || active.phase === "completed") return "";
    if (active.id === "browser-2") return ["address", "menu", "new-tab"][active.index] || "";
    if (active.id === "browser-3") return "address";
    if (active.id === "browser-4") return "search";
    return "";
  }
  function posterCard(movie) { return `<article class="netflix-card"><img src="${movie.poster}" alt="Capa fictícia de ${safe(movie.title)}" /><span><strong>${safe(movie.title)}</strong><small>${safe(movie.meta)}</small></span></article>`; }
  // ---------- Chrome: tema, Nova guia e cabeçalho do Google (logos e ícones oficiais) ----------
  const G = "assets/browser/google/";
  const THEME_KEY = "oslab.chrome.theme";
  const ms = (name, label = "") => `<i class="ms-ic" style="-webkit-mask-image:url(${G}${name}.svg);mask-image:url(${G}${name}.svg)" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}></i>`;
  function chromeTheme() { try { return global.localStorage.getItem(THEME_KEY); } catch (_) { return null; } }
  function setChromeTheme(theme) { try { global.localStorage.setItem(THEME_KEY, theme); } catch (_) { /* sem armazenamento */ } records.forEach((record) => record.element?.isConnected && render(record)); }
  const dark = (record) => record?.appId === "google" && chromeTheme() === "dark";
  const shortcuts = [
    ["Gmail", "gmail.oslab.local/inbox", "assets/digital/brands/gmail.png"], ["YouTube", "youtube.oslab.local", "assets/digital/youtube/mark.svg"], ["Netflix", "netflix.oslab.local", "assets/digital/brands/netflix.png"],
    ["Drive", "drive.oslab.local", "assets/digital/brands/drive.png"], ["Spotify", "spotify.oslab.local", "assets/digital/brands/spotify.png"], ["Discord", "discord.oslab.local", "assets/digital/brands/discord.svg"],
    ["Outlook", "outlook.oslab.local", "assets/digital/brands/outlook.svg"], ["Yahoo", "yahoo.oslab.local", "assets/digital/brands/yahoo-icon.png"],
  ];
  function logo(record, small = false) { return `<img class="${small ? "g-logo-sm" : "g-logo"}" src="${G}${dark(record) ? "googlelogo_light_color_272x92dp.png" : "googlelogo_color_272x92dp.png"}" alt="Google" />`; }
  function browserHome(record) {
    return `<section class="chrome-ntp"><header><button type="button" data-browser-go="gmail.oslab.local/inbox">Gmail</button><button type="button" data-google-images>Imagens</button><span class="g-apps" title="Apps do Google">${ms("apps")}</span><img class="g-avatar" src="assets/icons/avatar.webp" alt="Perfil do aluno" /></header>
      <main>${logo(record)}<form class="g-realbox${highlighted("search-box")}" data-google-search role="search">${ms("search")}<input name="query" aria-label="Pesquisar no Google" autocomplete="off" spellcheck="false" placeholder="Pesquise no Google ou digite um URL" /><img class="g-mic" src="${G}googlemic_color_24dp.png" alt="" title="Pesquisa por voz" /><img class="g-lens" src="${G}lens_2023q2_48dp.png" alt="" title="Pesquisar por imagem" /></form>
      <nav class="g-tiles" aria-label="Atalhos">${shortcuts.map(([name, url, icon]) => `<button type="button" data-browser-go="${url}"><span><img src="${icon}" alt="" /></span>${name}</button>`).join("")}</nav></main>
      ${record?.appId === "google" ? `<button type="button" class="g-customize" data-chrome-customize>${ms("edit")}Personalizar o Chrome</button>` : ""}</section>`;
  }
  function themeDialog(required) {
    const current = chromeTheme() || "light";
    const mini = (theme) => `<span class="g-mini" data-mini="${theme}" aria-hidden="true"><span class="g-mini-bar"><i></i><b></b></span><span class="g-mini-page"><img src="${G}${theme === "dark" ? "googlelogo_light_color_272x92dp.png" : "googlelogo_color_272x92dp.png"}" alt="" /><i></i><span><b></b><b></b><b></b><b></b></span></span></span>`;
    return `<div class="g-theme-backdrop"><section class="g-theme" role="dialog" aria-modal="true" aria-labelledby="g-theme-title"><img src="assets/browser/chrome.svg" alt="" /><h2 id="g-theme-title">${required ? "Boas-vindas ao Chrome" : "Aparência do Chrome"}</h2><p>Escolha o tema. Você pode mudar depois em <b>Personalizar o Chrome</b>.</p><div class="g-theme-options">${["light", "dark"].map((theme) => `<button type="button" class="g-theme-card${current === theme && !required ? " is-on" : ""}" data-chrome-theme="${theme}">${mini(theme)}<strong>${ms(theme === "dark" ? "dark_mode" : "light_mode")}${theme === "dark" ? "Escuro" : "Claro"}</strong></button>`).join("")}</div>${required ? "" : '<button type="button" class="g-theme-close" data-chrome-theme-close>Fechar</button>'}</section></div>`;
  }
  /** todas as páginas de resultados (de várias trilhas) ganham o mesmo cabeçalho do Google */
  function upgradeGoogleResults(record) {
    const page = record.content.querySelector(".google-results-page");
    if (!page) return;
    const header = page.querySelector(":scope > header"), nav = page.querySelector(":scope > nav");
    const query = header?.querySelector("input[name=query]")?.value || record.googleQuery || "";
    if (header) header.innerHTML = `<button type="button" class="g-home" data-browser-go="google.com" aria-label="Página inicial do Google">${logo(record, true)}</button><form class="g-searchbar" data-google-search role="search"><input name="query" value="${safe(query)}" aria-label="Pesquisar" autocomplete="off" spellcheck="false" /><button type="button" class="g-clear" data-google-clear aria-label="Limpar">${ms("close")}</button><i class="g-split"></i>${ms("keyboard")}<img class="g-mic" src="${G}googlemic_color_24dp.png" alt="" /><img class="g-lens" src="${G}lens_2023q2_48dp.png" alt="" /><button type="submit" class="g-go" aria-label="Pesquisa Google">${ms("search")}</button></form><span class="g-right">${ms("apps")}<img class="g-avatar" src="assets/icons/avatar.webp" alt="Perfil do aluno" /></span>`;
    const activeTab = nav?.querySelector("strong")?.textContent?.trim() || "Tudo";
    const isActive = (tab) => (["Todos", "Todas", "Tudo"].includes(activeTab) ? tab === "Tudo" : tab === activeTab);
    if (nav) nav.innerHTML = ["Tudo", "Imagens", "Vídeos", "Notícias", "Shopping", "Vídeos curtos", "Mais"].map((tab) => isActive(tab) ? `<strong>${tab}</strong>` : tab === "Imagens" ? `<button type="button" data-google-images>${tab}</button>` : `<span>${tab}</span>`).join("") + '<span class="g-tools">Ferramentas</span>';
  }
  function searchResults(record) {
    const query = String(record.googleQuery || "").trim();
    // drivers antes da Vida Digital: "driver" contém "drive" e cairia no Google Drive
    const drivers = OSLab.zapSites?.searchResults(query) || OSLab.audioSites?.searchResults(query) || OSLab.driverSites?.searchResults(query);
    if (drivers) return drivers;
    const digital = OSLab.digitalSites?.searchResult(query);
    if (digital) return digital;
    const normalized = query.toLocaleLowerCase("pt-BR");
    if (normalized.includes("hardware") || normalized.includes("peças") || normalized.includes("pecas")) {
      return `<section class="google-results-page"><header><button type="button" class="google-mini-logo" data-browser-go="google.com">Google</button><form class="google-results-search" data-google-search><input name="query" value="${safe(query)}" aria-label="Pesquisar" /><button type="submit">Pesquisar</button></form></header><nav><strong>Todos</strong><span>Imagens</span><span>Vídeos</span><span>Notícias</span></nav><main><p class="google-result-count">Resultados simulados para ${safe(query)}</p>${[["hardware.oslab.local", "Hardware — Guia Básico", "Conheça as peças principais de um computador."], ["componentes.oslab.local", "Componentes internos do computador", "Processador, memória, placa-mãe e armazenamento."], ["wikipedia.org", "Wikipédia — Computador", "Visão geral do computador e de seus componentes."], ["hardware.oslab.local", "Peças principais de um computador", "Guia para quem está começando."]].map(([url, title, description], index) => `<article class="google-result-card ${index === 0 ? "first-result" : ""}"><div><span class="result-favicon">OS</span><span><strong>${url}</strong><small>https://${url}</small></span></div><button type="button" data-browser-go="${url}" ${index === 0 ? "data-browser-first-result" : ""}>${title}</button><p>${description}</p></article>`).join("")}</main></section>`;
    }
    const office = ["office", "word", "excel", "apresenta", "slides", "produtividade"].some((term) => normalized.includes(term));
    const java = normalized.includes("appjavafx") || normalized.includes("javafx");
    const target = office ? "office" : "appjavafx";
    const first = office
      ? { host: "www.officeestudos.local", title: "Pacote Office para estudantes — Word, Excel e Slides", description: "Baixe o pacote de produtividade para criar documentos, organizar planilhas e preparar apresentações." }
      : java
        ? { host: "www.appjavafx.com.br", title: "AppJavaFX — Aplicativo para Windows", description: "Baixe gratuitamente o AppJavaFX para Windows e explore projetos, componentes e interfaces." }
        : { host: "programas.oslab.local", title: "Programas para computador — Catálogo OSLAB", description: "Conheça aplicativos educacionais, editores, leitores de PDF e ferramentas para o seu computador." };
    const extras = office
      ? [["guiadeprodutividade.local", "Como escolher um pacote de produtividade", "Compare recursos para documentos, planilhas e apresentações."], ["ajuda.oslab.local", "Primeiros passos com programas de escritório", "Um guia visual para estudantes que estão começando."]]
      : [["centraldeapps.local", "Aplicativos úteis para Windows", "Veja opções de editores, navegadores, leitores PDF e utilitários."], ["suporte.oslab.local", "Como instalar programas com segurança", "Aprenda a reconhecer downloads e assistentes de instalação."]];
    return `<section class="google-results-page"><header><button type="button" class="google-mini-logo" data-browser-go="google.com" aria-label="Voltar ao Google">Google</button><form class="google-results-search" data-google-search><input name="query" value="${safe(query)}" aria-label="Pesquisar" /><button type="submit"><img src="assets/icons/search.png" alt="Pesquisar" /></button></form><img src="assets/icons/avatar.webp" alt="Perfil do aluno" /></header><nav><strong>Todos</strong><span>Imagens</span><span>Vídeos</span><span>Notícias</span><span>Mais</span></nav><main><p class="google-result-count">Aproximadamente 8 resultados simulados (0,21 segundos)</p><article class="google-result-card first-result${highlighted("first-result")}"><div><span class="result-favicon">${office ? "O" : "A"}</span><span><strong>${safe(first.host)}</strong><small>https://${safe(first.host)} › download</small></span></div><button type="button" data-install-site="${target}">${safe(first.title)}</button><p>${safe(first.description)}</p></article>${extras.map(([host, title, description]) => `<article class="google-result-card"><div><span class="result-favicon">OS</span><span><strong>${safe(host)}</strong><small>https://${safe(host)} › artigos</small></span></div><button type="button">${safe(title)}</button><p>${safe(description)}</p></article>`).join("")}<aside><h2>Pesquisas relacionadas</h2><div><button data-google-suggestion="baixar ${safe(query)}">baixar ${safe(query)}</button><button data-google-suggestion="programa para computador">programa para computador</button><button data-google-suggestion="leitor PDF">leitor PDF</button><button data-google-suggestion="editor de texto">editor de texto</button></div></aside></main></section>`;
  }
  function appJavaFxSite() {
    return `<section class="fake-product-site java-site"><header><a href="#" data-site-section="top"><img src="assets/programs/appjavafx.svg" alt="" /><strong>AppJavaFX</strong></a><nav><button data-site-section="top">Início</button><button data-site-section="features">Recursos</button><button data-site-section="about">Sobre</button><button data-site-section="download">Download</button><button data-site-section="support">Suporte</button></nav></header><main data-site-anchor="top"><section class="product-hero"><div><small>APLICATIVO PARA WINDOWS</small><h1>Transforme ideias em interfaces com JavaFX</h1><p>Organize projetos, conheça componentes e explore exemplos em um ambiente simples, visual e feito para aprender.</p><button type="button" data-site-section="features">Conhecer recursos</button></div><img src="assets/programs/appjavafx.svg" alt="Ícone do AppJavaFX" /></section><section class="product-benefits" data-site-anchor="features"><small>RECURSOS</small><h2>Um ponto de partida para seus projetos</h2><div><article><b>01</b><h3>Projetos organizados</h3><p>Visualize estruturas e arquivos de forma clara.</p></article><article><b>02</b><h3>Componentes visuais</h3><p>Conheça controles usados em aplicações desktop.</p></article><article><b>03</b><h3>Aprendizado guiado</h3><p>Explore exemplos e boas práticas passo a passo.</p></article></div></section><section class="product-about" data-site-anchor="about"><div><small>SOBRE</small><h2>Feito para quem está começando</h2><p>O AppJavaFX é um aplicativo fictício do OSLAB. Ele simula um programa real sem executar código externo e sem acessar seus arquivos.</p></div><div class="product-stat"><strong>100%</strong><span>offline e seguro para a aula</span></div></section><section class="product-download${highlighted("download-button")}" data-site-anchor="download"><img src="assets/programs/appjavafx.svg" alt="" /><div><small>VERSÃO 1.0 PARA WINDOWS</small><h2>Baixe o AppJavaFX</h2><p>Arquivo simulado de 80 MB. O download leva exatamente 60 segundos e permanece dentro do OSLAB.</p><button type="button" data-download-start="appjavafx">Baixar AppJavaFX</button><span>AppJavaFX-Setup.exe · Windows 11</span></div></section><section class="product-faq" data-site-anchor="support"><small>SUPORTE</small><h2>Perguntas frequentes</h2><details open><summary>O download é real?</summary><p>Não. Todo o processo é uma simulação local e segura.</p></details><details><summary>Posso criar um atalho?</summary><p>Sim. O assistente permite escolher um atalho na Área de Trabalho.</p></details></section></main><footer><strong>AppJavaFX</strong><span>Produto educacional fictício do OSLAB</span></footer></section>`;
  }
  function officeSite() {
    return `<section class="fake-product-site office-site"><header><a href="#" data-site-section="top"><img src="assets/programs/office.svg" alt="" /><strong>Office Estudos</strong></a><nav><button data-site-section="top">Início</button><button data-site-section="apps">Aplicativos</button><button data-site-section="about">Sobre</button><button data-site-section="download">Download</button><button data-site-section="support">Suporte</button></nav></header><main data-site-anchor="top"><section class="product-hero"><div><small>PRODUTIVIDADE PARA SEUS ESTUDOS</small><h1>Suas ideias, seus dados e suas apresentações</h1><p>Um pacote completo para trabalhos escolares, projetos e organização do dia a dia.</p><button type="button" data-site-section="apps">Conheça os aplicativos</button></div><img src="assets/programs/office.svg" alt="Ícone do pacote Office" /></section><section class="office-apps" data-site-anchor="apps"><small>CONHEÇA OS APLICATIVOS</small><h2>Três ferramentas, um único pacote</h2><div><article><img src="assets/programs/word.svg" alt="" /><h3>Word</h3><p>Crie documentos claros e bem organizados.</p></article><article><img src="assets/programs/excel.svg" alt="" /><h3>Excel</h3><p>Organize dados, tabelas e planilhas.</p></article><article><img src="assets/programs/slides.svg" alt="" /><h3>Apresentações</h3><p>Comunique ideias em slides visuais.</p></article></div></section><section class="product-about" data-site-anchor="about"><div><small>PARA A ESCOLA</small><h2>Produtividade em todos os trabalhos</h2><p>Comece um texto no Word, organize informações no Excel e apresente o resultado em Slides.</p></div><div class="product-stat"><strong>3 em 1</strong><span>aplicativos instalados juntos</span></div></section><section class="product-download office-download${highlighted("office-download")}" data-site-anchor="download"><img src="assets/programs/office.svg" alt="" /><div><small>PACOTE COMPLETO</small><h2>Baixar pacote para Windows</h2><p>OfficeSetup.exe instala Word, Excel e Apresentações Slides. Download simulado de 60 segundos.</p><button type="button" data-download-start="office">Baixar pacote</button><span>OfficeSetup.exe · 420 MB · versão 2026.1</span></div></section><section class="product-faq" data-site-anchor="support"><small>SUPORTE</small><h2>Dúvidas frequentes</h2><details open><summary>Quais aplicativos serão instalados?</summary><p>Word, Excel e Apresentações Slides.</p></details><details><summary>Preciso de internet?</summary><p>Não. Este site e o instalador funcionam localmente no OSLAB.</p></details></section></main><footer><strong>Office Estudos</strong><span>Pacote fictício para fins educacionais</span></footer></section>`;
  }
  function downloadsPanel(record) {
    const downloads = Object.values(OSLab.software?.getState?.().downloads || {}).sort((a, b) => Number(b.startedAt) - Number(a.startedAt));
    if (!record.downloadPanelOpen && !downloads.some((download) => download.status === "downloading")) return "";
    return `<aside class="browser-downloads-panel${highlighted("downloads-panel")}" aria-label="Downloads"><header><span><strong>Downloads</strong><small>Arquivos simulados deste navegador</small></span><button type="button" data-download-close aria-label="Fechar">×</button></header>${downloads.length ? `<div>${downloads.map((download) => `<article class="download-item ${download.status === "completed" ? "is-complete" : ""}${download.installerId === "appjavafx" ? highlighted("download-file") : ""}"><img src="${OSLab.software.installers[download.installerId].icon}" alt="" /><span><strong>${safe(download.fileName)}</strong><small>${download.status === "completed" ? "Download concluído" : `${download.downloadedMb} MB de ${download.totalMb} MB · Baixando...`}</small><i><b style="width:${download.progress}%"></b></i></span><em>${download.progress}%</em><button type="button" data-open-download="${download.installerId}" ${download.status === "completed" ? "" : "disabled"}>${download.status === "completed" ? "Abrir arquivo" : "Aguarde"}</button></article>`).join("")}</div>` : `<p>Nenhum download nesta sessão.</p>`}</aside>`;
  }
  function netflix(record, state) {
    const region = state.vpn.countryName;
    if (!record.netflixProfile) {
      const profiles = [["Fernando", "assets/icons/avatar.webp"], ["Aluno", "assets/learning/mascot/oslab-mascot-neutral.png"], ["Professor", "assets/learning/mascot/oslab-mascot-help.png"], ["Convidado", "assets/learning/mascot/oslab-mascot-celebrate.png"]];
      return `<section class="netflix-site netflix-profiles"><div class="netflix-wordmark">NETFLIX <small>simulação educacional</small></div><h1>Quem está assistindo?</h1><div>${profiles.map(([name, asset]) => `<button type="button" data-netflix-profile="${name}"><img src="${asset}" alt="" /><span>${name}</span></button>`).join("")}</div></section>`;
    }
    const query = String(record.netflixSearch || "").trim();
    const supernatural = query.toLocaleLowerCase("pt-BR") === "supernatural";
    const available = netflixAvailable(state);
    const searchResult = supernatural ? available ? `<article class="netflix-feature-result"><img src="${movies[0].poster}" alt="Capa fictícia de Supernatural" /><div><small>15 temporadas · Terror e fantasia</small><h2>Supernatural</h2><p>Dois irmãos cruzam estradas misteriosas investigando fenômenos sobrenaturais nesta simulação educacional.</p><button type="button" data-netflix-watch>Assistir</button><button type="button" data-netflix-info>Informações</button></div></article>` : `<div class="netflix-empty"><h2>Nenhum resultado encontrado</h2><p>Este título não está disponível na sua região.</p><small>Região detectada: ${safe(region)}</small></div>` : "";
    return `<section class="netflix-site"><header><div class="netflix-wordmark">NETFLIX <small>simulação</small></div><form data-netflix-search><input name="query" value="${safe(query)}" placeholder="Buscar filmes e séries" aria-label="Buscar na Netflix" /><button type="submit"><img src="assets/icons/search.png" alt="" />Buscar</button></form><span>Perfil: ${safe(record.netflixProfile)}</span></header><div class="netflix-hero"><div><small>Região detectada: ${safe(region)}</small><h1>Histórias para explorar</h1><p>O catálogo desta simulação muda quando a página consulta uma nova região.</p></div></div>${searchResult || categories.map((category) => `<section class="netflix-row"><h2>${category}</h2><div>${movies.filter((movie) => movie.categories.includes(category) && (movie.title !== "Supernatural" || available)).slice(0, 6).map(posterCard).join("")}</div></section>`).join("")}</section>`;
  }
  function portal(record, state) {
    if (!portalAllowed(state)) return `<section class="access-denied"><img src="${icon("lock_closed")}" alt="" /><small>403 — ACESSO NEGADO</small><h1>Portal interno indisponível</h1><p>Este sistema está disponível apenas para dispositivos conectados à rede corporativa.</p><dl><div><dt>Origem atual</dt><dd>Internet pública</dd></div><div><dt>IP observado</dt><dd>${safe(state.vpn.currentIp)}</dd></div></dl></section>`;
    if (record.portalTicket === "1542") return `<section class="corporate-site"><header><img src="${icon("building")}" alt="" /><span><small>Empresa OS</small><strong>Portal interno</strong></span></header><main><button type="button" class="site-back" data-portal-back>← Voltar aos chamados</button><article class="ticket-detail"><small>CHAMADO #1542</small><h1>Computador do laboratório sem conexão à rede</h1><p>Status: <strong>Em atendimento</strong></p><dl><div><dt>Setor</dt><dd>Laboratório de Informática</dd></div><div><dt>Prioridade</dt><dd>Média</dd></div><div><dt>Responsável</dt><dd>Equipe de Redes</dd></div></dl></article></main></section>`;
    return `<section class="corporate-site"><header><img src="${icon("building")}" alt="" /><span><small>Empresa OS</small><strong>Portal interno</strong></span><em>Rede corporativa</em></header><main><h1>Bem-vindo ao portal</h1><div class="corporate-modules"><button type="button" data-portal-ticket="1542"><img src="${icon("list_bar")}" alt="" /><span><strong>Chamados</strong><small>3 em atendimento</small></span></button><button type="button"><img src="${icon("apps")}" alt="" /><span><strong>Funcionários</strong><small>Diretório interno</small></span></button><button type="button"><img src="${icon("folder_search")}" alt="" /><span><strong>Documentos</strong><small>Políticas e manuais</small></span></button><button type="button"><img src="${icon("hard_drive")}" alt="" /><span><strong>Inventário</strong><small>Ativos da empresa</small></span></button></div><article class="ticket-row"><span><strong>#1542</strong><small>Computador do laboratório sem conexão à rede</small></span><em>Em atendimento</em><button type="button" data-portal-ticket="1542">Abrir</button></article></main></section>`;
  }
  function myIp(record, state) {
    const isGermany = state.vpn.country === "DE";
    return `<section class="myip-site"><header><img src="${icon("globe_search")}" alt="" /><span>MEU IP <small>simulação local</small></span></header><main><small>Qual é o meu IP?</small><h1>${safe(state.vpn.currentIp)}</h1><div class="myip-country">${state.vpn.server?.flag ? `<img src="${state.vpn.server.flag}" alt="" />` : `<img src="assets/vpn/flags/br.svg" alt="" />`}<span><strong>${safe(state.vpn.countryName)}</strong><small>${state.vpn.connected ? "Conexão: VPN" : "Provedor: OS Telecom"}</small></span></div><dl><div><dt>Localização aproximada</dt><dd>${isGermany ? "Frankfurt — DE" : state.vpn.country === "BR" ? "Maceió — AL" : safe(state.vpn.countryName)}</dd></div><div><dt>Tipo</dt><dd>${state.vpn.connected ? state.vpn.type === "corporate" ? "VPN corporativa" : "VPN comercial" : "Conexão direta"}</dd></div></dl>${isGermany ? `<form data-myip-quiz><h2>Confira o que mudou</h2><fieldset><legend>Seu computador foi fisicamente para a Alemanha?</legend><label><input type="radio" name="physical" value="yes" required /> Sim</label><label><input type="radio" name="physical" value="no" required /> Não</label></fieldset><fieldset><legend>O que mudou para o site?</legend><label><input type="radio" name="changed" value="public-ip" required /> O endereço IP público aparente</label><label><input type="radio" name="changed" value="private-ip" required /> O IP privado do computador</label><label><input type="radio" name="changed" value="mac" required /> O endereço MAC</label></fieldset><button type="submit">Conferir respostas</button>${record.myIpQuizResult === false ? `<p>Revise: o site observa o IP público aparente, não o hardware do computador.</p>` : record.myIpQuizResult ? `<p class="is-correct">Respostas corretas.</p>` : ""}</form>` : ""}</main></section>`;
  }
  function bank(state) {
    if (!bankAllowed(state)) return `<section class="bank-site is-blocked"><header><span>BANCO <strong>OS</strong></span><small>Ambiente demonstrativo</small></header><main><img src="${icon("lock_closed")}" alt="" /><h1>Acesso temporariamente bloqueado</h1><p>Detectamos uma tentativa de acesso de uma localização incomum.</p><dl><div><dt>Local detectado</dt><dd>${safe(state.vpn.countryName)}</dd></div><div><dt>IP aparente</dt><dd>${safe(state.vpn.currentIp)}</dd></div></dl><small>Por segurança, tente novamente através de sua localização habitual.</small></main></section>`;
    return `<section class="bank-site"><header><span>BANCO <strong>OS</strong></span><small>Ambiente demonstrativo</small></header><main><div class="bank-approved"><img src="${icon("checkmark_circle")}" alt="" /><span><small>Acesso autorizado</small><strong>Localização detectada: Brasil</strong></span></div><section class="bank-balance"><small>Saldo fictício</small><h1>R$ 2.480,00</h1><p>Conta de demonstração · Nenhum dado bancário real</p></section><div class="bank-actions"><button>Extrato</button><button>Cartão virtual</button><button>Pagamentos</button></div></main></section>`;
  }
  function speedTest(record, state) {
    const result = record.speedResult;
    return `<section class="speed-site"><header><img src="${icon("top_speed")}" alt="" /><span><strong>SpeedTest OS</strong><small>Medição totalmente simulada</small></span></header><main><div class="speed-server"><span><small>Saída atual</small><strong>${safe(state.vpn.connected ? state.vpn.countryName : "Brasil — conexão direta")}</strong></span><span><small>VPN</small><strong>${state.vpn.connected ? "Ligada" : "Desligada"}</strong></span></div>${result ? `<div class="speed-gauges"><span><small>Ping</small><strong>${result.ping}</strong><em>ms</em></span><span><small>Download</small><strong>${result.download}</strong><em>Mbps</em></span><span><small>Upload</small><strong>${result.upload}</strong><em>Mbps</em></span></div><p>${result.ping > 200 ? "Conexão ruim para chamadas em tempo real." : result.ping >= 100 ? "Conexão aceitável, mas com atraso perceptível." : result.ping < 60 ? "Conexão excelente para videoconferência." : "Conexão boa."}</p><button type="button" data-browser-go="meet.os">Abrir OS Meet</button>` : `<div class="speed-start"><span>${state.vpn.latency}</span><small>latência estimada</small><button type="button" data-speed-run>Iniciar teste</button></div>`}</main></section>`;
  }
  function meet(record, state) {
    const ping = speedMetrics(state, 0).ping;
    const grade = ping > 200 ? ["red", "Conexão ruim"] : ping >= 100 ? ["amber", "Conexão aceitável"] : ping < 60 ? ["green", "Conexão excelente"] : ["blue", "Conexão boa"];
    return `<section class="meet-site"><header><img src="${icon("apps")}" alt="" /><span><strong>OS Meet</strong><small>Sala: Reunião Empresa OS</small></span></header><main><div class="meet-preview"><img src="assets/learning/mascot/oslab-mascot-neutral.png" alt="Prévia do participante" /><span>Fernando · câmera simulada</span></div><aside><span class="meet-quality is-${grade[0]}"><i></i>${grade[1]}</span><h1>Pronto para participar?</h1><p>Ping atual: <strong>${ping} ms</strong></p><p>${state.vpn.connected ? `VPN ativa em ${safe(state.vpn.countryName)}` : "A VPN está desligada"}</p><button type="button" data-meet-join ${!state.vpn.connected ? "disabled" : ""}>Participar agora</button>${record.meetJoined ? `<strong class="meet-joined">Você entrou na chamada.</strong>` : ""}</aside></main></section>`;
  }
  function school(record, state) {
    if (!schoolAllowed(state)) return `<section class="access-denied school-denied"><img src="${icon("shield_checkmark")}" alt="" /><small>403 — IP NÃO AUTORIZADO</small><h1>Painel administrativo restrito</h1><p>Este endereço IP não está na lista de endereços autorizados.</p><dl><div><dt>IP atual</dt><dd>${safe(state.vpn.currentIp)}</dd></div><div><dt>Conexão</dt><dd>${state.vpn.connected ? safe(state.vpn.countryName) : "Internet pública"}</dd></div></dl></section>`;
    if (record.schoolView === "lab02") return `<section class="school-site"><header><img src="${icon("shield_checkmark")}" alt="" /><span><small>Escola OS</small><strong>Painel Administrativo</strong></span></header><main><button class="site-back" data-school-view="labs">← Laboratórios</button><article class="school-lab-detail"><small>REDE ACADÊMICA</small><h1>Laboratório 02</h1><div><span><strong>20</strong>Computadores</span><span><strong>18</strong>Online</span><span><strong>2</strong>Offline</span></div><dl><dt>Gateway</dt><dd>192.168.20.1</dd></dl></article></main></section>`;
    const labButton = `<button type="button" data-school-view="lab02"><img src="${icon("apps")}" alt="" /><span><strong>Laboratório 02</strong><small>20 computadores · 18 online</small></span></button>`;
    return `<section class="school-site"><header><img src="${icon("shield_checkmark")}" alt="" /><span><small>IP autorizado</small><strong>Escola OS · Painel Administrativo</strong></span></header><main><h1>${record.schoolView === "labs" ? "Laboratórios" : "Bem-vindo ao painel"}</h1>${record.schoolView === "labs" ? `<div class="school-labs">${labButton}<button><img src="${icon("apps")}" alt="" /><span><strong>Laboratório 01</strong><small>24 computadores · 24 online</small></span></button></div>` : `<div class="corporate-modules"><button><img src="${icon("hard_drive")}" alt="" /><span><strong>Computadores</strong><small>Inventário</small></span></button><button><img src="${icon("wifi_1")}" alt="" /><span><strong>Rede</strong><small>Gateways e switches</small></span></button><button data-school-view="labs"><img src="${icon("apps")}" alt="" /><span><strong>Laboratórios</strong><small>Salas e estações</small></span></button><button><img src="${icon("list_bar")}" alt="" /><span><strong>Chamados</strong><small>Suporte técnico</small></span></button></div>`}</main></section>`;
  }
  function site(record) {
    const digital = OSLab.digitalSites?.render(record);
    if (digital) return digital;
    const state = record.browserPageState || pageState();
    const location = record.browserState?.currentUrl;
    if (location === "newtab") return newTabPage(record);
    if (!record.browserResult) return browserHome(record);
    if (!record.browserResult.ok) { const copy = errorCopy(record.browserResult.reason); return `<section class="offline-browser-error"><span>!</span><h2>${copy[0]}</h2><p>${copy[1]}</p><button type="button" data-browser-nav="refresh">Tentar novamente</button></section>`; }
    if (record.browserHost === "google.com" || record.browserHost === "www.google.com") return record.googleQuery ? searchResults(record) : browserHome(record);
    if (["wikipedia.org", "youtube.com", "hardware.oslab.local", "componentes.oslab.local", "falha.oslab.local"].includes(record.browserHost)) return educationalPage(record);
    if (record.browserHost === "appjavafx.local") return appJavaFxSite();
    if (record.browserHost === "office.local") return officeSite();
    if (OSLab.zapSites?.isHost(record.browserHost)) return OSLab.zapSites.render(record);
    if (record.browserHost === "netflix.com") return netflix(record, state);
    if (record.browserHost === "portal.empresa.local") return portal(record, state);
    if (record.browserHost === "meuip.com") return myIp(record, state);
    if (record.browserHost === "bancoos.com") return bank(state);
    if (record.browserHost === "speedtest.os") return speedTest(record, state);
    if (record.browserHost === "meet.os") return meet(record, state);
    if (record.browserHost === "admin.escola.local") return school(record, state);
    if (OSLab.audioSites?.isHost(record.browserHost)) return OSLab.audioSites.render(record);
    if (OSLab.driverSites?.isHost(record.browserHost)) return OSLab.driverSites.render(record);
    return `<section class="offline-browser-success"><span class="browser-secure">● Conexão simulada segura</span><h2>${safe(record.browserHost)}</h2><p>A página foi carregada corretamente pelo navegador virtual.</p></section>`;
  }
  function newTabPage(record) {
    const browser = browsers[record.appId];
    const links = `<div class="browser-quick-links"><button data-browser-go="google.com">Google</button><button data-browser-go="youtube.com">YouTube</button><button data-browser-go="wikipedia.org">Wikipédia</button></div>`;
    if (record.appId === "edge") return `<section class="browser-newtab-page is-edge"><header><span>Microsoft Bing</span><span>☀ 24° &nbsp; ⚙</span></header><main><h1>Microsoft Edge</h1><form data-google-search><input name="query" aria-label="Pesquisar na página inicial" placeholder="Pesquise na Web" /><button>🔍</button></form>${links}<p>Descubra a Web com o Microsoft Edge</p></main></section>`;
    if (record.appId === "firefox") return `<section class="browser-newtab-page is-firefox"><main><h1><img src="${browser.logo}" alt="" /> Firefox</h1><form data-google-search><input name="query" aria-label="Pesquisar na página inicial" placeholder="Pesquise com o Google ou digite um endereço" /><button>Pesquisar</button></form><h2>Atalhos</h2>${links}</main></section>`;
    if (record.appId === "brave") return `<section class="browser-newtab-page is-brave"><header><span><strong>0</strong> rastreadores e anúncios bloqueados</span><span><strong>0 B</strong> economizados</span><span><strong>0 s</strong> poupados</span></header><main><h1 class="brave-clock">${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</h1><form data-google-search><input name="query" aria-label="Pesquisar na página inicial" placeholder="Pesquisar com Brave Search" /><button>Pesquisar</button></form>${links}</main></section>`;
    if (record.appId === "opera") return `<section class="browser-newtab-page is-opera"><aside aria-label="Barra lateral do Opera"><img src="${browser.logo}" alt="" /><span>◉</span><span>▦</span><span>♡</span></aside><main><h1>Speed Dial</h1><form data-google-search><input name="query" aria-label="Pesquisar na página inicial" placeholder="Pesquisar na Web" /><button>Pesquisar</button></form>${links}</main></section>`;
    return browserHome(record);
  }
  function educationalPage(record) {
    const host = record.browserHost;
    if (host === "falha.oslab.local" && !record.pageRefreshed) return `<section class="browser-study-page"><h1>Não foi possível carregar completamente esta página.</h1><p>Tente atualizar a página.</p></section>`;
    if (host === "wikipedia.org") return `<section class="browser-study-page is-wiki"><header><strong>W</strong><span>WIKIPÉDIA<small>A enciclopédia livre · página simulada</small></span></header><main><h1>Computador</h1><p>Um computador processa informações com a ajuda de componentes físicos e programas.</p><h2>Conteúdo</h2><p>Processador, memória e armazenamento trabalham em conjunto.</p></main></section>`;
    if (host === "youtube.com") return `<section class="browser-study-page is-youtube"><header><strong>▶ YouTube</strong><span>Pesquisa simulada</span></header><main><h1>Aprenda sobre computadores</h1><p>Esta é uma representação local do YouTube para explorar abas.</p></main></section>`;
    return `<section class="browser-study-page"><header><strong>OSLab Estudos</strong><small>Conteúdo local · ${safe(host)}</small></header><main><small>GUIA PARA INICIANTES</small><h1>${host === "componentes.oslab.local" ? "Componentes internos" : "Hardware — Guia Básico"}</h1><p>O hardware é a parte física do computador. Conheça os componentes que fazem tudo funcionar.</p><div class="study-parts"><article><h2>Processador</h2><p>Executa instruções.</p></article><article><h2>Memória RAM</h2><p>Mantém dados em uso.</p></article><article><h2>Armazenamento</h2><p>Guarda arquivos.</p></article></div>${host === "hardware.oslab.local" ? '<button type="button" data-browser-open-tab="componentes.oslab.local">Abrir “Componentes internos” em nova aba ↗</button>' : ""}</main></section>`;
  }
  function render(record) {
    OSLab.digitalSites?.capture(record);
    records.add(record);
    toolbar(record);
    if (!record.browserHost) { const loc = record.browserState.currentUrl; record.browserHost = loc.startsWith("search:") ? "google.com" : hostFrom(loc); record.googleQuery = loc.startsWith("search:") ? decodeURIComponent(loc.slice(7)) : null; record.browserResult = { ok: true }; record.browserPageState = pageState(); }
    record.address.textContent = record.googleQuery ? `Resultados para ${record.googleQuery}` : record.browserHost ? `https://${record.browserHost}` : "Nova guia";
    const state = record.browserState;
    const browser = browsers[record.appId] || browsers.google;
    const menu = record.browserMenuOpen ? `<div class="browser-popover browser-menu" role="menu"><button type="button" data-browser-menu-action="new-tab">${record.appId === "google" ? "Nova guia" : "Nova aba"} <kbd>Ctrl+T</kbd></button><button type="button" data-browser-menu-action="history">Histórico <kbd>Ctrl+H</kbd></button><button type="button" data-browser-menu-action="favorites">Favoritos</button><button type="button" data-browser-menu-action="restore">Abas fechadas recentemente <kbd>Ctrl+Shift+T</kbd></button></div>` : "";
    const history = state.historyOpen ? `<div class="browser-popover browser-history" role="dialog" aria-label="Histórico"><header><h2>Histórico</h2><button type="button" data-browser-history-close aria-label="Fechar histórico">×</button></header><h3>Hoje</h3>${state.closedTabs.length ? `<button type="button" data-browser-restore>Abas fechadas recentemente · ${safe(state.closedTabs[0].tab.title)}</button>` : ""}${state.history.map((item) => `<button type="button" data-browser-history-go="${safe(item.url)}"><span>${new Date(item.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span><strong>${safe(item.title)}</strong><small>${safe(item.url)}</small></button>`).join("")}</div>` : "";
    const favorites = record.favoritesOpen ? `<div class="browser-popover browser-favorites" role="dialog" aria-label="Favoritos"><header><h2>Favoritos</h2><button type="button" data-browser-favorites-close aria-label="Fechar favoritos">×</button></header>${state.favorites.length ? state.favorites.map((item) => `<button type="button" data-browser-go="${safe(item.url)}">★ ${safe(item.title)}</button>`).join("") : "Nenhum favorito salvo."}</div>` : "";
    const bookmark = record.bookmarkOpen ? `<form class="browser-popover browser-bookmark" data-browser-bookmark-form><h2>Adicionar favorito</h2><label>Nome<input name="name" value="${safe(OSLab.browserState.label(state.currentUrl))}" /></label><label>Pasta<select name="folder"><option>Barra de favoritos</option></select></label><footer><button type="button" data-browser-bookmark-cancel>Cancelar</button><button type="submit">Concluído</button></footer></form>` : "";
    const museum = OSLab.browserMuseum?.getSelected?.() === record.appId ? `<aside class="browser-museum-info"><img src="${browser.logo}" alt="" /><span><strong>${browser.name}</strong><small>Desenvolvido por ${browser.maker}. ${browser.description}</small></span><button type="button" data-browser-return-museum>Voltar para navegadores</button></aside>` : "";
    record.element.classList.toggle("chrome-dark", dark(record));
    const theme = record.appId === "google" && (!chromeTheme() || record.chromeThemeOpen) ? themeDialog(!chromeTheme()) : "";
    record.content.innerHTML = `<section class="offline-browser vpn-browser-shell">${site(record)}${downloadsPanel(record)}${menu}${history}${favorites}${bookmark}${museum}${theme}</section>`;
    upgradeGoogleResults(record);
    OSLab.digitalSites?.wire(record);
    if (!record.browserWired) {
      record.browserWired = true;
      record.toolbar.addEventListener("submit", (event) => { const form = event.target.closest("[data-browser-address-form]"); if (!form) return; event.preventDefault(); const value = String(new FormData(form).get("address") || "").trim(); if (/^(gmail|outlook|yahoo|netflix|spotify|discord|youtube|drive)$/i.test(value) || /\s/.test(value) || /^(appjavafx|pacote office|word|excel|apresenta|slides|leitor pdf|editor de texto|navegador|programa para computador)/i.test(value)) performSearch(record, value, "address"); else load(record, value, { source: "address" }); });
      const navigateClick = (event) => {
        const nav = event.target.closest("[data-browser-nav]")?.dataset.browserNav;
        if (!nav) return;
        if (nav === "refresh") { record.pageRefreshed = true; load(record, currentLocation(record), { push: false, action: "refresh" }); }
        if (nav === "home") load(record, "google.com");
        if (nav === "back" && OSLab.browserState.back(record.browserState)) { load(record, currentLocation(record), { push: false }); changed(record, "back"); }
        if (nav === "forward" && OSLab.browserState.forward(record.browserState)) { load(record, currentLocation(record), { push: false }); changed(record, "forward"); }
      };
      record.titlebar.addEventListener("click", (event) => {
        const switchId = event.target.closest("[data-browser-switch]")?.dataset.browserSwitch;
        const closeId = event.target.closest("[data-browser-close]")?.dataset.browserClose;
        if (event.target.closest("[data-browser-new-tab]")) { const tab = OSLab.browserState.open(record.browserState, record.appId === "google" ? "google.com" : "newtab"); load(record, tab.url, { push: false }); changed(record, "new-tab", { openedTabId: tab.id }); }
        if (switchId && OSLab.browserState.activate(record.browserState, switchId)) { load(record, currentLocation(record), { push: false }); changed(record, "switch-tab"); }
        if (closeId) { const closed = OSLab.browserState.close(record.browserState, closeId); if (closed) { load(record, currentLocation(record), { push: false }); changed(record, "close-tab", { closedUrl: closed.url, closedTabId: closed.id }); } }
      });
      record.toolbar.addEventListener("click", (event) => {
        navigateClick(event);
        if (event.target.closest("[data-browser-downloads]")) { record.downloadPanelOpen = !record.downloadPanelOpen; render(record); }
        if (event.target.closest(".brave-shield")) OSLab.ui.notify("Proteções Brave", "As proteções de privacidade estão ativas nesta simulação local.", "info");
        if (event.target.closest("[data-browser-menu]")) { record.browserMenuOpen = !record.browserMenuOpen; render(record); changed(record, "menu"); }
        if (event.target.closest("[data-browser-history]")) { const opened = OSLab.browserState.openHistory(record.browserState); record.browserMenuOpen = false; render(record); if (opened) changed(record, "history-open"); }
        if (event.target.closest("[data-browser-favorite]")) { record.bookmarkOpen = true; render(record); changed(record, "favorite-dialog"); }
      });
      record.toolbar.addEventListener("focusin", (event) => { if (event.target.matches("[name='address']")) changed(record, "focus-address"); });
      record.content.addEventListener("click", (event) => {
        navigateClick(event);
        if (OSLab.zapSites?.click(record, event) || OSLab.audioSites?.click(record, event) || OSLab.driverSites?.click(record, event)) return;
        const go = event.target.closest("[data-browser-go]")?.dataset.browserGo; if (go) { load(record, go, { source: "page" }); if (event.target.closest("[data-browser-first-result]")) changed(record, "first-result", { value: go }); }
        const tabUrl = event.target.closest("[data-browser-open-tab]")?.dataset.browserOpenTab; if (tabUrl) { const tab = OSLab.browserState.open(record.browserState, tabUrl); load(record, tabUrl, { push: false }); changed(record, "open-tab", { value: tabUrl, openedTabId: tab.id }); }
        const historyGo = event.target.closest("[data-browser-history-go]")?.dataset.browserHistoryGo; if (historyGo) { record.browserState.historyOpen = false; load(record, historyGo, { source: "history" }); changed(record, "history-select", { value: historyGo }); }
        if (event.target.closest("[data-browser-history-close]")) { record.browserState.historyOpen = false; render(record); }
        if (event.target.closest("[data-browser-restore]")) restoreClosed(record);
        if (event.target.closest("[data-browser-favorites-close]")) { record.favoritesOpen = false; render(record); }
        if (event.target.closest("[data-browser-bookmark-cancel]")) { record.bookmarkOpen = false; render(record); }
        if (event.target.closest("[data-browser-return-museum]")) { OSLab.browserMuseum?.select?.(null); OSLab.shell.openApp("browsermuseum"); OSLab.windowManager.minimize(record.windowId); }
        const menuAction = event.target.closest("[data-browser-menu-action]")?.dataset.browserMenuAction;
        if (menuAction) { record.browserMenuOpen = false; if (menuAction === "new-tab") { const tab = OSLab.browserState.open(record.browserState, record.appId === "google" ? "google.com" : "newtab"); load(record, tab.url, { push: false }); changed(record, "new-tab", { openedTabId: tab.id }); } else if (menuAction === "history") { const opened = OSLab.browserState.openHistory(record.browserState); render(record); if (opened) changed(record, "history-open"); } else if (menuAction === "favorites") { record.favoritesOpen = true; render(record); changed(record, "favorites-open"); } else if (menuAction === "restore") restoreClosed(record); }
        const suggestion = event.target.closest("[data-google-suggestion]")?.dataset.googleSuggestion; if (suggestion) performSearch(record, suggestion);
        const theme = event.target.closest("[data-chrome-theme]")?.dataset.chromeTheme; if (theme) { record.chromeThemeOpen = false; setChromeTheme(theme); OSLab.events.emit("browser:theme", { theme }, "browserApp"); return; }
        if (event.target.closest("[data-chrome-customize]")) { record.chromeThemeOpen = true; render(record); return; }
        if (event.target.closest("[data-chrome-theme-close]")) { record.chromeThemeOpen = false; render(record); return; }
        if (event.target.closest("[data-google-clear]")) { const input = record.content.querySelector(".g-searchbar input"); if (input) { input.value = ""; input.focus(); } return; }
        if (event.target.closest("[data-google-images]")) { const q = record.content.querySelector("input[name=query]")?.value.trim(); if (q) performSearch(record, q.toLowerCase().includes("imagens") ? q : `${q} imagens`); else record.content.querySelector("input[name=query]")?.focus(); return; }
        const installSite = event.target.closest("[data-install-site]")?.dataset.installSite; if (installSite) { OSLab.software.visitSite(installSite); load(record, installSite === "office" ? "office.local" : "appjavafx.local"); }
        const section = event.target.closest("[data-site-section]")?.dataset.siteSection; if (section) { event.preventDefault(); record.content.querySelector(`[data-site-anchor="${CSS.escape(section)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
        const downloadId = event.target.closest("[data-download-start]")?.dataset.downloadStart; if (downloadId) { const result = OSLab.software.startDownload(downloadId); record.downloadPanelOpen = true; render(record); if (result.existing && result.download.status === "completed") OSLab.ui.notify("Download disponível", `${result.download.fileName} já está pronto para abrir.`, "info"); }
        const openDownload = event.target.closest("[data-open-download]")?.dataset.openDownload; if (openDownload) { const kind = OSLab.software.installers[openDownload]; if (kind?.audio) OSLab.audioInstaller.open(openDownload); else if (kind?.driver) OSLab.driverInstaller.open(openDownload); else OSLab.software.openInstaller(openDownload); }
        if (event.target.closest("[data-download-close]")) { record.downloadPanelOpen = false; render(record); }
        const profile = event.target.closest("[data-netflix-profile]")?.dataset.netflixProfile; if (profile) { record.netflixProfile = profile; render(record); emit(record, "netflix-profile", { profile }); }
        const ticket = event.target.closest("[data-portal-ticket]")?.dataset.portalTicket; if (ticket) { record.portalTicket = ticket; render(record); if (ticket === "1542") emit(record, "portal-ticket-1542", { ticket }); }
        if (event.target.closest("[data-portal-back]")) { record.portalTicket = null; render(record); }
        if (event.target.closest("[data-speed-run]")) { const jitter = (Date.now() % 9) - 4; record.speedResult = speedMetrics(record.browserPageState, jitter); render(record); emit(record, "speed-result", { ...record.speedResult, vpnConnected: record.browserPageState.vpn.connected }); }
        if (event.target.closest("[data-meet-join]")) { record.meetJoined = true; render(record); const ping = speedMetrics(record.browserPageState, 0).ping; emit(record, ping < 60 ? "meet-joined-green" : "meet-joined", { ping }); }
        const schoolView = event.target.closest("[data-school-view]")?.dataset.schoolView; if (schoolView) { record.schoolView = schoolView; render(record); if (schoolView === "lab02") emit(record, "school-lab-02"); }
        if (event.target.closest("[data-netflix-watch]")) OSLab.ui.notify("Netflix simulada", "Reprodução fictícia iniciada. Nenhum vídeo real é transmitido.", "info");
      });
      record.content.addEventListener("change", (event) => OSLab.audioSites?.change(record, event) || OSLab.driverSites?.change(record, event));
      record.content.addEventListener("submit", (event) => {
        if (OSLab.zapSites?.submit(record, event) || OSLab.audioSites?.submit(record, event) || OSLab.driverSites?.submit(record, event)) return;
        const googleForm = event.target.closest("[data-google-search]");
        const netflixForm = event.target.closest("[data-netflix-search]");
        const ipQuiz = event.target.closest("[data-myip-quiz]");
        if (googleForm) { event.preventDefault(); performSearch(record, new FormData(googleForm).get("query")); }
        const bookmarkForm = event.target.closest("[data-browser-bookmark-form]");
        if (bookmarkForm) { event.preventDefault(); const name = new FormData(bookmarkForm).get("name"); if (OSLab.browserState.favorite(record.browserState, String(name || ""))) changed(record, "favorite-added", { value: record.browserState.currentUrl }); record.bookmarkOpen = false; render(record); }
        if (netflixForm) { event.preventDefault(); record.netflixSearch = String(new FormData(netflixForm).get("query") || "").trim(); render(record); if (record.netflixSearch.toLocaleLowerCase("pt-BR") === "supernatural") emit(record, netflixAvailable(record.browserPageState) ? "netflix-supernatural-us" : record.browserPageState.vpn.country === "BR" ? "netflix-unavailable-br" : "netflix-unavailable"); }
        if (ipQuiz) { event.preventDefault(); const values = new FormData(ipQuiz); const correct = values.get("physical") === "no" && values.get("changed") === "public-ip"; record.myIpQuizResult = correct; render(record); if (correct) emit(record, "myip-quiz-correct"); }
      });
      record.content.addEventListener("focusin", (event) => { if (event.target.closest("[data-google-search]") && event.target.matches("input")) changed(record, "focus-search"); });
      record.element.addEventListener("keydown", (event) => {
        if (!event.ctrlKey || event.altKey) return;
        const key = event.key.toLowerCase();
        if (key === "t" && event.shiftKey) { event.preventDefault(); restoreClosed(record); }
        else if (key === "t") { event.preventDefault(); const tab = OSLab.browserState.open(record.browserState, record.appId === "google" ? "google.com" : "newtab"); load(record, tab.url, { push: false }); changed(record, "new-tab", { openedTabId: tab.id, via: "shortcut" }); }
        else if (key === "w") { event.preventDefault(); const closed = OSLab.browserState.close(record.browserState); if (closed) { load(record, currentLocation(record), { push: false }); changed(record, "close-tab", { closedUrl: closed.url, closedTabId: closed.id, via: "shortcut" }); } }
        else if (key === "l") { event.preventDefault(); const input = record.toolbar.querySelector("[name='address']"); input?.focus(); input?.select(); }
        else if (key === "h") { event.preventDefault(); if (OSLab.browserState.openHistory(record.browserState)) { render(record); changed(record, "history-open", { via: "shortcut" }); } }
      });
    }
  }
  function navigate(record, value) { return load(record, value); }
  function openGoogle(record) {
    ensureHistory(record);
    if (record.browserState.currentUrl === "google.com") {
      const tab = OSLab.browserState.open(record.browserState, "newtab");
      load(record, tab.url, { push: false });
      changed(record, "new-tab", { openedTabId: tab.id });
    }
    return load(record, "google.com", { source: "assistant" });
  }
  function prepareMission(order) {
    const record = OSLab.windowManager?.getWindows?.().find((item) => item.appId === "google") || OSLab.shell?.openApp?.("google");
    if (!record) return;
    if ([7, 9, 10].includes(order)) { record.browserState = OSLab.browserState.create("google.com"); record.pageRefreshed = false; load(record, "google.com", { push: false }); }
    if (order === 7) { performSearch(record, "peças de um computador"); load(record, "hardware.oslab.local"); }
    if (order === 8) { record.pageRefreshed = false; load(record, "falha.oslab.local"); }
    if (order === 10) { const tab = OSLab.browserState.open(record.browserState, "componentes.oslab.local"); load(record, tab.url, { push: false }); }
    if (order === 11) load(record, "hardware.oslab.local");
    if (order === 12) { load(record, "wikipedia.org"); load(record, "hardware.oslab.local"); }
  }

  OSLab.vpnSites = { netflixAvailable, portalAllowed, schoolAllowed, bankAllowed, speedMetrics, movies: movies.map((movie) => ({ ...movie })) };
  OSLab.software?.subscribe?.(() => { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); });
  OSLab.installLab?.subscribe?.(() => { records.forEach((record) => record.element?.isConnected ? render(record) : records.delete(record)); });
  OSLab.browserTrail?.subscribe?.(() => { records.forEach((record) => { if (record.element?.isConnected) record.element.dataset.browserHint = visualTarget(record); else records.delete(record); }); });
  OSLab.browserApp = { render, navigate, openGoogle, search: performSearch, prepareMission, browsers, getState(record) { return OSLab.browserState.snapshot(record.browserState); }, refresh(record) { record.pageRefreshed = true; return load(record, currentLocation(record), { push: false, action: "refresh" }); } };
})(window);
