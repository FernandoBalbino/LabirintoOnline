(function createTaskManagerApp(global) {
  "use strict";
  // Gerenciador de Tarefas no padrão do Windows 11 (22H2+): menu lateral, grupos por tipo, mapa de calor e tema escuro.
  const OSLab = global.OSLab = global.OSLab || {};
  const records = new Set();
  const FL = "assets/icons/taskmanager/fluent/";
  const PREFS_KEY = "oslab.taskmanager.prefs.v1";
  const nav = [
    ["processes", "Processos", "processes"], ["performance", "Desempenho", "performance"], ["history", "Histórico de aplicativos", "history"],
    ["startup", "Aplicativos de inicialização", "startup"], ["users", "Usuários", "users"], ["details", "Detalhes", "details"], ["services", "Serviços", "services"],
  ];
  const groups = [["app", "Aplicativos"], ["background", "Processos em segundo plano"], ["windows", "Processos do Windows"]];
  const CPU_NAME = "Intel(R) Celeron(R) N4500 @ 1.10GHz";
  const history = { cpu: [], memory: [], disk: [], wifi: [] };
  const services = [
    ["AudioEndpointBuilder", "Construtor de Pontos de Extremidade de Áudio do Windows", "LocalSystemNetworkRestricted"], ["Audiosrv", "Áudio do Windows", "LocalServiceNetworkRestricted"],
    ["BITS", "Serviço de Transferência Inteligente em Segundo Plano", "netsvcs"], ["Dhcp", "Cliente DHCP", "LocalServiceNetworkRestricted"], ["Dnscache", "Cliente DNS", "NetworkService"],
    ["EventLog", "Log de Eventos do Windows", "LocalServiceNetworkRestricted"], ["Spooler", "Spooler de Impressão", ""], ["Themes", "Temas", "netsvcs"],
    ["WinDefend", "Serviço Microsoft Defender Antivírus", ""], ["WlanSvc", "Configuração Automática de WLAN", "LocalSystemNetworkRestricted"],
    ["wuauserv", "Windows Update", "netsvcs"], ["WSearch", "Windows Search", ""], ["bthserv", "Serviço de Suporte Bluetooth", "LocalService"], ["Fax", "Fax", ""],
  ].map(([name, description, group], index) => ({ name, description, group, running: !["Fax", "bthserv", "wuauserv"].includes(name), pid: 1200 + index * 76 }));
  let prefs = { theme: "system", start: "processes", speed: "normal", grouped: true };
  try { prefs = { ...prefs, ...(JSON.parse(global.localStorage.getItem(PREFS_KEY) || "{}") || {}) }; } catch (_) { /* sem armazenamento */ }
  const savePrefs = () => { try { global.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) { /* sem armazenamento */ } };

  const safe = (value) => OSLab.ui.escapeHtml(value);
  // a máscara vai no style da própria tag: url() relativo ao documento (dentro do CSS ele apontaria para css/)
  const ic = (name, cls = "") => `<i class="tm-ic ${cls}" style="-webkit-mask-image:url(${FL}${name}.svg);mask-image:url(${FL}${name}.svg)" aria-hidden="true"></i>`;
  const num = (value, digits = 1) => Number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const emit = (type, detail = {}) => OSLab.events.emit(type, detail, "taskManager");
  const label = (process) => process.groupCount > 1 ? `${process.name} (${process.groupCount})` : process.name;
  const userOf = (process) => process.kind === "windows" ? "SYSTEM" : process.kind === "background" && process.protected ? "LOCAL SERVICE" : OSLab.users?.getCurrent?.()?.displayName || "Aluno";
  function usage() {
    const all = OSLab.processManager.getProcesses(), u = OSLab.processManager.getUsage();
    const disk = Math.min(100, all.reduce((sum, p) => sum + p.disk, 0)), net = all.reduce((sum, p) => sum + p.network, 0);
    return { all, cpu: Math.min(100, Math.round(u.cpuPercent)), memory: Math.round(u.memoryPercent), memoryUsed: u.memoryUsedMb, disk: Math.round(disk), net, netPercent: Math.min(100, Math.round(net)) };
  }
  function matches(record, ...values) {
    const query = String(record.taskQuery || "").trim().toLocaleLowerCase("pt-BR");
    return !query || values.some((value) => String(value).toLocaleLowerCase("pt-BR").includes(query));
  }
  function sorted(record, list, key = record.taskSort, direction = record.taskSortDirection) {
    return [...list].sort((a, b) => {
      const av = key === "name" ? label(a) : a[key], bv = key === "name" ? label(b) : b[key];
      const result = typeof av === "string" ? av.localeCompare(bv, "pt-BR") : Number(av) - Number(bv);
      return direction === "asc" ? result : -result;
    });
  }
  /** mapa de calor: azul baixo, laranja alto (igual ao Windows 11) */
  function heat(value, max) {
    const level = Math.max(0, Math.min(1, Number(value) / max));
    return `style="--h:${(0.18 + level * 0.82).toFixed(2)}" class="tm-num${level >= 0.55 ? " is-hot" : ""}"`;
  }

  // ---------------- Processos ----------------
  function processRow(record, process, max) {
    const selected = String(record.selectedProcessId) === String(process.pid);
    const open = record.expanded.has(process.pid);
    const status = process.status !== "Em execução" ? safe(process.status) : process.efficient ? `${ic("efficiency", "is-leaf")}` : "";
    const row = `<div class="tm-row${selected ? " is-selected" : ""}${process.status === "Não respondendo" ? " is-hung" : ""}" role="row" tabindex="-1" data-process-id="${process.pid}" aria-selected="${selected}">
      <span class="tm-name">${process.groupCount > 1 ? `<button type="button" class="tm-chev${open ? " is-open" : ""}" data-task-expand="${process.pid}" aria-label="${open ? "Recolher" : "Expandir"}">${ic("chevron-right")}</button>` : "<b></b>"}<img src="${safe(process.icon)}" alt="" /><span>${safe(label(process))}</span></span>
      <span class="tm-status">${status}</span>
      <span ${heat(process.cpu, 50)}>${process.cpu ? num(process.cpu) : "0"}%</span><span ${heat(process.memory, max.memory)}>${num(process.memory)} MB</span>
      <span ${heat(process.disk, 20)}>${process.disk ? num(process.disk) : "0"} MB/s</span><span ${heat(process.network, 10)}>${process.network ? num(process.network) : "0"} Mbps</span></div>`;
    const children = open ? Array.from({ length: process.groupCount }, (_, i) => `<div class="tm-row is-child" role="row"><span class="tm-name"><b></b><img src="${safe(process.icon)}" alt="" /><span>${safe(i ? `${process.name} ${i + 1}` : process.name)}</span></span><span></span><span class="tm-num">0%</span><span class="tm-num">${num(process.memory / process.groupCount)} MB</span><span class="tm-num">0 MB/s</span><span class="tm-num">0 Mbps</span></div>`).join("") : "";
    return row + children;
  }
  function processesPage(record) {
    const u = usage();
    const list = u.all.filter((p) => matches(record, p.name, p.pid, p.exe));
    const max = { memory: 1000 };
    // só quando a lista muda de verdade (não a cada segundo do relógio)
    const located = list.map((p) => p.pid).join(",");
    if (record.located !== located) { record.located = located; list.forEach((process) => emit("process:located", { pid: process.pid, appId: process.appId, query: record.taskQuery || "" })); }
    const head = (key, labelText, total) => `<button type="button" class="tm-col${record.taskSort === key ? " is-sorted" : ""}" data-task-sort="${key}" role="columnheader">${record.taskSort === key && key !== "name" ? ic(record.taskSortDirection === "asc" ? "chevron-up" : "chevron-down", "tm-sortmark") : ""}${total !== undefined ? `<strong>${total}%</strong>` : ""}<span>${labelText}</span></button>`;
    const body = prefs.grouped
      ? groups.map(([kind, title]) => {
        const items = sorted(record, list.filter((p) => (p.kind || "background") === kind));
        if (!items.length) return "";
        const closed = record.collapsedGroups.has(kind);
        return `<div class="tm-group" role="row"><button type="button" class="tm-chev${closed ? "" : " is-open"}" data-task-group="${kind}">${ic("chevron-right")}</button><strong>${title} (${items.length})</strong></div>${closed ? "" : items.map((p) => processRow(record, p, max)).join("")}`;
      }).join("")
      : sorted(record, list).map((p) => processRow(record, p, max)).join("");
    return `<div class="tm-table tm-processes" role="table" aria-label="Processos"><div class="tm-thead" role="row">${head("name", "Nome")}${head("status", "Status")}${head("cpu", "CPU", u.cpu)}${head("memory", "Memória", u.memory)}${head("disk", "Disco", u.disk)}${head("network", "Rede", u.netPercent)}</div><div class="tm-tbody">${body || `<p class="tm-empty">Nenhum resultado para "${safe(record.taskQuery)}".</p>`}</div></div>`;
  }

  // ---------------- Desempenho ----------------
  function spark(points, w, h, color, fill = true) {
    const data = points.length ? points : [0];
    const step = w / 59, start = 60 - data.length;
    const coords = data.map((v, i) => `${((start + i) * step).toFixed(1)},${(h - (Math.min(100, v) / 100) * h).toFixed(1)}`).join(" ");
    const first = (start * step).toFixed(1);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${fill ? `<polygon points="${first},${h} ${coords} ${w},${h}" fill="${color}" fill-opacity=".18"/>` : ""}<polyline points="${coords}" fill="none" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function uptime() {
    const seconds = Math.floor((Date.now() - (global.OSLabBootAt || Date.now())) / 1000);
    return `0:${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function performancePage(record) {
    const u = usage(), net = OSLab.network?.getSnapshot?.() || {};
    const usedGb = u.memoryUsed / 1024, totalGb = OSLab.processManager.TOTAL_MEMORY_MB / 1024;
    const devices = [
      ["cpu", "CPU", `${u.cpu}% 1,10 GHz`, "#2f9ae0", history.cpu],
      ["memory", "Memória", `${num(usedGb)}/${num(totalGb)} GB (${u.memory}%)`, "#a074e0", history.memory],
      ["disk", "Disco 0 (C:)", `SSD\n${u.disk}%`, "#4caf50", history.disk],
      ["wifi", "Wi-Fi", net.connectedSsid ? `${net.connectedSsid}\nE: 0 R: ${num(u.net)} Mbps` : "Não conectado", "#d18b47", history.wifi],
    ];
    const view = record.perfView || "cpu", d = devices.find(([id]) => id === view);
    const kv = (rows) => `<dl class="tm-kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
    const details = view === "cpu"
      ? `<div class="tm-stats">${kv([["Utilização", `${u.cpu}%`], ["Velocidade", "1,10 GHz"], ["Processos", u.all.length], ["Threads", 980 + u.all.length * 11], ["Identificadores", 31240 + u.all.length * 120], ["Tempo de atividade", uptime()]])}${kv([["Velocidade base:", "1,10 GHz"], ["Soquetes:", "1"], ["Núcleos:", "2"], ["Processadores lógicos:", "2"], ["Virtualização:", "Habilitado"], ["Cache L2:", "1,5 MB"], ["Cache L3:", "4,0 MB"]])}</div>`
      : view === "memory" ? `<div class="tm-stats">${kv([["Em uso", `${num(usedGb)} GB`], ["Disponível", `${num(totalGb - usedGb)} GB`], ["Confirmada", `${num(usedGb + 1.2)}/${num(totalGb + 2.5)} GB`], ["Em cache", "0,9 GB"]])}${kv([["Velocidade:", "2933 MT/s"], ["Slots usados:", "1 de 1"], ["Fator forma:", "SODIMM"], ["Reservado para hardware:", "112 MB"]])}</div>`
      : view === "disk" ? `<div class="tm-stats">${kv([["Tempo ativo", `${u.disk}%`], ["Velocidade de leitura", "0 KB/s"], ["Velocidade de gravação", `${u.disk ? num(u.disk) : "0"} MB/s`]])}${kv([["Capacidade:", "238 GB"], ["Formatado:", "238 GB"], ["Disco do sistema:", "Sim"], ["Tipo:", "SSD (NVMe)"]])}</div>`
      : `<div class="tm-stats">${kv([["Enviar", "0 Kbps"], ["Receber", `${num(u.net * 1000, 0)} Kbps`]])}${kv([["Nome do adaptador:", "Wi-Fi"], ["SSID:", safe(net.connectedSsid || "—")], ["Tipo de conexão:", "802.11ac"], ["Endereço IPv4:", safe(net.ipv4 || net.ip || "192.168.1.15")]])}</div>`;
    const subtitle = view === "cpu" ? CPU_NAME : view === "memory" ? `${num(totalGb)} GB` : view === "disk" ? "SSD 256 GB" : "Intel(R) Wi-Fi 6 AX201";
    return `<div class="tm-perf"><nav class="tm-perf-list">${devices.map(([id, name, value, color, data]) => `<button type="button" class="${id === view ? "is-active" : ""}" data-perf-view="${id}"><span class="tm-mini" style="--c:${color}">${spark(data, 70, 44, color)}</span><span><strong>${name}</strong><small>${safe(value).replace("\n", "<br>")}</small></span></button>`).join("")}</nav>
      <section class="tm-perf-main"><header><h3>${d[1]}</h3><span>${safe(subtitle)}</span></header><div class="tm-graph-head"><small>% de utilização em 60 segundos</small><small>100%</small></div><div class="tm-graph" style="--c:${d[3]}">${spark(d[4], 600, 240, d[3])}</div><div class="tm-graph-head"><small>60 segundos</small><small>0</small></div>${details}</section></div>`;
  }

  // ---------------- outras páginas ----------------
  function historyPage(record) {
    const rows = [["Google Chrome", "assets/browser/chrome.svg", "0:14:32", "212,4 MB"], ["WhatsApp", "assets/icons/trails/whatsapp.svg", "0:06:10", "48,9 MB"], ["Explorador de Arquivos", "assets/icons/explorer.png", "0:02:41", "0 MB"], ["Configurações", "assets/icons/settings.png", "0:01:12", "0,1 MB"], ["Terminal", "assets/icons/terminal.png", "0:00:21", "0 MB"], ["Missões", "assets/icons/trails/missions.svg", "0:03:55", "1,2 MB"]].filter(([n]) => matches(record, n));
    return `<p class="tm-note">Uso de recursos desde 01/11/2026 para a conta de usuário atual.</p><div class="tm-table tm-simple" role="table"><div class="tm-thead" role="row"><span>Nome</span><span>Tempo de CPU</span><span>Rede</span><span>Rede limitada</span><span>Atualizações de bloco</span></div><div class="tm-tbody">${rows.map(([n, icon, t, r]) => `<div class="tm-row" role="row"><span class="tm-name"><b></b><img src="${icon}" alt="" /><span>${n}</span></span><span class="tm-num">${t}</span><span class="tm-num">${r}</span><span class="tm-num">0 MB</span><span class="tm-num">0 MB</span></div>`).join("")}</div></div>`;
  }
  function startupPage(record) {
    const apps = OSLab.processManager.getStartupApps().filter((app) => matches(record, app.name, app.publisher));
    return `<p class="tm-note tm-bios">Último tempo do BIOS: <strong>3,4 segundos</strong></p><div class="tm-table tm-startup" role="table" aria-label="Aplicativos de inicialização"><div class="tm-thead" role="row"><span>Nome</span><span>Editor</span><span>Status</span><span>Impacto na inicialização</span></div><div class="tm-tbody">${apps.map((app) => `<div class="tm-row${record.selectedStartupId === app.id ? " is-selected" : ""}" role="row" data-startup-id="${app.id}" aria-selected="${record.selectedStartupId === app.id}"><span class="tm-name"><b></b><img src="${app.icon}" alt="" /><span>${safe(app.name)}</span></span><span>${safe(app.publisher)}</span><span>${app.enabled ? "Habilitado" : "Desabilitado"}</span><span class="tm-impact is-${app.enabled ? app.impact.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() : "nenhum"}">${app.enabled ? app.impact : "Nenhum"}</span></div>`).join("")}</div></div>`;
  }
  function usersPage(record) {
    const u = usage(), mine = u.all.filter((p) => p.kind === "app" || (p.kind === "background" && !p.protected));
    const name = OSLab.users?.getCurrent?.()?.displayName || "Aluno", open = record.expanded.has("user");
    const sum = (key) => mine.reduce((s, p) => s + p[key], 0);
    return `<div class="tm-table tm-processes" role="table"><div class="tm-thead" role="row"><span>Usuário</span><span>Status</span><span class="tm-num"><strong>${u.cpu}%</strong>CPU</span><span class="tm-num"><strong>${u.memory}%</strong>Memória</span><span class="tm-num"><strong>${u.disk}%</strong>Disco</span><span class="tm-num"><strong>0%</strong>Rede</span></div><div class="tm-tbody"><div class="tm-row" role="row"><span class="tm-name"><button type="button" class="tm-chev${open ? " is-open" : ""}" data-task-expand="user">${ic("chevron-right")}</button><img src="${safe(OSLab.users?.getCurrent?.()?.avatar || "assets/icons/avatar.webp")}" alt="" class="tm-avatar" /><span>${safe(name)} (${mine.length})</span></span><span></span><span class="tm-num">${num(sum("cpu"))}%</span><span class="tm-num">${num(sum("memory"))} MB</span><span class="tm-num">0 MB/s</span><span class="tm-num">0 Mbps</span></div>${open ? mine.map((p) => `<div class="tm-row is-child" role="row"><span class="tm-name"><b></b><img src="${safe(p.icon)}" alt="" /><span>${safe(p.name)}</span></span><span>${p.status !== "Em execução" ? safe(p.status) : ""}</span><span class="tm-num">${num(p.cpu)}%</span><span class="tm-num">${num(p.memory)} MB</span><span class="tm-num">0 MB/s</span><span class="tm-num">0 Mbps</span></div>`).join("") : ""}</div></div>`;
  }
  function detailsPage(record) {
    const list = sorted(record, OSLab.processManager.getProcesses().filter((p) => matches(record, p.exe, p.pid, p.name)), record.detailsSort || "exe", record.detailsDirection || "asc");
    const head = (key, text) => `<button type="button" class="tm-col${(record.detailsSort || "exe") === key ? " is-sorted" : ""}" data-details-sort="${key}">${text}</button>`;
    return `<div class="tm-table tm-details" role="table" aria-label="Detalhes"><div class="tm-thead" role="row">${head("exe", "Nome")}${head("pid", "PID")}${head("status", "Status")}<span>Nome de usuário</span>${head("cpu", "CPU")}${head("memory", "Memória (conjunto de trabalho privado ativo)")}<span>Arquitetura</span><span>Descrição</span></div><div class="tm-tbody">${list.map((p) => `<div class="tm-row${String(record.selectedProcessId) === String(p.pid) ? " is-selected" : ""}" role="row" data-process-id="${p.pid}"><span class="tm-name"><b></b><img src="${safe(p.icon)}" alt="" /><span>${safe(p.exe)}</span></span><span class="tm-num">${p.pid}</span><span>${safe(p.status)}</span><span>${safe(userOf(p))}</span><span class="tm-num">${String(Math.round(p.cpu)).padStart(2, "0")}</span><span class="tm-num">${num(p.memory * 1024, 0)} K</span><span>x64</span><span>${safe(p.name)}</span></div>`).join("")}</div></div>`;
  }
  function servicesPage(record) {
    const list = services.filter((s) => matches(record, s.name, s.description));
    return `<div class="tm-table tm-services" role="table" aria-label="Serviços"><div class="tm-thead" role="row"><span>Nome</span><span>PID</span><span>Descrição</span><span>Status</span><span>Grupo</span></div><div class="tm-tbody">${list.map((s) => `<div class="tm-row${record.selectedService === s.name ? " is-selected" : ""}" role="row" data-service="${s.name}"><span class="tm-name"><b></b>${ic("services")}<span>${s.name}</span></span><span class="tm-num">${s.running ? s.pid : ""}</span><span>${safe(s.description)}</span><span>${s.running ? "Em execução" : "Parado"}</span><span>${safe(s.group)}</span></div>`).join("")}</div></div>`;
  }
  function settingsPage() {
    const select = (name, value, options) => `<select data-tm-pref="${name}">${options.map(([v, t]) => `<option value="${v}" ${v === value ? "selected" : ""}>${t}</option>`).join("")}</select>`;
    return `<div class="tm-settings"><h3>Configurações</h3><section><div><strong>Tema do aplicativo</strong><small>Escolha a aparência do Gerenciador de Tarefas</small></div>${select("theme", prefs.theme, [["system", "Usar configuração do sistema"], ["light", "Claro"], ["dark", "Escuro"]])}</section><section><div><strong>Página inicial padrão</strong><small>Página que aparece ao abrir o Gerenciador</small></div>${select("start", prefs.start, nav.map(([id, text]) => [id, text]))}</section><section><div><strong>Velocidade de atualização em tempo real</strong><small>Com que frequência os números mudam</small></div>${select("speed", prefs.speed, [["high", "Alta"], ["normal", "Normal"], ["low", "Baixa"], ["paused", "Pausado"]])}</section><section><div><strong>Agrupar por tipo</strong><small>Separa Aplicativos, segundo plano e processos do Windows</small></div>${select("grouped", String(prefs.grouped), [["true", "Ativado"], ["false", "Desativado"]])}</section></div>`;
  }

  // ---------------- barra de comandos ----------------
  function commands(record) {
    const p = record.selectedProcessId && OSLab.processManager.getProcessByPid(record.selectedProcessId);
    const btn = (action, icon, text, enabled = true) => `<button type="button" data-task-action="${action}" ${enabled ? "" : "disabled"}>${ic(icon)}<span>${text}</span></button>`;
    const run = btn("run", "run", "Executar nova tarefa");
    if (record.taskNav === "processes" || record.taskNav === "details") {
      const restart = p?.restartable;
      return `${run}<i class="tm-sep"></i>${restart ? btn("restart", "restart", "Reiniciar tarefa") : btn("end", "end", "Finalizar tarefa", Boolean(p))}${btn("efficiency", "efficiency", "Modo de eficiência", Boolean(p && !p.protected && p.kind !== "windows"))}<button type="button" class="tm-more" data-task-action="more" aria-label="Ver mais">${ic("more")}</button>`;
    }
    if (record.taskNav === "startup") {
      const app = OSLab.processManager.getStartupApps().find((item) => item.id === record.selectedStartupId);
      return `${run}<i class="tm-sep"></i>${btn("startup-on", "run", "Habilitar", Boolean(app && !app.enabled))}${btn("startup-off", "end", "Desabilitar", Boolean(app && app.enabled))}`;
    }
    if (record.taskNav === "services") {
      const s = services.find((item) => item.name === record.selectedService);
      return `${run}<i class="tm-sep"></i>${btn("svc-start", "run", "Iniciar", Boolean(s && !s.running))}${btn("svc-stop", "end", "Parar", Boolean(s?.running))}${btn("svc-restart", "restart", "Reiniciar", Boolean(s?.running))}`;
    }
    return record.taskNav === "settings" ? "" : run;
  }
  function overlay(record) {
    if (record.runOpen) return `<div class="tm-modal-backdrop"><form class="tm-run" data-tm-run><h3>Criar nova tarefa</h3><p>Digite o nome de um programa, pasta, documento ou recurso da Internet, e o Windows o abrirá para você.</p><label>Abrir: <input name="command" list="tm-run-list" autocomplete="off" spellcheck="false" required /></label><datalist id="tm-run-list">${["explorer.exe", "chrome", "notepad", "cmd", "taskmgr", "ms-settings:", "whatsapp"].map((v) => `<option value="${v}">`).join("")}</datalist><label class="tm-check"><input type="checkbox" checked disabled /> Criar esta tarefa com privilégios administrativos.</label>${record.runError ? `<p class="tm-run-error" role="alert">${safe(record.runError)}</p>` : ""}<footer><button type="submit" class="is-primary">OK</button><button type="button" data-tm-run-cancel>Cancelar</button></footer></form></div>`;
    if (record.menu) {
      const p = OSLab.processManager.getProcessByPid(record.menu.pid);
      if (!p) return "";
      return `<div class="tm-context" role="menu" style="left:${record.menu.x}px;top:${record.menu.y}px">${p.groupCount > 1 ? `<button type="button" data-task-expand="${p.pid}">${record.expanded.has(p.pid) ? "Recolher" : "Expandir"}</button>` : ""}${p.restartable ? `<button type="button" data-task-action="restart">${ic("restart")}Reiniciar</button>` : ""}<button type="button" data-task-action="end">${ic("end")}Finalizar tarefa</button><button type="button" data-task-action="efficiency" ${p.protected || p.kind === "windows" ? "disabled" : ""}>${ic("efficiency")}Modo de eficiência</button><i></i><button type="button" data-task-action="goto-details">Ir para detalhes</button></div>`;
    }
    if (record.startupMenu) {
      const app = OSLab.processManager.getStartupApps().find((item) => item.id === record.selectedStartupId);
      if (app) return `<div class="tm-context" role="menu" style="left:${record.startupMenu.x}px;top:${record.startupMenu.y}px"><button type="button" data-task-action="${app.enabled ? "startup-off" : "startup-on"}">${ic(app.enabled ? "end" : "run")}${app.enabled ? "Desabilitar" : "Habilitar"}</button></div>`;
    }
    if (record.moreOpen) return `<div class="tm-context tm-more-menu" role="menu"><button type="button" data-task-action="toggle-group">${prefs.grouped ? "✓ " : ""}Agrupar por tipo</button><button type="button" data-task-action="expand-all">Expandir tudo</button><button type="button" data-task-action="collapse-all">Recolher tudo</button></div>`;
    return "";
  }

  function render(record) {
    records.add(record);
    record.taskNav ||= prefs.start || "processes"; record.taskSort ||= "name"; record.taskSortDirection ||= "asc";
    record.expanded ||= new Set(); record.collapsedGroups ||= new Set();
    const title = record.taskNav === "settings" ? "Configurações" : nav.find(([id]) => id === record.taskNav)?.[1] || "Processos";
    record.address.textContent = title;
    record.element.dataset.tmTheme = prefs.theme === "system" ? (document.documentElement.dataset.theme === "dark" ? "dark" : "light") : prefs.theme;
    const page = { processes: processesPage, performance: performancePage, history: historyPage, startup: startupPage, users: usersPage, details: detailsPage, services: servicesPage, settings: settingsPage }[record.taskNav] || processesPage;
    const scroll = record.content.querySelector(".tm-tbody")?.scrollTop || 0;
    record.content.innerHTML = `<section class="tm${record.sideCollapsed ? " is-compact" : ""}"><aside class="tm-side"><button type="button" class="tm-burger" data-task-burger aria-label="Abrir navegação">${ic("menu")}</button><nav aria-label="Páginas do Gerenciador de Tarefas">${nav.map(([id, text, icon]) => `<button type="button" class="${record.taskNav === id ? "is-active" : ""}" data-task-nav="${id}" title="${text}">${ic(icon)}<span>${text}</span></button>`).join("")}</nav><button type="button" class="tm-settings-nav ${record.taskNav === "settings" ? "is-active" : ""}" data-task-nav="settings" title="Configurações">${ic("settings")}<span>Configurações</span></button></aside><main class="tm-main"><header class="tm-head"><h2>${title}</h2><div class="tm-cmds">${commands(record)}</div></header><div class="tm-page tm-page-${record.taskNav}">${page(record)}</div>${overlay(record)}</main></section>`;
    const body = record.content.querySelector(".tm-tbody");
    if (body) body.scrollTop = scroll;
    record.content.querySelector("[data-tm-run] input[name=command]")?.focus();
    if (record.taskManagerWired) return;
    record.taskManagerWired = true;
    record.content.addEventListener("click", (event) => click(record, event));
    record.content.addEventListener("contextmenu", (event) => {
      const row = event.target.closest("[data-process-id]"), startup = event.target.closest("[data-startup-id]");
      if (!row && !startup) return;
      event.preventDefault();
      const box = record.content.getBoundingClientRect();
      if (startup) {
        record.selectedStartupId = startup.dataset.startupId;
        record.startupMenu = { x: Math.min(event.clientX - box.left, box.width - 200), y: Math.min(event.clientY - box.top, box.height - 90) };
        emit("startup:selected", { id: record.selectedStartupId, via: "context-menu" });
        render(record); return;
      }
      record.selectedProcessId = row.dataset.processId;
      record.menu = { pid: Number(row.dataset.processId), x: Math.min(event.clientX - box.left, box.width - 220), y: Math.min(event.clientY - box.top, box.height - 170) };
      emit("process:selected", { pid: record.menu.pid, appId: OSLab.processManager.getProcessByPid(record.menu.pid)?.appId, via: "context-menu" });
      render(record);
    });
    record.content.addEventListener("change", (event) => {
      const pref = event.target.closest("[data-tm-pref]")?.dataset.tmPref;
      if (!pref) return;
      prefs[pref] = pref === "grouped" ? event.target.value === "true" : event.target.value;
      savePrefs(); restartTimer(); renderAll();
    });
    record.content.addEventListener("submit", (event) => {
      if (!event.target.matches("[data-tm-run]")) return;
      event.preventDefault();
      runCommand(record, String(new FormData(event.target).get("command") || ""));
    });
    record.element.addEventListener("keydown", (event) => {
      if (event.key === "Delete" && record.selectedProcessId && !event.target.matches("input")) { event.preventDefault(); endSelected(record); }
      if (event.key === "Escape" && (record.menu || record.runOpen || record.moreOpen || record.startupMenu)) { record.menu = null; record.runOpen = false; record.moreOpen = false; record.startupMenu = null; render(record); }
    });
  }

  function endSelected(record) {
    const p = OSLab.processManager.getProcessByPid(record.selectedProcessId);
    if (!p) return;
    const result = OSLab.processManager.endProcess(p.pid, { reason: "task-manager" });
    if (!result.ok && result.reason === "protected") OSLab.ui.notify("Não é possível finalizar", `${p.name} é um processo do sistema. Finalizá-lo deixaria o Windows instável ou desligaria o computador.`, "warning", 6000);
    if (result.ok) record.selectedProcessId = null;
    render(record);
  }
  function runCommand(record, raw) {
    const command = raw.trim().toLowerCase().replace(/\.exe$/, "");
    const map = { explorer: "explorer", chrome: "google", "google chrome": "google", notepad: "texteditor", "bloco de notas": "texteditor", cmd: "terminal", powershell: "terminal", taskmgr: "taskmanager", "ms-settings:": "settings", control: "controlpanel", whatsapp: "whatsapp", discord: "discord" };
    const target = map[command];
    if (!target || (target === "discord" && !OSLab.apps.get("discord"))) { record.runError = `O Windows não pode encontrar '${raw.trim()}'. Verifique se o nome foi digitado corretamente e tente novamente.`; emit("taskmanager:run", { command, ok: false }); render(record); return; }
    record.runOpen = false; record.runError = null;
    if (target === "explorer") { if (!OSLab.processManager.isExplorerRunning()) OSLab.processManager.startExplorer("run"); else OSLab.shell.openApp("explorer"); }
    else OSLab.shell.openApp(target);
    emit("taskmanager:run", { command, ok: true, appId: target });
    render(record);
  }
  function click(record, event) {
    const t = event.target;
    const hadOverlay = record.menu || record.moreOpen || record.startupMenu;
    if (!t.closest(".tm-context")) { record.menu = null; record.moreOpen = false; record.startupMenu = null; }
    const navId = t.closest("[data-task-nav]")?.dataset.taskNav;
    if (navId) { if (!["processes", "details"].includes(navId)) record.selectedProcessId = null; record.taskNav = navId; emit("taskmanager:nav", { page: navId }); render(record); return; }
    if (t.closest("[data-task-burger]")) { record.sideCollapsed = !record.sideCollapsed; render(record); return; }
    const expand = t.closest("[data-task-expand]")?.dataset.taskExpand;
    if (expand) { const key = expand === "user" ? "user" : Number(expand); record.expanded.has(key) ? record.expanded.delete(key) : record.expanded.add(key); record.menu = null; render(record); return; }
    const group = t.closest("[data-task-group]")?.dataset.taskGroup;
    if (group) { record.collapsedGroups.has(group) ? record.collapsedGroups.delete(group) : record.collapsedGroups.add(group); render(record); return; }
    const sort = t.closest("[data-task-sort]")?.dataset.taskSort;
    if (sort) {
      if (record.taskSort === sort) record.taskSortDirection = record.taskSortDirection === "asc" ? "desc" : "asc";
      else { record.taskSort = sort; record.taskSortDirection = sort === "name" || sort === "status" ? "asc" : "desc"; }
      emit("taskmanager:sorted", { key: record.taskSort, direction: record.taskSortDirection }); render(record); return;
    }
    const dsort = t.closest("[data-details-sort]")?.dataset.detailsSort;
    if (dsort) { record.detailsDirection = record.detailsSort === dsort && record.detailsDirection === "asc" ? "desc" : "asc"; record.detailsSort = dsort; render(record); return; }
    const perf = t.closest("[data-perf-view]")?.dataset.perfView;
    if (perf) { record.perfView = perf; emit("taskmanager:perf-view", { view: perf }); render(record); return; }
    const action = t.closest("[data-task-action]")?.dataset.taskAction;
    const row = t.closest("[data-process-id]");
    if (row && !action) { record.selectedProcessId = row.dataset.processId; const p = OSLab.processManager.getProcessByPid(record.selectedProcessId); emit("process:selected", { pid: p?.pid, appId: p?.appId }); render(record); return; }
    const startupId = t.closest("[data-startup-id]")?.dataset.startupId;
    if (startupId) { record.selectedStartupId = startupId; emit("startup:selected", { id: startupId }); render(record); return; }
    const service = t.closest("[data-service]")?.dataset.service;
    if (service && !action) { record.selectedService = service; render(record); return; }
    if (t.closest("[data-tm-run-cancel]")) { record.runOpen = false; record.runError = null; render(record); return; }
    const p = record.selectedProcessId && OSLab.processManager.getProcessByPid(record.selectedProcessId);
    const s = services.find((item) => item.name === record.selectedService);
    if (action === "run") { record.runOpen = true; record.runError = null; }
    if (action === "end") { endSelected(record); return; }
    if (action === "restart" && p) { OSLab.processManager.restartProcess(p.pid); record.selectedProcessId = null; }
    if (action === "efficiency" && p && !p.protected) {
      const efficient = !p.efficient;
      OSLab.processManager.updateProcess(p.pid, efficient ? { efficient, savedCpu: p.cpu, savedFixed: p.fixed, cpu: Math.min(p.cpu, Math.max(0.2, p.cpu * 0.08)), fixed: true } : { efficient, cpu: p.savedCpu ?? p.cpu, fixed: p.savedFixed ?? false });
      emit("process:efficiency", { pid: p.pid, appId: p.appId, efficient });
      if (efficient) OSLab.ui.notify("Modo de eficiência", `${p.name} vai usar menos recursos. Ele continua funcionando, só que mais devagar.`, "info", 4200);
    }
    if (action === "goto-details" && p) { record.taskNav = "details"; emit("taskmanager:nav", { page: "details" }); }
    if (action === "more") record.moreOpen = !hadOverlay;
    if (action === "toggle-group") { prefs.grouped = !prefs.grouped; savePrefs(); }
    if (action === "expand-all") { record.collapsedGroups.clear(); OSLab.processManager.getProcesses().filter((x) => x.groupCount > 1).forEach((x) => record.expanded.add(x.pid)); }
    if (action === "collapse-all") record.expanded.clear();
    if (action === "startup-on" || action === "startup-off") {
      const result = OSLab.processManager.setStartupEnabled(record.selectedStartupId, action === "startup-on");
      if (!result.ok && result.reason === "protected") OSLab.ui.notify("Mantenha habilitado", "A Segurança do Windows protege o computador e deve continuar iniciando com o Windows.", "warning", 5200);
    }
    if (s && action === "svc-start") s.running = true;
    if (s && action === "svc-stop") s.running = false;
    if (s && action === "svc-restart") OSLab.ui.notify("Serviço reiniciado", `${s.description} foi reiniciado.`, "info", 3200);
    if (action && action !== "more") { record.menu = null; record.startupMenu = null; }
    if (action || hadOverlay) render(record);
  }

  function setQuery(record, query) { record.taskQuery = query; emit("taskmanager:search", { query }); render(record); }
  function renderAll() { records.forEach((record) => (record.element?.isConnected ? render(record) : records.delete(record))); }

  // atualização em tempo real, só enquanto o Gerenciador está aberto (poupa o Chromebook)
  let timer = null;
  function sample() {
    records.forEach((record) => { if (!record.element?.isConnected) records.delete(record); });
    if (!records.size) { global.clearInterval(timer); timer = null; return; }
    OSLab.processManager.tick();
    const u = usage(), push = (key, value) => { history[key].push(value); if (history[key].length > 60) history[key].shift(); };
    push("cpu", u.cpu); push("memory", u.memory); push("disk", u.disk); push("wifi", Math.min(100, u.net * 4));
  }
  function restartTimer() {
    if (timer) global.clearInterval(timer);
    timer = null;
    if (prefs.speed === "paused" || !records.size) return;
    timer = global.setInterval(sample, prefs.speed === "high" ? 500 : prefs.speed === "low" ? 4000 : 1000);
  }
  // não redesenha enquanto o aluno usa um menu, a janela Executar ou um seletor
  const busy = () => [...records].some((r) => r.menu || r.runOpen || r.moreOpen || r.startupMenu || r.content.contains(document.activeElement) && document.activeElement.matches("select, input"));
  OSLab.processManager.subscribe((_, change) => { if (change?.type !== "tick" || !busy()) renderAll(); });
  OSLab.events.subscribe("app:opened", ({ detail }) => { if (detail?.appId === "taskmanager") { if (!timer) restartTimer(); sample(); } });
  OSLab.taskManagerApp = { render, setQuery, renderAll, getPrefs: () => ({ ...prefs }) };
})(window);
