(function createStoreApp(global) {
  "use strict";
  // Microsoft Store do OSLab: página inicial, Aplicativos, Jogos, pesquisa, página do produto, Downloads e Biblioteca.
  const O = global.OSLab;
  const S = () => O.store;
  const safe = (value) => O.ui.escapeHtml(value);
  const FL = "assets/icons/taskmanager/fluent/";
  const ic = (name) => `<i class="ms-ic" style="-webkit-mask-image:url(${FL}${name}.svg);mask-image:url(${FL}${name}.svg)" aria-hidden="true"></i>`;
  const all = () => O.storeCatalog || [];
  const apps = () => all().filter((item) => item.kind === "app");
  const games = () => all().filter((item) => item.kind === "game");
  const records = new Set();
  const price = (item) => item.price ? `R$ ${item.price.toFixed(2).replace(".", ",")}` : "Gratuito";
  const shortTitle = (item) => item.title.replace(" - Músicas e Podcasts", "").replace(": Lists, Tasks & Reminders", "");
  const emit = (type, detail) => O.events.emit(type, detail, "store");
  const categories = ["Foto e vídeo", "Produtividade", "Utilitários e ferramentas", "Entretenimento", "Ferramentas de desenvolvedor", "Música", "Redes sociais", "Design multimídia"];

  function status(item) {
    const d = S().download(item.id);
    if (d) return d.kind === "update" ? `Atualizando ${d.progress}%` : `Baixando ${d.progress}%`;
    if (S().isInstalled(item.id)) return S().hasUpdate(item.id) ? "Atualização" : "Instalado";
    return price(item);
  }
  function card(item) {
    return `<button type="button" class="ms-card" data-ms-product="${item.id}"><img src="${item.icon}" alt="" loading="lazy" /><span><strong>${safe(shortTitle(item))}</strong><small>${safe(item.category)}</small></span><em data-ms-status="${item.id}">${status(item)}</em></button>`;
  }
  function tile(item) {
    return `<button type="button" class="ms-tile" data-ms-product="${item.id}"><span class="ms-tile-art"><i class="ms-blur" style="background-image:url('${item.icon}')"></i><img src="${item.icon}" alt="" loading="lazy" /></span><strong>${safe(shortTitle(item))}</strong><em data-ms-status="${item.id}">${status(item)}</em></button>`;
  }
  function poster(item) {
    return `<button type="button" class="ms-poster" data-ms-product="${item.id}"><img src="${item.poster || item.icon}" alt="" loading="lazy" />${item.price ? "" : '<b class="ms-pass">Gratuito</b>'}<span><strong>${safe(shortTitle(item))}</strong><em data-ms-status="${item.id}">${status(item)}</em></span></button>`;
  }
  function section(title, body, cls = "") { return `<section class="ms-section ${cls}"><h2>${title} ${ic("chevron-right")}</h2>${body}</section>`; }

  // ---------------- páginas ----------------
  function home(record) {
    const slides = ["spotify", "netflix", "ibispaint", "minecraft"].map(S().get).filter(Boolean);
    const slide = slides[(record.msSlide || 0) % slides.length];
    const side = ["fortnite", "asphalt"].map(S().get).filter(Boolean);
    const popularGames = ["roblox", "minecraft", "fortnite", "efootball"].map(S().get).filter(Boolean);
    const popularApps = ["whatsapp", "chatgpt", "discord", "spotify"].map(S().get).filter(Boolean);
    const essentials = ["chatgpt", "spotify", "netflix", "ibispaint", "brave", "opera", "todo", "calculator"].map(S().get).filter(Boolean);
    return `<div class="ms-hero"><button type="button" class="ms-slide" data-ms-product="${slide.id}" style="background-image:url('${slide.hero || slide.icon}')"><span class="ms-slide-copy"><strong>${safe(shortTitle(slide))}</strong><small>${slide.kind === "game" ? "Jogue agora" : "Baixe agora"}</small><b>${S().isInstalled(slide.id) ? "Abrir" : slide.price ? price(slide) : "Instalar"}</b></span></button>
        <div class="ms-hero-side">${side.map((item) => `<button type="button" class="ms-promo" data-ms-product="${item.id}" style="background-image:url('${item.hero || item.poster}')"><strong>${safe(shortTitle(item))}</strong></button>`).join("")}</div>
        <div class="ms-dots">${slides.map((_, index) => `<button type="button" class="${index === (record.msSlide || 0) % slides.length ? "is-on" : ""}" data-ms-slide="${index}" aria-label="Destaque ${index + 1}"></button>`).join("")}</div></div>
      <div class="ms-duo">${section("Jogos Mais Populares", `<div class="ms-cards">${popularGames.map(card).join("")}</div>`, "is-card")}${section("Aplicativos mais populares", `<div class="ms-cards">${popularApps.map(card).join("")}</div>`, "is-card")}</div>
      <nav class="ms-chips" aria-label="Categorias">${categories.map((name) => `<button type="button" data-ms-category="${name}">${safe(name)}</button>`).join("")}</nav>
      ${section("Aplicativos gratuitos essenciais", `<div class="ms-cards is-wide">${essentials.map(card).join("")}</div>`, "is-card")}
      ${section("Eleve seu jogo de nível", `<div class="ms-posters">${games().slice(0, 8).map(poster).join("")}</div>`)}`;
  }
  function appsPage(record) {
    const list = apps().filter((item) => !record.msCategory || item.category === record.msCategory);
    return `<nav class="ms-chips" aria-label="Categorias"><button type="button" class="${record.msCategory ? "" : "is-on"}" data-ms-category="">Todos</button>${categories.map((name) => `<button type="button" class="${record.msCategory === name ? "is-on" : ""}" data-ms-category="${name}">${safe(name)}</button>`).join("")}</nav><h1 class="ms-title">${safe(record.msCategory || "Aplicativos gratuitos essenciais")}</h1><div class="ms-tiles">${list.map(tile).join("") || '<p class="ms-empty">Nenhum aplicativo nesta categoria.</p>'}</div>`;
  }
  function gamesPage() { return `<h1 class="ms-title">Jogos</h1><div class="ms-posters is-grid">${games().map(poster).join("")}</div>`; }
  function searchPage(record) {
    const q = String(record.msQuery || "").trim().toLocaleLowerCase("pt-BR");
    const list = all().filter((item) => [item.title, item.publisher, item.category].some((v) => String(v).toLocaleLowerCase("pt-BR").includes(q)));
    return `<h1 class="ms-title">Resultados para “${safe(record.msQuery)}”</h1><div class="ms-tiles">${list.map(tile).join("") || '<p class="ms-empty">Nenhum resultado. Confira a ortografia ou tente outro nome.</p>'}</div>`;
  }
  function button(item) {
    const d = S().download(item.id);
    if (d) return `<div class="ms-progress" role="status" data-ms-bar="${item.id}"><span>${d.kind === "update" ? "Atualizando" : "Baixando"} ${d.progress}%</span><i style="width:${d.progress}%"></i><button type="button" data-ms-cancel="${item.id}" aria-label="Cancelar">${ic("fx-dismiss")}</button></div>`;
    if (S().isInstalled(item.id)) return `<button type="button" class="ms-get is-open" data-ms-open="${item.id}">Abrir</button>`;
    return `<button type="button" class="ms-get" data-ms-get="${item.id}">${item.price ? price(item) : item.kind === "game" ? "Adquirir" : "Instalar"}</button>`;
  }
  function product(record) {
    const item = S().get(record.msProduct);
    if (!item) return home(record);
    const more = all().filter((other) => other.id !== item.id && other.kind === item.kind).slice(0, 4);
    return `<div class="ms-product"><i class="ms-product-bg" style="background-image:url('${item.hero || item.icon}')"></i><i class="ms-product-fade"></i><div class="ms-product-top">
        <img class="ms-product-icon" src="${item.icon}" alt="" />
        <h1>${safe(item.title)}</h1><a>${safe(item.publisher)}</a>
        <p class="ms-meta">${item.rating ? `<b>${item.rating.toFixed(1).replace(".", ",")} ${ic("ms-star_12_filled")}</b><span>${item.ratings ? `${Math.round(item.ratings / 1000)}K classificações` : ""}</span>` : ""}<span class="ms-cat">${safe(item.category)}</span></p>
        <p class="ms-desc">${safe(item.desc)}</p>
        <div class="ms-actions">${button(item)}<button type="button" class="ms-share" aria-label="Compartilhar" data-ms-share>${ic("fx-share")}</button></div>
        <p class="ms-age"><b>${item.age === "L" ? "L" : item.age}</b><span><strong>${item.age === "L" ? "Livre" : `${item.age} anos`}</strong><small>Classificação indicativa</small></span><span class="ms-price-note">${item.price ? `Pago: ${price(item)}` : "Gratuito"}</span></p></div></div>
      <div class="ms-product-body"><div>${item.shots?.length ? `<section class="ms-section is-card"><h2>Capturas de tela ${ic("chevron-right")}</h2><div class="ms-shots">${item.shots.map((src) => `<img src="${src}" alt="Captura de tela de ${safe(shortTitle(item))}" loading="lazy" />`).join("")}</div></section>` : ""}<section class="ms-section is-card"><h2>Descrição</h2><p class="ms-long">${safe(item.desc)}</p><dl class="ms-facts"><dt>Editor</dt><dd>${safe(item.publisher)}</dd><dt>Categoria</dt><dd>${safe(item.category)}</dd><dt>Preço</dt><dd>${price(item)}</dd>${item.size ? `<dt>Tamanho aproximado</dt><dd>${item.size} MB</dd>` : ""}</dl></section></div>
      <aside class="ms-more"><h2>Descobrir mais ${ic("chevron-right")}</h2>${more.map((other) => `<button type="button" data-ms-product="${other.id}"><img src="${other.poster || other.icon}" alt="" loading="lazy" /><span><strong>${safe(shortTitle(other))}</strong><em>${status(other)}</em></span></button>`).join("")}</aside></div>`;
  }
  function library() {
    const installed = S().installedApps();
    const updates = S().updatesCount();
    return `<div class="ms-lib-head"><h1 class="ms-title">Biblioteca</h1><button type="button" class="ms-get" data-ms-update ${updates ? "" : "disabled"}>${updates ? `Obter atualizações (${updates})` : "Tudo atualizado"}</button></div>
      <p class="ms-note">${updates ? `${updates} ${updates === 1 ? "aplicativo tem" : "aplicativos têm"} atualização. Atualizar corrige erros e traz recursos novos.` : "Seus aplicativos estão atualizados."}</p>
      <div class="ms-lib">${installed.map((app) => { const item = S().get(app.product); const d = S().download(app.product); return `<div class="ms-lib-row"><img src="${app.icon}" alt="" /><span><strong>${safe(app.name)}</strong><small>${safe(item.publisher)} · versão ${app.version}.0</small></span><em>${d ? `${d.kind === "update" ? "Atualizando" : "Baixando"} ${d.progress}%` : app.update ? "Atualização disponível" : "Atualizado"}</em><button type="button" data-ms-open="${app.product}">Abrir</button></div>`; }).join("") || '<p class="ms-empty">Nenhum aplicativo instalado pela Microsoft Store ainda.</p>'}</div>`;
  }
  function simple(title, text) { return `<h1 class="ms-title">${title}</h1><p class="ms-note">${text}</p>`; }

  function modal(record) {
    if (!record.msModal) return "";
    const item = S().get(record.msModal);
    return `<div class="ms-modal-backdrop"><section class="ms-modal" role="dialog" aria-modal="true" aria-labelledby="ms-modal-title"><img src="${item.icon}" alt="" /><h2 id="ms-modal-title">${safe(shortTitle(item))} ainda não existe no OSLab</h2><p>Este aplicativo ainda não foi criado no simulador, então não dá para baixar. Na trilha da Microsoft Store você instala os aplicativos que já funcionam aqui, como ChatGPT, Spotify, Netflix, Discord, ibis Paint, Brave e Opera.</p>${item.price ? `<p class="ms-modal-warn"><b>Este é pago (${price(item)}).</b> Compras pedem uma forma de pagamento: nunca use o cartão de alguém sem a pessoa autorizar.</p>` : ""}<button type="button" class="ms-get" data-ms-close>Entendi</button></section></div>`;
  }

  function render(record) {
    records.add(record);
    record.msPage ||= "home";
    const pages = { home, apps: appsPage, games: gamesPage, search: searchPage, product, library, themes: () => simple("Temas", "Temas mudam papel de parede, cores e sons do Windows. No OSLab, mude o papel de parede em Configurações › Personalização."), news: () => simple("Novidades", "Na Microsoft Store do OSLab: ChatGPT, Spotify, Netflix, Discord, ibis Paint, navegadores e utilitários do Windows já podem ser instalados.") };
    const nav = [["home", "Página Inicial", "ms-home_20_regular"], ["apps", "Aplicativos", "ms-apps_20_regular"], ["games", "Jogos", "ms-games_20_regular"], ["themes", "Temas", "ms-paint_brush_20_regular"]];
    const bottom = [["news", "Novidades", "ms-sparkle_20_regular"], ["library", "Downloads", "ms-arrow_download_20_regular"], ["library", "Biblioteca", "ms-library_20_regular"]];
    const navButton = ([id, label, icon], index) => `<button type="button" class="${record.msPage === id && (id !== "library" || (label === "Biblioteca") === (record.msLibTab !== "downloads")) ? "is-active" : ""}" data-ms-page="${id}" ${label === "Downloads" ? 'data-ms-libtab="downloads"' : ""}>${ic(icon)}<span>${label}</span>${label === "Downloads" && S().updatesCount() ? `<b>${S().updatesCount()}</b>` : ""}</button>`;
    const scroll = record.content.querySelector(".ms-main")?.scrollTop || 0;
    record.content.innerHTML = `<section class="ms"><aside class="ms-nav">${nav.map(navButton).join("")}<span class="ms-fill"></span>${bottom.map(navButton).join("")}</aside><main class="ms-main ms-page-${record.msPage}">${(pages[record.msPage] || home)(record)}</main>${modal(record)}</section>`;
    const main = record.content.querySelector(".ms-main");
    if (record.keepScroll) main.scrollTop = scroll;
    record.keepScroll = false;
    titleSearch(record);
    if (record.msWired) return;
    record.msWired = true;
    record.content.addEventListener("click", (event) => click(record, event));
    record.msTimer = global.setInterval(() => { if (!record.element?.isConnected) { global.clearInterval(record.msTimer); return; } if (record.msPage === "home" && !record.msModal) { record.msSlide = (record.msSlide || 0) + 1; record.keepScroll = true; render(record); } }, 7000);
  }
  function titleSearch(record) {
    const label = record.settingsSearch;
    if (!label || label.dataset.ms) return;
    label.dataset.ms = "1";
    label.classList.remove("is-hidden");
    record.element.classList.add("ms-window");
    const input = label.querySelector("input");
    input.placeholder = "Pesquisar aplicativos, jogos e muito mais";
    input.setAttribute("aria-label", "Pesquisar na Microsoft Store");
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !input.value.trim()) return;
      go(record, { msPage: "search", msQuery: input.value.trim() });
      emit("store:search", { query: input.value.trim() });
    });
  }
  function go(record, patch) { Object.assign(record, { msModal: null }, patch); render(record); record.content.querySelector(".ms-main")?.scrollTo?.(0, 0); }
  function openInstalled(id) {
    const item = S().get(id);
    if (!item?.app) return;
    emit("store:open-app", { id: item.id, app: item.app });
    O.shell.openApp(item.app);
  }
  function click(record, event) {
    const t = event.target;
    const productId = t.closest("[data-ms-product]")?.dataset.msProduct;
    const page = t.closest("[data-ms-page]");
    const category = t.closest("[data-ms-category]")?.dataset.msCategory;
    const get = t.closest("[data-ms-get]")?.dataset.msGet;
    const open = t.closest("[data-ms-open]")?.dataset.msOpen;
    const cancel = t.closest("[data-ms-cancel]")?.dataset.msCancel;
    const dot = t.closest("[data-ms-slide]")?.dataset.msSlide;
    if (t.closest("[data-ms-close]")) { record.msModal = null; render(record); return; }
    if (dot !== undefined) { record.msSlide = Number(dot); record.keepScroll = true; render(record); return; }
    if (page) { go(record, { msPage: page.dataset.msPage, msLibTab: page.dataset.msLibtab || "library", msCategory: page.dataset.msPage === "apps" ? record.msCategory : null }); emit("store:nav", { page: page.dataset.msPage }); return; }
    if (category !== undefined) { go(record, { msPage: "apps", msCategory: category }); emit("store:category", { category }); return; }
    if (get) {
      const item = S().get(get);
      if (!item.app) { record.msModal = item.id; render(record); emit("store:not-created", { id: item.id, paid: Boolean(item.price) }); return; }
      S().install(item.id); return;
    }
    if (open) { openInstalled(open); return; }
    if (cancel) { S().cancel(cancel); return; }
    if (t.closest("[data-ms-update]")) { S().updateAll(); emit("store:update-click", {}); return; }
    if (t.closest("[data-ms-share]")) { O.ui.notify("Link copiado", "O endereço desta página da Microsoft Store foi copiado.", "info", 3000); return; }
    if (productId) { go(record, { msPage: "product", msProduct: productId }); emit("store:product", { id: productId }); }
  }
  S().subscribe((type, detail) => {
    records.forEach((record) => {
      if (!record.element?.isConnected) { records.delete(record); return; }
      // durante o download só a porcentagem muda (leve para o Chromebook); o resto redesenha a página no mesmo lugar
      if (type === "progress") {
        const item = S().get(detail.id), bar = record.content.querySelector(`[data-ms-bar="${detail.id}"]`);
        record.content.querySelectorAll(`[data-ms-status="${detail.id}"]`).forEach((el) => { el.textContent = status(item); });
        if (bar) { bar.querySelector("i").style.width = `${detail.progress}%`; bar.querySelector("span").textContent = `${S().download(detail.id)?.kind === "update" ? "Atualizando" : "Baixando"} ${detail.progress}%`; }
        if (bar || record.msPage !== "library") return;
      }
      record.keepScroll = true; render(record);
    });
    if (["installed", "uninstalled", "reset"].includes(type)) { O.shell?.refreshPrograms?.(); O.storeApp.refreshSettings(); }
  });

  // ---------------- Configurações › Aplicativos › Aplicativos instalados ----------------
  function installedAppsMarkup() {
    const list = S().installedApps();
    return `<header class="settings-page-heading with-back"><button type="button" data-settings-back="apps" aria-label="Voltar para Aplicativos"><img src="assets/icons/ui/left.png" alt="" /></button><div><small>Aplicativos</small><h1>Aplicativos instalados</h1></div></header>
      <p class="ms-settings-count">${list.length} ${list.length === 1 ? "aplicativo encontrado" : "aplicativos encontrados"}</p>
      <article class="settings-card ms-installed">${list.map((app) => `<div class="ms-installed-row"><img src="${app.icon}" alt="" /><span><strong>${safe(app.name)}</strong><small>${safe(S().get(app.product).publisher)} · ${new Date(app.at || Date.now()).toLocaleDateString("pt-BR")}</small></span><button type="button" class="win-button" data-store-uninstall="${app.product}">Desinstalar</button></div>`).join("") || '<p class="ms-empty">Nenhum aplicativo da Microsoft Store instalado.</p>'}</article>`;
  }
  global.document.addEventListener("click", async (event) => {
    const id = event.target.closest("[data-store-uninstall]")?.dataset.storeUninstall;
    if (!id) return;
    const item = S().get(id);
    if (!await O.ui.confirm({ title: `Desinstalar ${shortTitle(item)}?`, message: "Este aplicativo e as informações relacionadas a ele serão desinstalados.", confirmLabel: "Desinstalar" })) return;
    S().uninstall(id);
    O.storeApp.refreshSettings();
  });

  O.storeApp = {
    render, installedAppsMarkup, openInstalled,
    refreshSettings() { O.windowManager?.getWindows?.().filter((record) => record.appId === "settings" && record.settingsView === "installed-apps").forEach((record) => O.shell.openSettings("installed-apps")); },
  };
})(window);
