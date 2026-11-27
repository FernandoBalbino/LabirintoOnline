(function createDriversApps(global) {
  "use strict";

  const O = global.OSLab, safe = (v) => O.ui.escapeHtml(v), D = () => O.drivers;
  const HOST = "suporte.printix.com.br", BAD_HOST = "baixardriversgratis.net";
  const OS_LABEL = { win64: "Windows 11 (64 bits)", win10: "Windows 10 (64 bits)", win32: "Windows 10 (32 bits)", mac: "macOS 14" };
  const norm = (v) => String(v || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const sizeOf = (id) => O.software.installers[id]?.totalMb || 0;
  const records = new Set();

  // ================= site de suporte (no navegador do OSLab) =================
  const isDriverQuery = (q) => /printix|inkjet|impressora|driver|2350|2305|2530/.test(norm(q));
  function recordSearch(term) {
    if (!isDriverQuery(term)) return;
    const t = norm(term);
    D().emit("drivers:search", { term, ok: t.includes("printix") && t.includes("2350") && t.includes("driver") });
  }
  function searchResults(query) {
    if (!isDriverQuery(query)) return null;
    const results = [
      ["official", HOST, "suporte.printix.com.br › Suporte › Impressoras", "Printix InkJet 2350 | Software e drivers | Suporte Printix", "Baixe drivers, manuais e atualizações oficiais para impressoras Printix. Selecione o modelo e o sistema operacional."],
      ["bad", BAD_HOST, "baixardriversgratis.net › impressoras", "Driver InkJet 2350 GRÁTIS — Download rápido 2026 ✔✔", "Baixe AGORA o driver de qualquer impressora! Atualizador automático de drivers. 100% grátis, sem cadastro."],
      ["pro", HOST, "suporte.printix.com.br › Produto › inkjet-2350-pro", "Printix InkJet 2350 Pro | Drivers e downloads", "Software e drivers para a multifuncional InkJet 2350 Pro com Wi-Fi e frente e verso."],
      ["forum", "forum.tecnicos.local", "forum.tecnicos.local › impressoras", "InkJet 2350 não imprime depois de formatar? — Fórum de Técnicos", "Respostas da comunidade: confira se o driver está instalado no Gerenciador de Dispositivos..."],
    ];
    return `<section class="google-results-page"><header><button type="button" class="google-mini-logo" data-browser-go="google.com">Google</button><form class="google-results-search" data-google-search><input name="query" value="${safe(query)}" aria-label="Pesquisar" /><button type="submit"><img src="assets/icons/search.png" alt="Pesquisar" /></button></form><img src="assets/icons/avatar.webp" alt="Perfil do aluno" /></header><nav><strong>Todos</strong><span>Imagens</span><span>Vídeos</span><span>Shopping</span><span>Mais</span></nav><main><p class="google-result-count">Aproximadamente 41.300 resultados simulados (0,32 segundos)</p>${results.map(([kind, host, crumb, title, desc], i) => `<article class="google-result-card ${i === 0 ? "first-result" : ""} ${kind === "bad" ? "is-sponsored" : ""}"><div><span class="result-favicon ${kind === "bad" ? "is-bad" : "is-printix"}">${kind === "bad" ? "↓" : kind === "forum" ? "F" : "P"}</span><span><strong>${kind === "bad" ? "<em>Patrocinado</em> · " : ""}${safe(host)}</strong><small>https://${safe(crumb)}</small></span></div><button type="button" data-printix-result="${kind}">${safe(title)}</button><p>${safe(desc)}</p></article>`).join("")}</main></section>`;
  }
  const route = (record) => { const url = String(record.browserState?.currentUrl || HOST); const path = url.slice(url.indexOf("/") >= 0 ? url.indexOf("/") : url.length); return path || "/"; };
  const header = () => `<header class="px-top"><div class="px-brand"><span class="px-logo">Printix</span><small>Suporte</small></div><nav><span>Produtos</span><span>Tinta e papel</span><strong>Suporte</strong><span>Onde comprar</span><span>Contato</span></nav><span class="px-region">Brasil · Português</span></header>`;
  const crumbs = (...items) => `<p class="px-crumbs">${["Início", "Suporte", ...items].map((t) => safe(t)).join(" <span>›</span> ")}</p>`;
  const productImg = (id, cls = "") => `<img class="${cls}" src="${D().printers[id].img}" alt="Impressora Printix ${safe(D().printers[id].model)}" />`;
  function home(record) {
    const list = Object.values(D().printers);
    const popular = ["drv-ij2305-full", "drv-ij2530-full", "drv-ij2350pro-full", "drv-ij2355-full"];
    return `${crumbs("Impressoras")}<section class="px-search-block"><h1>Buscar por nome de produto</h1><form class="px-search" data-printix-search><span aria-hidden="true">⌕</span><input name="q" value="${safe(record.printixQuery || "")}" placeholder="Digite o nome do produto" aria-label="Digite o nome do produto" autocomplete="off" /><button type="submit">Buscar</button></form><p class="px-example">Por exemplo: InkJet 2305, InkJet 3250, InkJet 2350 Pro</p></section>
      <section class="px-accordion"><button type="button" class="px-bar ${record.printixSeries ? "is-done" : ""}" data-printix-series="types">Tipos de impressora <span>${record.printixSeries ? "▴" : "▾"}</span></button>
      ${record.printixSeries ? `<button type="button" class="px-bar is-done" data-printix-series="types">Impressoras multifuncionais</button><div class="px-bar is-open">Printix InkJet</div><div class="px-models">${list.map((p) => `<button type="button" data-printix-product="${p.id}">Printix ${safe(p.model)}</button>`).join("")}</div>`
        : `<div class="px-types">${[["Impressoras multifuncionais", "inkjet-2350"], ["Impressoras de função única", "inkjet-2305"], ["Impressoras para escritório", "inkjet-3255"], ["Impressoras com Wi-Fi", "inkjet-2530"]].map(([t, id]) => `<button type="button" data-printix-series="mf">${productImg(id)}<span>${safe(t)}</span></button>`).join("")}</div>`}</section>
      <section class="px-popular"><h2>Downloads mais procurados</h2><p>Arquivos baixados com frequência nesta semana.</p>${popular.map((id) => fileRow(id, true)).join("")}</section>`;
  }
  function fileRow(id, showModel) {
    const f = D().files[id], p = D().printers[f.product];
    return `<article class="px-file"><div><strong>${showModel ? `Printix ${safe(p.model)} — ` : ""}${safe(f.title)}</strong><small>${safe(f.note)}</small><dl><div><dt>Compatível com</dt><dd>${safe(f.compat)}</dd></div><div><dt>Versão</dt><dd>${safe(f.version)}</dd></div><div><dt>Data</dt><dd>${safe(f.date)}</dd></div><div><dt>Tamanho</dt><dd>${sizeOf(id)} MB</dd></div></dl></div><button type="button" data-download-start="${id}">Baixar</button></article>`;
  }
  function searchPage(record, q) {
    const digits = (norm(q).match(/\d{4}/) || [""])[0];
    const all = Object.values(D().printers);
    const exact = all.filter((p) => (digits ? norm(p.model).includes(digits) : norm(`printix ${p.model}`).includes(norm(q))));
    const near = all.filter((p) => !exact.includes(p) && digits && p.model.replace(/\D/g, "").slice(0, 2) === digits.slice(0, 2));
    const card = (p) => `<button type="button" class="px-product-card" data-printix-product="${p.id}">${productImg(p.id)}<strong>Printix ${safe(p.model)}</strong><small>${safe(p.kind)}</small></button>`;
    return `${crumbs("Impressoras", "Busca")}<section class="px-search-block"><h1>Resultados para “${safe(q)}”</h1><form class="px-search" data-printix-search><span aria-hidden="true">⌕</span><input name="q" value="${safe(q)}" aria-label="Digite o nome do produto" autocomplete="off" /><button type="submit">Buscar</button></form><p class="px-example">Dica: compare o nome com a etiqueta do seu aparelho. Uma letra ou um número a mais é outro modelo.</p></section>
      ${exact.length ? `<div class="px-grid">${exact.map(card).join("")}</div>` : `<p class="px-empty">Nenhum produto com esse nome. Confira o modelo na etiqueta da impressora.</p>`}${near.length ? `<h2 class="px-sub">Você também pode estar procurando</h2><div class="px-grid">${near.map(card).join("")}</div>` : ""}`;
  }
  function productPage(record, id) {
    const p = D().printers[id] || D().printers[D().LAB];
    const os = record.printixOs?.[p.id] || "";
    const own = Object.entries(D().files).filter(([, f]) => f.product === p.id);
    const shown = !os ? [] : own.filter(([, f]) => f.kind === "firmware" || (os === "mac" ? f.os === "mac" : os === "win32" ? f.os === "win32" : f.os === "win64")).map(([fid]) => fid);
    return `${crumbs("Impressoras", "Multifuncionais", `Printix ${p.model}`)}<section class="px-product"><div class="px-product-photo">${productImg(p.id)}</div><div><small>Suporte para</small><h1>Printix ${safe(p.model)}</h1><p>${safe(p.kind)} · lançada em ${p.year}</p><p class="px-label-tip">ⓘ Confirme o modelo na etiqueta da frente ou de trás da impressora antes de baixar.</p></div></section>
      <section class="px-downloads"><nav><strong>Drivers e downloads</strong><span>Manuais</span><span>Perguntas frequentes</span><span>Garantia</span></nav><label class="px-os">Sistema operacional<select data-printix-os="${p.id}"><option value="">Selecione o sistema operacional</option>${Object.entries(OS_LABEL).map(([k, v]) => `<option value="${k}" ${os === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      ${!os ? `<p class="px-empty">Selecione o sistema operacional para ver os arquivos compatíveis.</p>` : shown.length ? `<h2 class="px-sub">Drivers recomendados para ${safe(OS_LABEL[os])}</h2>${shown.map((fid) => fileRow(fid, false)).join("")}` : `<p class="px-empty">Não há arquivos para este sistema. Os drivers deste modelo são para Windows de 64 bits.</p>`}</section>`;
  }
  function badSite(record) {
    return `<section class="bad-site"><div class="bad-ads"><span>ANÚNCIO</span><strong>Seu PC tem 37 drivers desatualizados!</strong><button type="button" data-bad-click>Corrigir agora</button></div><h1>Driver ${safe(record.badFor || "InkJet 2350")} GRÁTIS 2026</h1><p>Clique no botão verde para baixar. Download rápido, sem cadastro!!!</p><div class="bad-buttons"><button type="button" data-bad-click>⬇ BAIXAR AGORA</button><button type="button" data-bad-click>⬇ DOWNLOAD</button><button type="button" data-bad-click>⬇ INICIAR</button></div><aside class="bad-lesson"><strong>Por que desconfiar deste site?</strong><ul><li>O endereço não é da fabricante.</li><li>Vários botões de download parecidos (quase todos são propaganda).</li><li>Promete “atualizador de drivers” milagroso, que pode instalar programas indesejados.</li></ul><button type="button" data-browser-go="google.com">Voltar ao Google</button></aside></section>`;
  }
  function render(record) {
    if (record.browserHost === BAD_HOST) return badSite(record);
    const path = route(record);
    let body;
    if (path.startsWith("/produto/")) body = productPage(record, path.slice(9));
    else if (path.startsWith("/busca")) body = searchPage(record, decodeURIComponent(path.split("q=")[1] || ""));
    else body = home(record);
    return `<section class="px-site">${header()}<main>${body}</main><footer class="px-foot"><span class="px-logo">Printix</span><span>Site de suporte fictício do OSLab · nenhum arquivo real é baixado</span></footer></section>`;
  }
  const go = (record, url) => O.browserApp.navigate(record, url);
  function click(record, event) {
    const result = event.target.closest("[data-printix-result]")?.dataset.printixResult;
    if (result) {
      if (result === "forum") { O.ui.notify("Fórum de técnicos", "Fóruns ajudam a entender o problema, mas o driver deve vir do site da fabricante.", "info", 5200); return true; }
      D().emit("drivers:result-opened", { official: result !== "bad", result });
      go(record, result === "bad" ? BAD_HOST : result === "pro" ? `${HOST}/produto/inkjet-2350-pro` : HOST);
      if (result === "pro") D().emit("drivers:product-opened", { product: "inkjet-2350-pro" });
      return true;
    }
    const series = event.target.closest("[data-printix-series]")?.dataset.printixSeries;
    if (series) { record.printixSeries = series === "mf" ? true : !record.printixSeries; O.browserApp.render(record); return true; }
    const product = event.target.closest("[data-printix-product]")?.dataset.printixProduct;
    if (product) { D().emit("drivers:product-opened", { product }); go(record, `${HOST}/produto/${product}`); return true; }
    if (event.target.closest("[data-bad-click]")) { O.ui.notify("Cuidado!", "Em um site assim, esse botão abriria propaganda ou baixaria um programa indesejado. Use o site da fabricante.", "warning", 5600); return true; }
    return false;
  }
  function submit(record, event) {
    const form = event.target.closest("[data-printix-search]");
    if (!form) return false;
    event.preventDefault();
    const q = String(new FormData(form).get("q") || "").trim();
    record.printixQuery = q;
    if (q) { D().emit("drivers:site-search", { query: q }); go(record, `${HOST}/busca?q=${encodeURIComponent(q)}`); }
    return true;
  }
  function change(record, event) {
    const select = event.target.closest("[data-printix-os]");
    if (!select) return false;
    record.printixOs = { ...(record.printixOs || {}), [select.dataset.printixOs]: select.value };
    D().emit("drivers:os-selected", { product: select.dataset.printixOs, os: select.value });
    O.browserApp.render(record);
    return true;
  }
  O.driverSites = { HOST, BAD_HOST, searchResults, recordSearch, render, click, submit, change, isHost: (h) => h === HOST || h === BAD_HOST };

  // ================= app Impressora =================
  function printerApp(record) {
    const s = D().get(), p = D().printers[D().LAB], print = record.lastPrint;
    const status = !s.usb ? ["Desconectada", "is-off"] : !s.driver ? ["Driver não instalado", "is-bad"] : s.garbled ? ["Driver com problema", "is-warn"] : ["Pronta para imprimir", "is-ok"];
    const page = print === "ok" ? `<div class="prn-paper"><strong>Página de teste</strong><span>Printix ${safe(p.model)}</span><span>Driver ${safe(s.driver?.version || "")}</span><i class="c"></i><i class="m"></i><i class="y"></i><i class="k"></i><b>✓ Impressão correta</b></div>`
      : print === "garbled" ? `<div class="prn-paper is-garbled"><strong>Pá§ina d€ t€st€</strong><span>ÿ¤¶Ø¥ ÆÐ ¢¬ ¦¦¦</span><span>#&@% ¿¿ Þ¶ øø</span><b>Texto embaralhado</b></div>` : "";
    record.content.innerHTML = `<section class="prn-app"><header><div><small>Bluetooth e dispositivos › Impressoras</small><h1>${s.driver ? `Printix ${safe(p.model)}` : "Impressora USB"}</h1></div><span class="prn-status ${status[1]}">${status[0]}</span></header>
      <div class="prn-body"><div class="prn-stage">${productImg(D().LAB, "prn-photo")}${page}${print && print !== "ok" && print !== "garbled" ? `<div class="prn-error"><strong>Não foi possível imprimir</strong><span>${print === "no-usb" ? "A impressora não está conectada." : "O Windows não encontrou um driver para este dispositivo. Instale o driver do fabricante."}</span></div>` : ""}</div>
      <aside class="prn-info"><dl><div><dt>Conexão</dt><dd>${s.usb ? "USB · conectada" : "Cabo USB desconectado"}</dd></div><div><dt>Driver</dt><dd>${s.driver ? `${safe(s.driver.provider)} ${safe(s.driver.version)}` : "Não instalado"}</dd></div><div><dt>Tipo</dt><dd>Multifuncional (imprime, copia e digitaliza)</dd></div></dl>
      ${record.labelOpen ? `<div class="prn-label" role="note"><small>ETIQUETA DO PRODUTO</small><strong>Printix</strong><span>Modelo: <b>${safe(p.model)}</b></span><span>N/S: PX2350-BR-0426</span><span>Entrada: 100–240 V · 50/60 Hz</span></div>` : ""}
      <div class="prn-actions"><button class="win-button" data-prn="label">${record.labelOpen ? "Esconder etiqueta" : "Ver etiqueta"}</button><button class="win-button is-primary" data-prn="print">Imprimir página de teste</button><button class="win-button" data-prn="devmgr">Gerenciador de Dispositivos</button></div></aside></div></section>`;
    record.address.textContent = "Impressora";
    if (record.prnWired) return; record.prnWired = true;
    record.content.addEventListener("click", (event) => {
      const a = event.target.closest("[data-prn]")?.dataset.prn;
      if (a === "label") { record.labelOpen = !record.labelOpen; if (record.labelOpen) D().emit("drivers:label-viewed", {}); printerApp(record); }
      if (a === "print") { record.lastPrint = D().testPrint(); printerApp(record); }
      if (a === "devmgr") O.shell.openApp("devicemanager");
    });
  }

  // ================= Gerenciador de Dispositivos =================
  // Ícones oficiais do Windows 11 extraídos de setupapi.dll, devmgr.dll, mmc.exe, imageres.dll, mmsys.cpl, mmres.dll e ddores.dll
  const DM = "assets/drivers/devmgr/";
  const dmIcon = (name, size = 16) => `<img src="${DM}${name}-${size}.png" srcset="${DM}${name}-32.png 2x" width="${size}" height="${size}" alt="" />`;
  const tbIcon = (name) => `<img src="${DM}tb-${name}-16.png"${["scan", "update", "uninstall", "disable", "enable"].includes(name) ? ` srcset="${DM}tb-${name}-32.png 2x"` : ""} width="16" height="16" alt="" />`;
  const CATS = [
    ["net", "Adaptadores de rede", ["Intel(R) Wi-Fi 6 AX201 160MHz", "Realtek PCIe GbE Family Controller", "WAN Miniport (IP)", "WAN Miniport (IPv6)"]],
    ["display", "Adaptadores de vídeo", ["Intel(R) UHD Graphics"]],
    ["computer", "Computador", ["PC baseado em x64 com ACPI"]],
    ["scsi", "Controladores de armazenamento", ["Controlador de Espaços de Armazenamento da Microsoft", "Controlador NVM Express Padrão"]],
    ["media", "Controladores de som, vídeo e jogos", ["Dispositivo de High Definition Audio"]],
    ["hdc", "Controladores IDE ATA/ATAPI", ["Controlador SATA AHCI Padrão"]],
    ["usb", "Controladores USB (barramento serial universal)", ["Controlador de Host Intel(R) USB 3.10 eXtensible - 1.20 (Microsoft)", "Dispositivo Composto USB", "Hub USB Raiz (USB 3.0)"]],
    ["hid", "Dispositivos de Interface Humana", ["Dispositivo de entrada USB", "Touchpad compatível com HID"]],
    ["security", "Dispositivos de segurança", ["Trusted Platform Module 2.0"]],
    ["system", "Dispositivos de sistema", ["Barramento PCI", "Relógio do sistema CMOS", "Timer de eventos de alta precisão"]],
    ["software", "Dispositivos do software", ["Microsoft Device Association Root Enumerator"]],
    ["audio", "Entradas e saídas de áudio", ["Alto-falantes (Dispositivo de High Definition Audio)", "Microfone (Dispositivo de High Definition Audio)"]],
    ["queue", "Filas de impressão", ["Fax", "Fila de Impressão Raiz", "Microsoft Print to PDF"]],
    ["firmware", "Firmware", ["Firmware do sistema"]],
    ["monitor", "Monitores", ["Monitor PnP Genérico"]],
    ["mouse", "Mouse e outros dispositivos apontadores", ["Mouse compatível com HID"]],
    ["apo", "Objetos de Processamento de Áudio (APOs)", ["Componente de Efeitos de Áudio"]],
    ["ports", "Portas (COM e LPT)", ["Porta de comunicação (COM1)"]],
    ["cpu", "Processadores", Array(4).fill("Processador x64 de 4 núcleos (simulado) 2,40 GHz")],
    ["keyboard", "Teclados", ["Teclado PS/2 padrão"]],
    ["disk", "Unidades de disco", ["SSD NVMe 256 GB"]],
  ];
  const prnName = () => `Printix ${D().printers[D().LAB].model}`;
  // outras trilhas acrescentam ou trocam categorias: [{ key, title, devices, append }]; cada dispositivo pode ter code (28, 22, 14), info e ações
  const providers = [];
  function dmTree(s) {
    const cats = CATS.map(([key, title, names]) => ({ key, title, devices: names.map((name, i) => ({ id: `${key}-${i}`, name, icon: key })) }));
    if (s.driver) cats.push({ key: "printer", title: "Impressoras", devices: [{ id: "printer", name: prnName(), icon: "printer" }] });
    else if (s.usb) cats.push({ key: "other", title: "Outros dispositivos", devices: [{ id: "unknown", name: "Dispositivo desconhecido", icon: "unknown-warn", code: 28 }] });
    providers.forEach((fn) => (fn() || []).forEach((p) => {
      const cat = cats.find((c) => c.key === p.key), devices = p.devices.map((d) => ({ icon: p.key, ...d }));
      if (cat) cat.devices = p.append ? [...cat.devices, ...devices] : devices;
      else cats.push({ key: p.key, title: p.title, devices });
    }));
    return cats.filter((c) => c.devices.length).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }
  const CODE_TEXT = {
    28: "Os drivers deste dispositivo não estão instalados. (Código 28)\n\nNão há drivers compatíveis para este dispositivo.\n\nPara localizar um driver para este dispositivo, clique em Atualizar Driver.",
    22: "Este dispositivo está desabilitado. (Código 22)\n\nClique em Habilitar Dispositivo para habilitar este dispositivo.",
    14: "Este dispositivo não poderá funcionar corretamente até que você reinicie o computador. (Código 14)\n\nClique em Reiniciar o Computador para reiniciá-lo agora.",
  };
  const dmDevices = (s) => dmTree(s).flatMap((c) => c.devices.map((d) => ({ ...d, cat: c })));
  /** linhas visíveis da árvore, na ordem da tela (usadas também pelas setas do teclado) */
  function dmRows(st, cats) {
    const rows = [{ id: "root", level: 0, label: "OSLAB-PC", icon: "root", open: st.open.root }];
    if (st.open.root) cats.forEach((c) => {
      rows.push({ id: `cat:${c.key}`, level: 1, label: c.title, icon: c.key, open: Boolean(st.open[c.key]) });
      if (st.open[c.key]) c.devices.forEach((d) => rows.push({ id: d.id, level: 2, label: d.name, icon: d.icon }));
    });
    return rows;
  }
  function dmDeviceInfo(dev, s) {
    if (dev.info) return { maker: dev.info.maker, local: dev.info.local, drv: dev.info.drv, status: CODE_TEXT[dev.code] || "Este dispositivo está funcionando corretamente." };
    const isPrn = dev.id === "printer", unknown = dev.id === "unknown";
    const maker = isPrn ? "Printix" : unknown ? "Desconhecido" : /^Intel/.test(dev.name) ? "Intel Corporation" : /^Realtek/.test(dev.name) ? "Realtek" : "(Dispositivos padrão do sistema)";
    const status = unknown ? "Os drivers deste dispositivo não estão instalados. (Código 28)\n\nNão há drivers compatíveis para este dispositivo.\n\nPara localizar um driver para este dispositivo, clique em Atualizar Driver." : "Este dispositivo está funcionando corretamente.";
    const drv = unknown ? ["Desconhecido", "Não disponível", "Não disponível", "Não assinado digitalmente"]
      : isPrn ? [s.driver.provider, s.driver.date, s.driver.version, s.garbled ? "Não assinado digitalmente" : "Microsoft Windows Hardware Compatibility Publisher"]
        : ["Microsoft", "21/06/2006", "10.0.26100.1", "Microsoft Windows"];
    return { maker, status, drv, local: isPrn || unknown ? "Port_#0001.Hub_#0001" : dev.cat.key === "cpu" ? "Não disponível" : "Barramento PCI 0, dispositivo 20, função 0" };
  }
  function dmDialog(dev, st, s) {
    const info = dmDeviceInfo(dev, s), tab = st.tab, isPrn = dev.id === "printer";
    const head = `<div class="dm-dhead">${dmIcon(dev.icon, 32)}<strong>${safe(dev.name)}</strong></div>`;
    const tabs = [["general", "Geral"], ["driver", "Driver"], ["details", "Detalhes"], ["events", "Eventos"]];
    const buttons = [
      ["details", "Detalhes do Driver", "Exibir detalhes sobre os arquivos de driver carregados para este dispositivo.", dev.code !== 28],
      ["update", "Atualizar Driver", "Atualizar o driver deste dispositivo.", true],
      ["rollback", "Reverter Driver", "Se o dispositivo falhar após a atualização do driver, reverta para o driver instalado anteriormente.", isPrn && Boolean(s.previous)],
      dev.code === 22 ? ["enable", "Habilitar Dispositivo", "Habilite o dispositivo.", true] : ["disable", "Desabilitar Dispositivo", "Desabilite o dispositivo.", dev.code !== 28],
      ["uninstall", "Desinstalar Dispositivo", "Desinstale o dispositivo do sistema (Avançado).", true],
    ];
    const body = tab === "general" ? `${head}<dl class="dm-kv"><dt>Tipo de dispositivo:</dt><dd>${safe(dev.cat.title)}</dd><dt>Fabricante:</dt><dd>${safe(info.maker)}</dd><dt>Local:</dt><dd>${safe(info.local)}</dd></dl><fieldset class="dm-statusbox"><legend>Status do dispositivo</legend><div>${safe(info.status)}</div></fieldset>${dev.code === 14 ? '<p class="dm-restart"><button type="button" class="dm-btn" data-dm-act="restart">Reiniciar o Computador</button></p>' : ""}`
      : tab === "driver" ? `${head}<dl class="dm-kv"><dt>Fornecedor do Driver:</dt><dd>${safe(info.drv[0])}</dd><dt>Data do Driver:</dt><dd>${safe(info.drv[1])}</dd><dt>Versão do Driver:</dt><dd>${safe(info.drv[2])}</dd><dt>Assinante Digital:</dt><dd>${safe(info.drv[3])}</dd></dl><div class="dm-drvbtns">${buttons.map(([a, label, text, on]) => `<button type="button" class="dm-btn" data-dm-act="${a}" ${on ? "" : "disabled"}>${label}</button><span>${text}</span>`).join("")}</div>`
        : tab === "details" ? `${head}<label class="dm-detail">Propriedade<select disabled><option>Descrição do dispositivo</option></select></label><span class="dm-detail-label">Valor</span><div class="dm-valuebox">${safe(dev.name)}</div>`
          : `${head}<div class="dm-valuebox dm-events"><span><b>Carimbo de data/hora</b><b>Descrição</b></span><span><i>06/11/2026 08:12:40</i><i>${dev.code === 28 ? "Dispositivo não migrado" : dev.code === 22 ? "Dispositivo desabilitado" : "Dispositivo instalado"}</i></span><span><i>06/11/2026 08:12:41</i><i>Dispositivo configurado</i></span></div>`;
    return `<div class="dm-backdrop"><section class="dm-dialog" role="dialog" aria-modal="true" aria-label="Propriedades de ${safe(dev.name)}"><header><span>Propriedades de ${safe(dev.name)}</span><button type="button" class="dm-x" data-dm-close aria-label="Fechar">✕</button></header><nav role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" aria-selected="${tab === id}" class="${tab === id ? "is-on" : ""}" data-dm-tab="${id}">${label}</button>`).join("")}</nav><div class="dm-tabbody" role="tabpanel">${body}</div><footer><button type="button" class="dm-btn is-default" data-dm-close>OK</button><button type="button" class="dm-btn" data-dm-close>Cancelar</button></footer></section></div>`;
  }
  function dmMenu(st, dev) {
    if (!st.menu) return "";
    const items = dev ? [["update", "Atualizar driver"], dev.code === 22 ? ["enable", "Habilitar dispositivo"] : ["disable", "Desabilitar dispositivo", dev.code === 28], ["uninstall", "Desinstalar dispositivo"], "-", ["scan", "Verificar se há alterações de hardware"], "-", ["props", "Propriedades", false, true]]
      : [["scan", "Verificar se há alterações de hardware"], "-", ["props", "Propriedades", true]];
    return `<div class="dm-ctx" role="menu" style="left:${st.menu.x}px;top:${st.menu.y}px">${items.map((it) => it === "-" ? "<hr />" : `<button type="button" role="menuitem" data-dm-menu="${it[0]}" ${it[2] ? "disabled" : ""} class="${it[3] ? "is-bold" : ""}">${it[1]}</button>`).join("")}</div>`;
  }
  function deviceManager(record) {
    const s = D().get(), st = record.dm || (record.dm = { open: { root: true }, sel: "root", dialog: null, tab: "general", menu: null });
    const cats = dmTree(s);
    // como no Windows, a categoria que tem dispositivo com problema (ou desabilitado) já abre expandida
    cats.forEach((c) => { if (st.open[c.key] === undefined && c.devices.some((d) => d.code)) st.open[c.key] = true; });
    if (s.driver && st.sel === "unknown") st.sel = "printer";
    if (s.driver && st.dialog === "unknown") st.dialog = null;
    const rows = dmRows(st, cats);
    if (!rows.some((r) => r.id === st.sel)) st.sel = "root";
    const all = dmDevices(s);
    const dev = all.find((d) => d.id === st.sel) || null, dialogDev = all.find((d) => d.id === st.dialog) || null;
    const scroll = record.content.querySelector(".dm-tree")?.scrollTop || 0;
    const tb = (id, label, on = true) => `<button type="button" class="dm-tb" data-dm-tb="${id}" title="${label}" aria-label="${label}" ${on ? "" : "disabled"}>${tbIcon(id)}</button>`;
    record.content.innerHTML = `<section class="dm-app"><nav class="dm-menubar"><button type="button" data-dm-bar="file">Arquivo</button><button type="button" data-dm-bar="action">Ação</button><button type="button" data-dm-bar="view">Exibir</button><button type="button" data-dm-bar="help">Ajuda</button></nav>
      <div class="dm-toolbar" role="toolbar">${tb("back", "Voltar", false)}${tb("forward", "Avançar", false)}<i class="dm-sep"></i>${tb("tree", "Mostrar/ocultar árvore de console")}<i class="dm-sep"></i>${tb("props", "Propriedades", Boolean(dev))}${tb("help", "Ajuda")}<i class="dm-sep"></i>${dev ? `${tb("update", "Atualizar driver")}${tb("uninstall", "Desinstalar dispositivo")}${dev.code === 22 ? tb("enable", "Habilitar dispositivo") : tb("disable", "Desabilitar dispositivo", dev.code !== 28)}` : ""}${tb("scan", "Verificar se há alterações de hardware")}</div>
      <div class="dm-tree" role="tree" aria-label="Dispositivos">${rows.map((r) => `<div class="dm-row lvl-${r.level} ${r.id === st.sel ? "is-sel" : ""}" role="treeitem" aria-level="${r.level + 1}" aria-selected="${r.id === st.sel}" ${r.level < 2 ? `aria-expanded="${Boolean(r.open)}"` : ""} tabindex="${r.id === st.sel ? 0 : -1}" data-dm-row="${safe(r.id)}">${r.level < 2 ? `<button type="button" class="dm-chev ${r.open ? "is-open" : ""}" data-dm-toggle="${safe(r.id)}" tabindex="-1" aria-label="${r.open ? "Recolher" : "Expandir"}"></button>` : '<i class="dm-chev-space"></i>'}${dmIcon(r.icon)}<span>${safe(r.label)}</span></div>`).join("")}</div>
      <footer class="dm-statusbar"></footer>${dmMenu(st, dev)}${dialogDev ? dmDialog(dialogDev, st, s) : ""}</section>`;
    record.address.textContent = "Gerenciador de Dispositivos";
    const tree = record.content.querySelector(".dm-tree");
    tree.scrollTop = scroll;
    if (st.focus) { st.focus = false; tree.querySelector(".dm-row.is-sel")?.focus(); }
    if (record.dmWired) return; record.dmWired = true;
    D().emit("drivers:devmgr-opened", {});
    const toggle = (id) => { const key = id === "root" ? "root" : id.slice(4); st.open[key] = !st.open[key]; };
    const find = (id) => dmDevices(D().get()).find((d) => d.id === id);
    const select = (id) => { st.sel = id; if (id === "unknown") D().emit("drivers:devmgr-unknown", {}); const d = find(id); if (d) O.events.emit("devmgr:selected", { id, code: d.code || 0 }, "devmgr"); };
    const openProps = (id) => { const d = find(id); if (!d) return; st.dialog = id; st.tab = "general"; st.menu = null; if (id === "unknown") D().emit("drivers:devmgr-unknown", {}); O.events.emit("devmgr:properties", { id, code: d.code || 0, tab: "general" }, "devmgr"); };
    async function act(a) {
      const id = st.dialog || st.sel, isPrn = id === "printer", dev = find(id);
      st.menu = null;
      if (dev?.onToggle && (a === "enable" || a === "disable")) {
        if (a === "enable" || await O.ui.confirm({ title: "Desabilitar Dispositivo", message: "Desabilitar este dispositivo fará com que ele pare de funcionar. Deseja realmente desabilitá-lo?", confirmLabel: "Sim" })) { dev.onToggle(a === "enable"); O.events.emit("devmgr:toggled", { id, enabled: a === "enable" }, "devmgr"); }
        deviceManager(record); return;
      }
      if (a === "enable") O.ui.notify("Habilitar Dispositivo", "Este dispositivo já está habilitado.", "info", 3200);
      if (a === "restart") { dev?.onRestart?.(); st.dialog = null; deviceManager(record); return; }
      if (dev?.updateText && a === "update") { O.ui.notify("Atualizar Driver", dev.updateText, "info", 6400); deviceManager(record); return; }
      if (dev?.info && a === "uninstall") { O.ui.notify("Desinstalar Dispositivo", "Nesta atividade, não desinstale este dispositivo: descubra a causa e use a correção certa.", "info", 5200); deviceManager(record); return; }
      if (a === "props") openProps(id);
      if (a === "scan") O.ui.notify("Gerenciador de Dispositivos", "Verificação concluída: nenhuma alteração de hardware nova.", "info", 3200);
      if (a === "update") O.ui.notify("Atualizar Driver", id === "unknown" || isPrn ? "O Windows procurou automaticamente e não encontrou um driver melhor. Para impressoras, baixe o driver no site oficial da fabricante." : "Os melhores drivers para o dispositivo já estão instalados.", "info", 6400);
      if (a === "details") O.ui.notify("Detalhes do Driver", isPrn ? "Arquivo: C:\\Windows\\System32\\DriverStore\\FileRepository\\printix_ij2350.inf" : "Arquivos de driver fornecidos pelo Windows.", "info", 5200);
      if (a === "disable" && !dev?.onToggle) O.ui.notify("Desabilitar Dispositivo", "Nesta atividade, mantenha os dispositivos ativados.", "info", 4200);
      if (a === "rollback" && isPrn && await O.ui.confirm({ title: "Reversão de Pacote de Driver", message: "Tem certeza de que deseja reverter para o software de driver instalado anteriormente? O driver que funcionava antes será restaurado.", confirmLabel: "Sim" })) { D().rollback(); O.ui.notify("Driver revertido", `Versão ${D().get().driver.version} restaurada.`, "success"); }
      if (a === "uninstall") {
        if (!isPrn) O.ui.notify("Desinstalar Dispositivo", "Nesta atividade, só a impressora pode ser desinstalada.", "info", 4200);
        else if (await O.ui.confirm({ title: "Desinstalar Dispositivo", message: `Aviso: você está prestes a desinstalar este dispositivo do sistema: ${prnName()}. Ele volta a aparecer como Dispositivo desconhecido.`, confirmLabel: "Desinstalar" })) { D().uninstall(); st.dialog = null; st.sel = "root"; }
      }
      deviceManager(record);
    }
    record.content.addEventListener("click", (event) => {
      const t = event.target.closest("[data-dm-toggle]")?.dataset.dmToggle;
      if (t) { st.menu = null; toggle(t); st.sel = t; deviceManager(record); return; }
      const row = event.target.closest("[data-dm-row]")?.dataset.dmRow;
      if (row) {
        // duplo clique detectado aqui: o primeiro clique redesenha a lista e o navegador perderia o dblclick
        const now = Date.now(), twice = st.last?.id === row && now - st.last.at < 500;
        st.last = twice ? null : { id: row, at: now }; st.menu = null;
        if (twice) { if (row === "root" || row.startsWith("cat:")) toggle(row); else openProps(row); } else select(row);
        deviceManager(record); return;
      }
      const tab = event.target.closest("[data-dm-tab]")?.dataset.dmTab;
      if (tab) { st.tab = tab; if (tab === "driver" && st.dialog === "printer") D().emit("drivers:devmgr-properties", { tab: "driver" }); O.events.emit("devmgr:properties", { id: st.dialog, code: find(st.dialog)?.code || 0, tab }, "devmgr"); deviceManager(record); return; }
      if (event.target.closest("[data-dm-close]")) { st.dialog = null; st.focus = true; deviceManager(record); return; }
      const bar = event.target.closest("[data-dm-bar]");
      if (bar?.dataset.dmBar === "action") { const r = bar.getBoundingClientRect(), base = record.content.querySelector(".dm-app").getBoundingClientRect(); st.menu = st.menu ? null : { x: r.left - base.left, y: r.bottom - base.top }; deviceManager(record); return; }
      const a = event.target.closest("[data-dm-act]:not([disabled])")?.dataset.dmAct || event.target.closest("[data-dm-menu]:not([disabled])")?.dataset.dmMenu || event.target.closest("[data-dm-tb]:not([disabled])")?.dataset.dmTb;
      if (a === "help") O.ui.notify("Ajuda do Gerenciador de Dispositivos", "Dê dois cliques em um dispositivo para ver as propriedades. O triângulo amarelo indica problema no driver.", "info", 5600);
      if (a && !["back", "forward", "tree", "help"].includes(a)) { act(a); return; }
      if (st.menu && !event.target.closest(".dm-ctx")) { st.menu = null; deviceManager(record); }
    });
    record.content.addEventListener("contextmenu", (event) => {
      const row = event.target.closest("[data-dm-row]")?.dataset.dmRow;
      if (!row) return;
      // a lista é redesenhada aqui: sem parar o evento, o menu da Área de Trabalho também abriria
      event.preventDefault(); event.stopPropagation();
      const base = record.content.querySelector(".dm-app").getBoundingClientRect();
      select(row); st.menu = { x: event.clientX - base.left, y: event.clientY - base.top };
      deviceManager(record);
    });
    record.content.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && (st.dialog || st.menu)) { st.dialog = null; st.menu = null; st.focus = true; deviceManager(record); return; }
      if (!event.target.closest(".dm-tree")) return;
      const list = dmRows(st, dmTree(D().get())), i = list.findIndex((r) => r.id === st.sel), r = list[i];
      if (!r) return;
      let handled = true;
      if (event.key === "ArrowDown" && i < list.length - 1) st.sel = list[i + 1].id;
      else if (event.key === "ArrowUp" && i > 0) st.sel = list[i - 1].id;
      else if ((event.key === "ArrowRight" && r.level < 2 && !r.open) || (event.key === "ArrowLeft" && r.level < 2 && r.open)) toggle(r.id);
      else if (event.key === "Enter") { if (r.level === 2) openProps(r.id); else toggle(r.id); }
      else handled = false;
      if (!handled) return;
      event.preventDefault(); select(st.sel); st.focus = !st.dialog; deviceManager(record);
    });
  }

  // ================= Informações do Sistema =================
  function sysInfo(record) {
    const rows = [["Nome do dispositivo", "OSLAB-PC"], ["Fabricante do sistema", "Vertex"], ["Modelo do sistema", "Note 14 (VN14-2026)"], ["Processador", "Processador x64 de 4 núcleos (simulado) 2,40 GHz"], ["RAM instalada", "8,00 GB"], ["Tipo de sistema", "Sistema operacional de 64 bits, processador baseado em x64"]];
    const win = [["Edição", "Windows 11 Pro"], ["Versão", "24H2"], ["Instalado em", "02/02/2026"]];
    record.content.innerHTML = `<section class="si-app"><small>Sistema › Sobre</small><h1>Sobre</h1><article class="si-head"><strong>OSLAB-PC</strong><span>Vertex Note 14</span></article><article><h2>Especificações do dispositivo</h2><dl>${rows.map(([k, v]) => `<div class="${k === "Tipo de sistema" ? "is-key" : ""}"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></article><article><h2>Especificações do Windows</h2><dl>${win.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></article></section>`;
    record.address.textContent = "Informações do Sistema";
    if (!record.siEmitted) { record.siEmitted = true; D().emit("drivers:sysinfo-opened", {}); }
  }

  // ================= Assistente de instalação do driver =================
  function openInstaller(fileId) {
    if (O.software.getDownload(fileId)?.status !== "completed") { O.ui.notify("Aguarde o download", "O arquivo ainda não terminou de baixar.", "info"); return null; }
    D().emit("drivers:installer-opened", { fileId });
    if (D().files[fileId]?.os === "mac") { const [t, m] = D().PROBLEM_TEXT.mac; O.ui.notify(t, m, "warning", 6400); D().emit("drivers:install-error", { fileId, reason: "mac" }); return null; }
    O.shell.closeApp("driverinstaller");
    return O.shell.openApp("driverinstaller", { fileId });
  }
  function installer(record) {
    const fileId = record.options?.fileId, file = O.software.installers[fileId];
    const st = record.wiz || (record.wiz = { step: 0, accepted: false, progress: 0 });
    const s = D().get();
    const problem = D().problem(fileId);
    let body;
    if (st.step === 0) body = `<h2>Bem-vindo ao assistente de instalação</h2><p>Este assistente instala o software da impressora Printix.</p><p class="dw-file">${safe(file?.fileName || "")}</p><p>Feche outros programas antes de continuar.</p>`;
    else if (st.step === "error") { const [t, m] = D().PROBLEM_TEXT[problem]; body = `<div class="dw-error"><strong>${safe(t)}</strong><p>${safe(m)}</p></div>`; }
    else if (st.step === 1) body = `<h2>Contrato de licença</h2><div class="dw-license">Este software é fornecido pela Printix para uso com impressoras Printix compatíveis. Você pode instalá-lo em computadores que usam a impressora. Não é permitido modificar o driver.</div><label class="dw-check"><input type="checkbox" data-dw-accept ${st.accepted ? "checked" : ""}/> Aceito os termos do contrato</label>`;
    else if (st.step === 2) body = `<h2>Conecte a impressora</h2><p>${s.usb ? "Impressora detectada: Printix InkJet 2350 (USB)." : "Ligue a impressora e conecte o cabo USB ao computador agora."}</p><div class="dw-usb ${s.usb ? "is-on" : ""}"><img src="${D().printers[D().LAB].img}" alt="" /><span class="dw-cable"></span><span class="dw-pc">PC</span></div>${s.usb ? "" : '<button class="win-button is-primary" data-dw="usb">Conectar cabo USB</button>'}`;
    else if (st.step === 3) body = `<h2>Instalando o driver…</h2><p>Copiando arquivos e registrando a impressora no Windows.</p><div class="dw-bar"><i style="transform:scaleX(${st.progress / 100})"></i></div><p>${st.progress}%</p>`;
    else body = `<h2>Instalação concluída!</h2><p>O driver Printix ${safe(D().files[fileId].version)} foi instalado. Imprima uma página de teste para conferir.</p>`;
    const next = st.step === 0 ? `<button class="win-button is-primary" data-dw="next">Avançar</button>` : st.step === 1 ? `<button class="win-button is-primary" data-dw="next" ${st.accepted ? "" : "disabled"}>Avançar</button>` : st.step === 2 ? `<button class="win-button is-primary" data-dw="next" ${s.usb ? "" : "disabled"}>Instalar</button>` : st.step === 4 ? `<button class="win-button is-primary" data-dw="done">Concluir</button>` : st.step === "error" ? `<button class="win-button" data-dw="close">Fechar</button>` : "";
    record.content.innerHTML = `<section class="dw-app"><aside><span class="px-logo">Printix</span><ol>${["Início", "Licença", "Conexão", "Instalação", "Fim"].map((t, i) => `<li class="${st.step === i ? "is-on" : typeof st.step === "number" && st.step > i ? "is-done" : ""}">${t}</li>`).join("")}</ol></aside><main>${body}<footer>${st.step !== 4 && st.step !== "error" ? '<button class="win-button" data-dw="close">Cancelar</button>' : ""}${next}</footer></main></section>`;
    record.address.textContent = "Instalação do driver Printix";
    if (record.dwWired) return; record.dwWired = true;
    record.content.addEventListener("change", (e) => { if (e.target.matches("[data-dw-accept]")) { st.accepted = e.target.checked; installer(record); } });
    record.content.addEventListener("click", (e) => {
      const a = e.target.closest("[data-dw]")?.dataset.dw;
      if (!a) return;
      if (a === "close") { O.shell.closeApp("driverinstaller"); return; }
      if (a === "usb") { D().connectUsb(); installer(record); return; }
      if (a === "done") { O.shell.closeApp("driverinstaller"); return; }
      if (a === "next") {
        if (st.step === 0) { if (problem) { st.step = "error"; D().emit("drivers:install-error", { fileId, reason: problem }); } else st.step = 1; }
        else if (st.step === 1) st.step = 2;
        else if (st.step === 2) {
          st.step = 3; st.progress = 0;
          const tick = global.setInterval(() => { st.progress = Math.min(100, st.progress + 20); if (st.progress >= 100) { global.clearInterval(tick); D().install(fileId); st.step = 4; } if (record.element?.isConnected) installer(record); else global.clearInterval(tick); }, 500);
        }
        installer(record);
      }
    });
  }

  // ================= trilha (página e robô) =================
  const sections = [
    { slug: "identify", kicker: "Unidade 1 · Missões 1–3", title: "Identifique", description: "Conheça a impressora, o problema e o seu computador.", orders: [1, 2, 3], icon: "folder_search" },
    { slug: "find", kicker: "Unidade 2 · Missões 4–8", title: "Encontre o driver certo", description: "Pesquise, escolha o site oficial, o modelo, o sistema e o arquivo.", orders: [4, 5, 6, 7, 8], icon: "globe_search" },
    { slug: "install", kicker: "Unidade 3 · Missões 9–12", title: "Instale e teste", description: "Instale, confira, imprima e resolva problemas de driver.", orders: [9, 10, 11, 12], icon: "window_wrench" },
  ];
  let selectedId = null;
  function trail(record) {
    records.add(record);
    const missions = O.driversLab.getMissions(), progress = O.driversLab.getProgress(), done = Object.keys(progress.completed).length, T = O.driversLab.TOTAL;
    if (!selectedId || missions.find((m) => m.id === selectedId)?.status === "locked") selectedId = progress.active?.id || missions.find((m) => m.status === "available")?.id || missions[0].id;
    const m = missions.find((x) => x.id === selectedId), active = progress.active?.id === selectedId ? progress.active : null;
    const actions = active && !active.suspended ? active.phase === "completed" ? `<button data-dl="repeat">Refazer</button><button class="learning-primary" data-dl="next">${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>` : `<button class="learning-primary" data-dl="continue">Continuar no sistema</button><button data-dl="tool">Abrir ferramenta</button><button data-dl="restart">Reiniciar missão</button>` : `<button class="learning-primary" data-dl="start" ${m.status === "locked" ? "disabled" : ""}>${active?.suspended ? "Retomar missão" : progress.completed[m.id] ? "Praticar novamente" : "Iniciar missão"}</button>`;
    record.content.innerHTML = `<section class="learning-page drivers-trail-page"><header class="learning-hero"><div class="learning-hero-copy"><span class="learning-app-mark"><img src="assets/drivers/trail-icon.svg" alt="" /></span><div><small>OSLAB · TRILHA PRÁTICA</small><h1>Drivers: instalando uma impressora</h1><p>Descubra o modelo, encontre o driver oficial certo, instale e teste.</p></div></div><div class="learning-stats"><span><strong>${done}/${T}</strong><small>concluídas</small></span><span><strong>${progress.totalScore}/${T * 10}</strong><small>pontos</small></span><div class="learning-progress"><i style="width:${(done / T) * 100}%"></i></div></div></header><div class="learning-toolbar"><span>${progress.active?.suspended ? "Missão pausada. Retome para continuar." : "Seu progresso é salvo neste dispositivo."}</span><button data-dl="reset">${O.learningPath.actionIcon("arrow_reset")}Redefinir progresso</button></div><div class="learning-layout"><main class="learning-trail-scroller" aria-label="Missões de drivers">${done === T ? `<section class="wifi-finale"><img src="assets/drivers/trail-icon.svg" alt="" /><h2>Impressora instalada como um técnico!</h2><p>Você identificou, pesquisou, instalou, testou e corrigiu um driver.</p><strong>${T}/${T} missões · ${T * 10} pontos</strong></section>` : ""}${O.learningPath.renderSections(missions, sections, selectedId, "drivers-mission")}</main><aside class="learning-detail-panel"><div class="learning-detail-icon is-${m.status}"><img src="${m.icon}" alt="" /></div><div class="learning-detail-heading"><small>Missão ${String(m.order).padStart(2, "0")}</small><h2>${safe(m.title)}</h2><span class="learning-status is-${m.status}">${O.learningPath.statusLabel(m.status, true)}</span></div><p class="learning-description">${safe(m.description)}</p><section class="learning-goal"><h3>Aprenda fazendo</h3><p>${safe(m.goal)}</p></section><div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, active)}<p class="learning-description">Depois da prática, responda à pergunta no robô para concluir.</p><div class="learning-detail-actions">${actions}</div></aside></div></section>`;
    record.address.textContent = "Drivers";
    if (record.dlWired) return; record.dlWired = true;
    record.content.addEventListener("click", async (event) => {
      const pick = event.target.closest("[data-drivers-mission-select]")?.dataset.driversMissionSelect;
      if (pick) { selectedId = pick; trail(record); return; }
      const a = event.target.closest("[data-dl]")?.dataset.dl;
      if (a === "start" && O.driversLab.start(selectedId).ok) O.windowManager.minimize(record.windowId);
      if (a === "continue") { O.assistantRobot.expand(); O.windowManager.minimize(record.windowId); }
      if (a === "tool") { event.stopPropagation(); openTool(); }
      if (a === "repeat") O.driversLab.finish("repeat");
      if (a === "next") O.driversLab.finish("next");
      if (a === "restart") O.driversLab.restart();
      if (a === "reset" && await O.ui.confirm({ title: "Redefinir a trilha de Drivers?", message: "As conclusões, a tentativa atual e os pontos desta trilha serão apagados.", confirmLabel: "Redefinir" })) { O.driversLab.reset(); selectedId = null; trail(record); }
    });
  }
  function openTool() {
    const m = O.driverMissionCatalog.find((x) => x.id === O.driversLab.getProgress().active?.id);
    if (!m) return;
    if (m.tool !== "google") { O.shell.openApp(m.tool); return; }
    const record = O.shell.openApp("google");
    if (!record) return;
    if (m.order === 4) O.browserApp.navigate(record, "google.com");
    if (m.order === 5 && !record.googleQuery) O.browserApp.search(record, "Printix InkJet 2350 driver");
    if (m.order >= 6 && m.order <= 8 && !O.driverSites.isHost(record.browserHost)) O.browserApp.navigate(record, HOST);
    if (m.order === 9) { record.downloadPanelOpen = true; O.browserApp.render(record); }
  }
  function recordForm(m, a) {
    const sel = (name, label, opts) => `<label>${label}<select name="${name}" required><option value="">Selecione</option>${opts.map((o) => `<option>${o}</option>`).join("")}</select></label>`;
    const fields = m.order === 3 ? sel("brand", "Marca", ["Printix", "Lumina", "Inktec"]) + sel("model", "Modelo", ["InkJet 2305", "InkJet 2350", "InkJet 2350 Pro", "InkJet 2530"]) + sel("system", "Sistema", ["Windows 11 (64 bits)", "Windows 11 (32 bits)", "macOS 14"]) : sel("version", "Versão do driver", ["3.0.4", "3.1.0", "3.3.0", "02.14"]);
    return `<form class="wifi-record-form" data-drivers-record-form><h3>Registre o que encontrou</h3>${fields}<button type="submit">Conferir</button>${a.recordFeedback ? `<div class="wifi-answer-feedback ${a.recordFeedback.ok ? "is-correct" : "is-wrong"}" role="status">${safe(a.recordFeedback.text)}</div>` : ""}</form>`;
  }
  function quiz(m, a) {
    const f = a.feedback;
    return `<section class="wifi-question" aria-label="Pergunta da missão"><h3>Antes de continuar</h3><p>${safe(m.quiz.text)}</p><div class="wifi-question-options">${m.quiz.options.map((o, i) => `<button type="button" data-drivers-answer="${i}" class="${f?.index === i ? f.correct ? "is-correct" : "is-wrong" : ""}" ${a.phase === "completed" ? "disabled" : ""}>${safe(o)}</button>`).join("")}</div>${f ? `<div class="wifi-answer-feedback ${f.correct ? "is-correct" : "is-wrong"}" role="status"><strong>${f.correct ? "Resposta correta!" : "Ainda não. Tente novamente."}</strong> ${safe(f.text)}</div>` : "<p>Escolha uma opção.</p>"}</section>`;
  }
  function assistantView() {
    const progress = O.driversLab?.getProgress?.(), a = progress?.active;
    if (!a || a.suspended) return null;
    const m = O.driverMissionCatalog.find((x) => x.id === a.id), completed = a.phase === "completed", T = O.driversLab.TOTAL;
    const step = m.steps.find((x) => !a.checklist[x.objectiveId]);
    const icon = O.learningPath.actionIcon;
    return {
      kind: "drivers-lab", mascot: completed ? "celebrate" : a.notice || a.hintsUsed || a.feedback?.correct === false ? "help" : "neutral",
      eyebrow: `Drivers · Missão ${m.order}/${T}`, title: m.title,
      message: a.phase === "practice" ? step?.text || m.goal : completed ? "Prática e pergunta concluídas. Você ganhou 10 pontos!" : "Você fez a prática. Agora confira o que aprendeu.",
      body: a.phase === "practice" ? `${a.notice ? `<div class="wifi-answer-feedback is-wrong" role="status">${safe(a.notice)}</div>` : ""}<div class="drv-example"><strong>Exemplo</strong>${safe(m.example)}</div>${O.learningPath.renderSteps(m, a)}${m.order === 3 || m.order === 10 ? recordForm(m, a) : ""}${a.lastHint ? `<div class="wifi-answer-feedback">Dica ${a.hintsUsed}/3: ${safe(a.lastHint)}</div>` : ""}` : quiz(m, a),
      actions: completed ? `<button data-assistant-action="drivers-open">${icon("target_arrow")}Ver trilha</button><button data-assistant-action="drivers-repeat">${icon("arrow_reset")}Refazer</button><button class="is-primary" data-assistant-action="drivers-next">${icon("arrow_right")}${m.order < T ? "Próxima missão" : "Ver conclusão"}</button>`
        : `<button data-assistant-action="drivers-tool">${icon("apps")}Abrir ferramenta</button><button data-assistant-action="drivers-hint" ${a.phase !== "practice" ? "disabled" : ""}>${icon("lightbulb")}${a.hintsUsed >= 3 ? "Rever dica 3/3" : `Dica ${a.hintsUsed + 1}/3`}</button><button data-assistant-action="drivers-restart">${icon("arrow_reset")}Reiniciar</button><button data-assistant-action="drivers-pause">${icon("pause")}Pausar</button>`,
    };
  }
  function renderAll() { records.forEach((r) => (r.element?.isConnected ? trail(r) : records.delete(r))); }
  O.driversLab.subscribe((p, reason) => { if (reason === "started") selectedId = p.active?.id || selectedId; renderAll(); });
  // telas que mostram o estado da impressora se atualizam sozinhas
  const live = new Set();
  const refreshLive = () => live.forEach((r) => { if (!r.element?.isConnected) { live.delete(r); return; } if (r.appId === "printer") printerApp(r); if (r.appId === "devicemanager") deviceManager(r); });
  D().subscribe(refreshLive);
  O.devmgr = { register(fn) { providers.push(fn); refreshLive(); }, refresh: refreshLive };
  function renderApp(record) {
    if (record.appId === "driverslab") trail(record);
    if (record.appId === "printer") { live.add(record); if (!record.prnEmitted) { record.prnEmitted = true; D().emit("drivers:printer-opened", {}); } printerApp(record); }
    if (record.appId === "devicemanager") { live.add(record); deviceManager(record); }
    if (record.appId === "sysinfo") sysInfo(record);
    if (record.appId === "driverinstaller") installer(record);
  }
  O.driversApps = { ids: new Set(["driverslab", "printer", "devicemanager", "sysinfo", "driverinstaller"]), render: renderApp, openTool };
  O.driverInstaller = { open: openInstaller };
  O.driversLabApp = { assistantView, openTool };
})(window);
