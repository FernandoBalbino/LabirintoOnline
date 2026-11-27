// Labirinto da Informática — ponte entre o desafio do jogo e o Windows do OSLab.
// Cada tarefa prepara o cenário com as APIs reais do OSLab e verifica o estado real do sistema.
(function createLabirintoBridge(global) {
  "use strict";
  if (!global.OSLAB_EMBED) return;
  const OSLab = global.OSLab;
  const fs = OSLab.fileSystem;
  const R = fs.roots;
  const shell = OSLab.shell;
  const norm = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("pt-BR");
  const make = (input) => fs.create({ ...input, createdByMission: true, missionId: "labirinto" });
  const alive = (item) => item && !item.trashedAt;
  const file = (parentId, name, mime = "application/octet-stream", extra = {}) => make({ parentId, kind: "file", name, mime, ...extra });
  const folder = (parentId, name) => fs.find(parentId, name, "folder") || make({ parentId, kind: "folder", name });
  const windowOf = (appId) => shell.snapshotSystem().openWindows.find((w) => w.appId === appId);

  const TASKS = {
    "folder-documents": { check: () => alive(fs.find(R.documents, "Trabalhos", "folder")) },
    "folder-desktop": { check: () => alive(fs.find(R.desktop, "Fotos da Turma", "folder")) },
    "rename-desktop": {
      setup: (ctx) => { ctx.id = file(R.desktop, "documento1.txt", "text/plain").id; },
      check: (ctx) => { const item = fs.get(ctx.id); return alive(item) && item.parentId === R.desktop && norm(item.name) === "atividade.txt"; },
    },
    "rename-documents": {
      setup: (ctx) => { ctx.id = file(R.documents, "novo arquivo.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document").id; },
      check: (ctx) => { const item = fs.get(ctx.id); return alive(item) && item.parentId === R.documents && norm(item.name) === "pesquisa.docx"; },
    },
    "move-picture": {
      setup: (ctx) => { ctx.id = file(R.desktop, "foto-passeio.jpg", "image/jpeg").id; },
      check: (ctx) => { const item = fs.get(ctx.id); return alive(item) && item.parentId === R.pictures; },
    },
    "copy-backup": {
      setup: (ctx) => { ctx.id = file(R.documents, "trabalho-final.pdf", "application/pdf", { content: "OSLab PDF" }).id; ctx.backup = folder(R.documents, "Backup").id; },
      check: (ctx) => {
        const original = fs.get(ctx.id);
        const copy = fs.list(ctx.backup).find((item) => alive(item) && norm(item.name) === "trabalho-final.pdf");
        return alive(original) && original.parentId === R.documents && Boolean(copy);
      },
    },
    "delete-file": {
      setup: (ctx) => { ctx.id = file(R.desktop, "jogo-gratis.exe", "application/x-msdownload").id; },
      check: (ctx) => Boolean(fs.get(ctx.id)?.trashedAt) || !fs.get(ctx.id),
    },
    "restore-file": {
      setup: (ctx) => { ctx.id = file(R.documents, "redacao.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document").id; fs.delete(ctx.id); },
      check: (ctx) => { const item = fs.get(ctx.id); return alive(item) && item.parentId === R.documents; },
    },
    "empty-recycle": {
      setup: () => { for (const name of ["rascunho-velho.txt", "foto-borrada.jpg", "download-antigo.zip"]) fs.delete(file(R.desktop, name).id); },
      check: () => fs.recycleItems().length === 0,
    },
    "write-text": {
      setup: (ctx) => { ctx.id = file(R.desktop, "lista.txt", "text/plain", { content: "" }).id; },
      check: (ctx) => norm(fs.get(ctx.id)?.content).includes("teclado"),
    },
    wallpaper: { setup: () => shell.setWallpaper("2", false), check: () => shell.getWallpaper() === "6" },
    "dark-mode": { setup: () => OSLab.embed.setTheme("light"), check: () => OSLab.embed.getTheme() === "dark" },
    "volume-20": { setup: () => shell.setVolume(100, false, false), check: () => { const a = shell.getAudioState(); return a.volume >= 18 && a.volume <= 22 && !a.muted; } },
    unmute: { setup: () => shell.setVolume(60, true, false), check: () => { const a = shell.getAudioState(); return !a.muted && a.volume > 0; } },
    "end-frozen": {
      setup: (ctx) => {
        const record = shell.openTextEditor({ missionId: "labirinto", title: "Editor de Texto", frozen: true });
        ctx.pid = record?.pid;
        ctx.windowId = record?.windowId || "texteditor";
      },
      onEvent: (event, ctx) => { if (event.type === "process:ended" && event.detail.pid === ctx.pid && event.detail.reason === "task-manager") ctx.ended = true; },
      check: (ctx) => Boolean(ctx.ended) && !shell.isWindowOpen(ctx.windowId),
    },
    "wifi-on": { setup: () => OSLab.network.setWifi(false), check: () => OSLab.network.getSnapshot().wifiEnabled === true },
    "airplane-off": { setup: () => OSLab.network.setAirplaneMode(true), check: () => OSLab.network.getSnapshot().airplaneMode === false },
    "minimize-restore": {
      setup: (ctx) => { const record = shell.openFolder(R.documents); ctx.windowId = record?.windowId || "explorer"; },
      onEvent: (event, ctx) => {
        if (event.detail?.windowId !== ctx.windowId) return;
        if (event.type === "window:minimized") ctx.minimized = true;
        if (event.type === "window:restored" && ctx.minimized) ctx.restored = true;
      },
      check: (ctx) => Boolean(ctx.restored),
    },
    "search-file": {
      setup: (ctx) => {
        const school = folder(R.documents, "Escola");
        const deep = folder(school.id, "Informática");
        file(R.documents, "anotacoes.txt", "text/plain");
        ctx.id = file(deep.id, "relatorio-final.pdf", "application/pdf").id;
      },
      onEvent: (event, ctx) => {
        if (event.type === "file:searched" && event.detail.resultIds?.includes(ctx.id)) ctx.searched = true;
        if (event.type === "file:selected" && event.detail.fileId === ctx.id && ctx.searched) ctx.selected = true;
      },
      check: (ctx) => Boolean(ctx.selected),
    },
    "taskmgr-ram": { gate: "taskmanager" },
    "taskmgr-cores": { gate: "taskmanager" },
    "taskmgr-cpu": { gate: "taskmanager" },
    "taskmgr-disk": { gate: "taskmanager" },
    "terminal-ip": { gate: "ipconfig" },
  };

  const listeners = new Set();
  let current = null;
  let last = "";

  function status() {
    if (!current) return { done: false, gate: false };
    const task = current.task;
    let gate = false;
    if (task.gate === "taskmanager") gate = current.ctx.sawTaskManager || shell.isWindowOpen("taskmanager");
    if (task.gate === "ipconfig") gate = Boolean(windowOf("terminal")?.terminalLines?.some((line) => norm(line.command).startsWith("ipconfig")) || current.ctx.sawIpconfig);
    gate = Boolean(gate);
    if (gate && task.gate === "taskmanager") current.ctx.sawTaskManager = true;
    if (gate && task.gate === "ipconfig") current.ctx.sawIpconfig = true;
    let done = false;
    try { done = task.check ? Boolean(task.check(current.ctx)) : false; } catch { done = false; }
    return { done, gate, task: current.id };
  }

  function publish() {
    const value = status();
    const key = JSON.stringify(value);
    if (key === last) return;
    last = key;
    listeners.forEach((listener) => { try { listener(value); } catch { /* janela do jogo fechada */ } });
  }

  OSLab.events.subscribe("oslab:event", (event) => {
    if (!current) return;
    if (event.type === "app:opened" && event.detail.appId === "taskmanager") current.ctx.sawTaskManager = true;
    try { current.task.onEvent?.(event, current.ctx); } catch { /* ignora */ }
    setTimeout(publish, 30);
  });

  const ready = (OSLab.embed?.ready || Promise.reject(new Error("modo embutido indisponível"))).then(() => new Promise((resolve) => setTimeout(resolve, 1400)));

  global.LabirintoBridge = {
    ready,
    tasks: Object.keys(TASKS),
    start(id) {
      const task = TASKS[id];
      if (!task) throw new Error(`Tarefa desconhecida: ${id}`);
      shell.closeFlyouts?.();
      for (const w of shell.snapshotSystem().openWindows) shell.closeApp(w.appId);
      current = { id, task, ctx: {} };
      last = "";
      task.setup?.(current.ctx);
      shell.refreshDesktop?.();
      clearInterval(this.timer);
      this.timer = setInterval(publish, 400);
      publish();
      return true;
    },
    status,
    subscribe(listener) { listeners.add(listener); listener(status()); return () => listeners.delete(listener); },
  };
})(window);
