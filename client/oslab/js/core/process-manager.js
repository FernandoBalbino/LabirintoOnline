(function createProcessManager(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let sequence = 6500;
  const TOTAL_MEMORY_MB = 4096;
  const STARTUP_KEY = "oslab.startup.v1";
  const SVC = "assets/icons/settings.png", WIN = "assets/drivers/devmgr/computer-16.png", CON = "assets/icons/terminal.png";

  // kind: app (tem janela) · background (segundo plano) · windows (processos do Windows), como no Gerenciador do Windows 11
  const baseline = [
    { pid: 3184, appId: "explorer-system", name: "Windows Explorer", exe: "explorer.exe", icon: "assets/icons/explorer.png", cpu: 0.4, memory: 118.6, kind: "windows", restartable: true },
    { pid: 1268, appId: "antimalware", name: "Antimalware Service Executable", exe: "MsMpEng.exe", icon: "assets/icons/settings-rows/lock.png", cpu: 0.2, memory: 182.4, kind: "background", protected: true },
    { pid: 4916, appId: "search-system", name: "Pesquisa", exe: "SearchHost.exe", icon: "assets/icons/taskmanager/fluent/search.svg", cpu: 0, memory: 64.1, kind: "background", protected: true, groupCount: 2 },
    { pid: 5208, appId: "start-system", name: "Iniciar", exe: "StartMenuExperienceHost.exe", icon: "assets/icons/start.png", cpu: 0, memory: 41.9, kind: "background", protected: true },
    { pid: 6012, appId: "widgets", name: "Windows Widgets", exe: "Widgets.exe", icon: "assets/settings/Apps.webp", cpu: 0, memory: 28.6, kind: "background" },
    { pid: 5640, appId: "runtime-broker", name: "Runtime Broker", exe: "RuntimeBroker.exe", icon: SVC, cpu: 0, memory: 9.8, kind: "background", protected: true },
    { pid: 3340, appId: "spooler-app", name: "Spooler SubSystem App", exe: "spoolsv.exe", icon: "assets/drivers/devmgr/printer-16.png", cpu: 0, memory: 6.2, kind: "background", protected: true },
    { pid: 2788, appId: "wmi", name: "WMI Provider Host", exe: "WmiPrvSE.exe", icon: SVC, cpu: 0.1, memory: 15.8, kind: "background", protected: true },
    { pid: 7104, appId: "conhost", name: "Host da Janela do Console", exe: "conhost.exe", icon: CON, cpu: 0, memory: 7.3, kind: "background", protected: true },
    { pid: 4, appId: "system", name: "Sistema", exe: "System", icon: WIN, cpu: 0.3, memory: 0.1, kind: "windows", protected: true },
    { pid: 136, appId: "secure-system", name: "Secure System", exe: "Secure System", icon: WIN, cpu: 0, memory: 42.6, kind: "windows", protected: true },
    { pid: 1540, appId: "dwm", name: "Gerenciador de Janelas da Área de Trabalho", exe: "dwm.exe", icon: "assets/drivers/devmgr/display-16.png", cpu: 0.6, memory: 96.8, kind: "windows", protected: true },
    { pid: 2440, appId: "sihost", name: "Host de Experiência do Windows", exe: "sihost.exe", icon: SVC, cpu: 0, memory: 22.3, kind: "windows", protected: true },
    { pid: 896, appId: "services", name: "Host de Serviço: Sistema Local", exe: "svchost.exe", icon: SVC, cpu: 0.1, memory: 54.4, kind: "windows", protected: true, groupCount: 12 },
    { pid: 1012, appId: "svc-network", name: "Host de Serviço: Serviço de Rede", exe: "svchost.exe", icon: SVC, cpu: 0, memory: 18.7, kind: "windows", protected: true, groupCount: 4 },
    { pid: 728, appId: "winlogon", name: "Aplicativo de Logon do Windows", exe: "winlogon.exe", icon: WIN, cpu: 0, memory: 3.9, kind: "windows", protected: true },
    { pid: 652, appId: "csrss", name: "Processo de Tempo de Execução Cliente-Servidor", exe: "csrss.exe", icon: WIN, cpu: 0, memory: 1.4, kind: "windows", protected: true },
    { pid: 612, appId: "lsass", name: "Local Security Authority Process", exe: "lsass.exe", icon: WIN, cpu: 0, memory: 9.1, kind: "windows", protected: true },
    { pid: 140, appId: "memory-compression", name: "Compactação de Memória", exe: "Memory Compression", icon: WIN, cpu: 0, memory: 320.5, kind: "windows", protected: true },
  ].map((item) => ({ disk: 0, network: 0, ...item, id: `process-${item.pid}`, windowId: null, status: "Em execução", efficient: false, startedAt: Date.now(), missionId: null }));

  let processes = baseline.map((item) => ({ ...item }));
  let explorerRunning = true;
  const defaultStartup = [
    { id: "windows-security", name: "Segurança do Windows", publisher: "Microsoft Corporation", icon: "assets/icons/settings-rows/lock.png", impact: "Baixo", enabled: true, protected: true, seconds: 2 },
    { id: "discord", name: "Discord", publisher: "Discord Inc.", icon: "assets/digital/brands/discord.svg", impact: "Alto", enabled: false, protected: false, seconds: 9, launch: "discord" },
    { id: "spotify", name: "Spotify", publisher: "Spotify AB", icon: "assets/digital/brands/spotify.png", impact: "Alto", enabled: false, protected: false, seconds: 7 },
    { id: "cloud-sync", name: "Sincronizador em Nuvem", publisher: "OSLab Nuvem", icon: "assets/icons/settings-rows/nearshare.png", impact: "Alto", enabled: false, protected: false, seconds: 8 },
    { id: "game-launcher", name: "Inicializador de Jogos", publisher: "Jogos Turbo Ltda.", icon: "assets/settings/Gaming.webp", impact: "Alto", enabled: false, protected: false, seconds: 9 },
    { id: "media-helper", name: "Assistente de Mídia", publisher: "Mídia Plus", icon: "assets/icons/settings-rows/video.png", impact: "Médio", enabled: false, protected: false, seconds: 5 },
    { id: "meeting-app", name: "Aplicativo de Reuniões", publisher: "Reuniões On-line S.A.", icon: "assets/settings/Apps.webp", impact: "Alto", enabled: false, protected: false, seconds: 7 },
  ];
  // só o liga/desliga é do aluno; o resto vem do código (assim novos itens aparecem sem apagar o que ele escolheu)
  function loadStartup() {
    let saved = {};
    try { saved = JSON.parse(global.localStorage?.getItem(STARTUP_KEY) || "{}") || {}; } catch (_) { saved = {}; }
    return defaultStartup.map((app) => ({ ...app, enabled: app.protected ? true : typeof saved[app.id] === "boolean" ? saved[app.id] : app.enabled }));
  }
  function saveStartup() {
    try { global.localStorage?.setItem(STARTUP_KEY, JSON.stringify(Object.fromEntries(startupApps.map((app) => [app.id, app.enabled])))); } catch (_) { /* sem armazenamento */ }
  }
  let startupApps = loadStartup();

  function notify(change) {
    const snapshot = getProcesses();
    listeners.forEach((listener) => listener(snapshot, change));
  }

  function nextPid() {
    sequence += Math.floor(Math.random() * 41) + 3;
    while (processes.some((process) => process.pid === sequence)) sequence += 1;
    return sequence;
  }

  function normalize(input) {
    const pid = Number(input.pid) || nextPid();
    return {
      id: input.id || `process-${pid}`,
      pid,
      appId: input.appId || `app-${pid}`,
      windowId: input.windowId || null,
      name: input.name || "Aplicativo",
      exe: input.exe || `${String(input.appId || "app").replace(/[^a-z0-9]/gi, "")}.exe`,
      icon: input.icon || OSLab.icons?.get?.("process") || "assets/icons/taskmanager.png",
      kind: input.kind || (input.windowId ? "app" : "background"),
      status: input.status || "Em execução",
      cpu: Number(input.cpu) || 0,
      memory: Number(input.memory) || 24,
      disk: Number(input.disk) || 0,
      network: Number(input.network) || 0,
      startedAt: input.startedAt || Date.now(),
      missionId: input.missionId || null,
      protected: Boolean(input.protected),
      restartable: Boolean(input.restartable),
      efficient: Boolean(input.efficient),
      fixed: Boolean(input.fixed),
      groupCount: Number(input.groupCount) || 0,
      publisher: input.publisher || "",
    };
  }

  function createProcess(input) {
    const existing = input.windowId && processes.find((process) => process.windowId === input.windowId);
    if (existing) return existing;
    const process = normalize(input);
    processes.push(process);
    notify({ type: "created", process: { ...process } });
    OSLab.events.emit("process:created", { process: { ...process }, pid: process.pid, appId: process.appId }, "processManager");
    return process;
  }

  function getProcesses() {
    return processes.map((process) => ({ ...process }));
  }

  function getProcessByPid(pid) {
    return processes.find((process) => process.pid === Number(pid)) || null;
  }

  function getUsage() {
    const cpuPercent = Math.min(100, processes.reduce((sum, process) => sum + Number(process.cpu || 0), 0));
    const memoryUsedMb = Math.min(TOTAL_MEMORY_MB, processes.reduce((sum, process) => sum + Number(process.memory || 0), 0));
    return { cpuPercent, memoryUsedMb, memoryFreeMb: Math.max(0, TOTAL_MEMORY_MB - memoryUsedMb), memoryPercent: memoryUsedMb / TOTAL_MEMORY_MB * 100, totalMemoryMb: TOTAL_MEMORY_MB };
  }

  function updateProcess(pid, patch) {
    const process = getProcessByPid(pid);
    if (!process) return null;
    Object.assign(process, patch, { pid: process.pid, id: process.id });
    notify({ type: "updated", process: { ...process } });
    OSLab.events.emit("process:updated", { process: { ...process }, pid: process.pid }, "processManager");
    return process;
  }

  function setExplorer(running, reason) {
    explorerRunning = running;
    global.document?.documentElement?.classList.toggle("is-explorer-stopped", !running);
    OSLab.events.emit(running ? "explorer:started" : "explorer:stopped", { reason }, "processManager");
  }

  function endProcess(pid, options = {}) {
    const process = getProcessByPid(pid);
    if (!process) return { ok: false, reason: "missing" };
    if (process.protected && !options.force) {
      OSLab.events.emit("process:blocked", { process: { ...process }, pid: process.pid }, "processManager");
      return { ok: false, reason: "protected", process };
    }
    if (process.windowId && OSLab.windowManager?.forceCloseById) {
      OSLab.windowManager.forceCloseById(process.windowId, { fromProcessManager: true });
    }
    processes = processes.filter((item) => item.pid !== process.pid);
    if (process.appId === "explorer-system") setExplorer(false, options.reason || "task-manager");
    notify({ type: "ended", process: { ...process } });
    OSLab.events.emit("process:ended", { process: { ...process }, pid: process.pid, appId: process.appId, missionId: process.missionId, status: process.status, reason: options.reason || "task-manager" }, "processManager");
    return { ok: true, process };
  }

  /** Windows Explorer: "Reiniciar" ou Executar nova tarefa › explorer.exe. A barra de tarefas some e volta. */
  function startExplorer(reason = "run") {
    if (processes.some((process) => process.appId === "explorer-system")) return { ok: false, reason: "running" };
    const fresh = { ...baseline.find((item) => item.appId === "explorer-system"), pid: nextPid(), startedAt: Date.now() };
    fresh.id = `process-${fresh.pid}`;
    processes.push(fresh);
    setExplorer(true, reason);
    notify({ type: "created", process: { ...fresh } });
    OSLab.events.emit("process:restarted", { appId: "explorer-system", pid: fresh.pid, reason }, "processManager");
    return { ok: true, process: { ...fresh } };
  }
  function restartProcess(pid) {
    const process = getProcessByPid(pid);
    if (!process?.restartable) return { ok: false, reason: "not-restartable" };
    endProcess(pid, { reason: "restart" });
    global.setTimeout(() => startExplorer("restart"), 900);
    return { ok: true };
  }

  OSLab.processManager = {
    TOTAL_MEMORY_MB,
    createProcess,
    getProcesses,
    getProcessByPid,
    getUsage,
    updateProcess,
    endProcess,
    restartProcess,
    startExplorer,
    isExplorerRunning: () => explorerRunning,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    ensureAppProcess(app) {
      const existing = processes.find((process) => process.windowId === app.windowId || (!app.windowId && process.appId === app.appId && !process.protected));
      return existing || createProcess(app);
    },
    endByWindow(windowId, options = {}) {
      const process = processes.find((item) => item.windowId === windowId);
      if (!process) return null;
      processes = processes.filter((item) => item.pid !== process.pid);
      notify({ type: "ended", process: { ...process } });
      if (!options.silent) OSLab.events.emit("process:ended", { process: { ...process }, pid: process.pid, appId: process.appId, reason: options.reason || "window-closed" }, "processManager");
      return process;
    },
    resetMissionProcesses(missionId) {
      const removed = processes.filter((process) => process.missionId === missionId);
      processes = processes.filter((process) => process.missionId !== missionId);
      removed.forEach((process) => {
        if (process.windowId) OSLab.windowManager?.forceCloseById?.(process.windowId, { fromProcessManager: true });
      });
      notify({ type: "mission-reset", missionId });
      return removed;
    },
    /** variação pequena a cada segundo, como o Gerenciador real; processos fixos (missões) não oscilam */
    tick() {
      processes.forEach((process) => {
        if (process.fixed || process.status !== "Em execução") return;
        const base = process.baseCpu ??= process.cpu;
        process.cpu = Math.max(0, Math.round((base + (Math.random() - 0.55) * (base > 2 ? 3 : 0.6)) * 10) / 10);
      });
      notify({ type: "tick" });
    },
    getStartupApps() { return startupApps.map((app) => ({ ...app })); },
    setStartupEnabled(id, enabled) {
      const app = startupApps.find((entry) => entry.id === id);
      if (!app) return { ok: false, reason: "missing" };
      if (app.protected && !enabled) return { ok: false, reason: "protected", app: { ...app } };
      app.enabled = Boolean(enabled);
      saveStartup();
      notify({ type: "startup", app: { ...app } });
      OSLab.events.emit("startup:changed", { app: { ...app }, id, enabled: app.enabled }, "processManager");
      return { ok: true, app: { ...app } };
    },
    estimateBootTime() { return 7 + startupApps.filter((app) => app.enabled).reduce((sum, app) => sum + app.seconds, 0); },
    snapshot() { return { processes: getProcesses(), startupApps: startupApps.map((app) => ({ ...app })), sequence }; },
    restoreSnapshot(input) {
      if (!input) return;
      processes = Array.isArray(input.processes) ? input.processes.map((process) => ({ ...process })) : baseline.map((item) => ({ ...item }));
      startupApps = Array.isArray(input.startupApps) ? input.startupApps.map((app) => ({ ...app })) : startupApps;
      sequence = Number(input.sequence) || sequence;
      saveStartup();
      if (!processes.some((process) => process.appId === "explorer-system")) startExplorer("snapshot");
      notify({ type: "snapshot-restored" });
    },
    reset() { processes = baseline.map((item) => ({ ...item, startedAt: Date.now() })); if (!explorerRunning) setExplorer(true, "reset"); notify({ type: "reset" }); },
  };
})(window);
