(function createInstallMissionEngine(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let progress = OSLab.installMissionStorage.load();
  let handling = false;

  function clone(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }
  function definition(id) { return OSLab.installMissionCatalog.find((mission) => mission.id === id) || null; }
  function persist(reason, detail = {}) {
    OSLab.installMissionStorage.save(progress);
    const current = clone(progress);
    listeners.forEach((listener) => listener(current, reason, clone(detail)));
    OSLab.events.emit("install-lab:updated", { reason, progress: current, ...detail }, "installMissionEngine");
    OSLab.assistantRobot?.render?.();
    return current;
  }
  function firstIncompleteOrder() {
    return OSLab.installMissionCatalog.find((mission) => !progress.completed[mission.id])?.order || OSLab.installMissionCatalog.length + 1;
  }
  function status(mission) {
    if (progress.active?.id === mission.id) return progress.active.phase === "completed" ? "completed" : "active";
    if (mission.order > firstIncompleteOrder()) return "locked";
    return progress.completed[mission.id] ? "completed" : "available";
  }
  function blankChecklist(mission) { return Object.fromEntries(mission.objectives.map((objective) => [objective.id, false])); }
  function completed(checklist) { return Object.values(checklist).length > 0 && Object.values(checklist).every(Boolean); }

  function complete(mission) {
    if (!progress.active || progress.active.phase === "completed") return progress.active?.result || null;
    const result = {
      missionId: mission.id,
      title: mission.title,
      explanation: mission.success,
      hintUsed: Boolean(progress.active.hintRevealed),
      completedAt: new Date().toISOString(),
    };
    progress.completed[mission.id] = result;
    progress.active.phase = "completed";
    progress.active.result = result;
    persist("completed", { missionId: mission.id, result });
    OSLab.events.emit("install-lab:completed", { missionId: mission.id, result }, "installMissionEngine");
    OSLab.ui?.notify?.(mission.order === 12 ? "Trilha concluída!" : `Missão ${mission.order} concluída`, mission.success, "success", mission.order === 12 ? 8000 : 4800);
    return result;
  }

  function setDone(id) {
    if (progress.active && id in progress.active.checklist) progress.active.checklist[id] = true;
  }

  function evaluate(event) {
    if (handling || !progress.active || progress.active.phase === "completed" || event.type.startsWith("install-lab:")) return;
    const mission = definition(progress.active.id);
    if (!mission) return;
    handling = true;
    try {
      const detail = event.detail || {};
      const facts = progress.active.facts = progress.active.facts || {};
      if (mission.id === "install-browser" && event.type === "app:opened" && detail.appId === "google") setDone("browser-opened");
      if (mission.id === "install-search-appjavafx" && event.type === "install:search" && detail.term === "appjavafx") setDone("search-appjavafx");
      if (mission.id === "install-open-site" && event.type === "install:site-visited" && detail.siteId === "appjavafx") setDone("site-appjavafx");
      if (mission.id === "install-find-download" && event.type === "install:download-started" && detail.installerId === "appjavafx") setDone("download-started");
      if (mission.id === "install-wait-download" && event.type === "install:download-completed" && detail.installerId === "appjavafx") setDone("download-completed");
      if (mission.id === "install-run-installer" && event.type === "install:installer-opened" && detail.installerId === "appjavafx") setDone("installer-opened");
      if (mission.id === "install-appjavafx") {
        if (event.type === "install:option-changed" && detail.installerId === "appjavafx" && detail.desktopShortcut) setDone("shortcut-selected");
        if (event.type === "install:completed" && detail.installerId === "appjavafx") {
          if (detail.desktopShortcut) setDone("shortcut-selected");
          if (OSLab.software.isInstalled("appjavafx")) setDone("app-installed");
        }
      }
      if (mission.id === "install-open-app" && event.type === "install:program-opened" && detail.programId === "appjavafx") setDone("app-opened");
      if (mission.id === "install-find-office") {
        if (event.type === "install:search" && detail.term === "pacote office") { facts.officeSearch = true; setDone("search-office"); }
        if (event.type === "install:site-visited" && detail.siteId === "office") {
          if (facts.officeSearch) setDone("search-office");
          setDone("site-office");
        }
      }
      if (mission.id === "install-office") {
        if (event.type === "install:download-started" && detail.installerId === "office") setDone("office-download");
        if (event.type === "install:download-completed" && detail.installerId === "office") setDone("office-completed");
        if (event.type === "install:installer-opened" && detail.installerId === "office") setDone("office-installer");
        if (event.type === "install:completed" && detail.installerId === "office" && ["word", "excel", "slides"].every((id) => OSLab.software.isInstalled(id))) setDone("office-installed");
      }
      if (mission.id === "install-test-office" && event.type === "install:program-opened") {
        if (detail.programId === "word") setDone("word-opened");
        if (detail.programId === "excel") setDone("excel-opened");
        if (detail.programId === "slides") setDone("slides-opened");
      }
      if (mission.id === "install-uninstall") {
        if (event.type === "control-panel:programs-opened") setDone("control-panel");
        if (event.type === "control-panel:program-selected" && detail.programId === "appjavafx") setDone("selected");
        if (event.type === "install:uninstalled" && detail.programId === "appjavafx") {
          const app = OSLab.software.getProgram("appjavafx");
          if (!app.installed && !app.desktopShortcut && !app.startMenuShortcut) setDone("uninstalled");
        }
      }
      persist("evaluated", { missionId: mission.id, eventType: event.type });
      if (completed(progress.active.checklist)) complete(mission);
    } finally { handling = false; }
  }

  function start(id) {
    const mission = definition(id);
    const item = getMissions().find((entry) => entry.id === id);
    if (!mission) return { ok: false, reason: "missing" };
    if (!item || item.status === "locked") return { ok: false, reason: "locked" };
    OSLab.activityCoordinator?.claim?.("install-lab");
    progress.lastMissionId = id;
    progress.active = {
      id,
      phase: "active",
      checklist: blankChecklist(mission),
      facts: {},
      hintRevealed: false,
      startedAt: new Date().toISOString(),
    };
    persist("started", { missionId: id });
    return { ok: true, active: clone(progress.active) };
  }

  function useHint() {
    if (!progress.active || progress.active.phase === "completed") return null;
    const mission = definition(progress.active.id);
    if (!mission?.hint) return null;
    if (!progress.active.hintRevealed) {
      progress.active.hintRevealed = true;
      persist("hint", { missionId: mission.id, visualTarget: mission.hint.visualTarget });
      OSLab.events.emit("install-lab:hint", { missionId: mission.id, visualTarget: mission.hint.visualTarget }, "installMissionEngine");
    }
    return clone(mission.hint);
  }

  function finish(action = "return") {
    if (!progress.active) return { ok: false };
    const current = definition(progress.active.id);
    if (action === "next" && progress.active.phase !== "completed") return { ok: false, reason: "not-completed" };
    const id = current.id;
    progress.active = null;
    OSLab.activityCoordinator?.release?.("install-lab");
    persist("finished", { missionId: id });
    if (action === "repeat") return start(id);
    if (action === "next") {
      const next = OSLab.installMissionCatalog.find((mission) => mission.order === current.order + 1);
      if (next) return start(next.id);
    }
    OSLab.shell?.openApp?.("installlab");
    return { ok: true };
  }

  function stop(options = {}) {
    if (!progress.active) return { ok: false };
    const id = progress.active.id;
    progress.active = null;
    OSLab.activityCoordinator?.release?.("install-lab");
    persist(options.reason || "exited", { missionId: id });
    if (!options.silent) OSLab.shell?.openApp?.("installlab");
    return { ok: true };
  }

  function getMissions() { return OSLab.installMissionCatalog.map((mission) => ({ ...mission, status: status(mission) })); }
  function resetAll() {
    progress = OSLab.installMissionStorage.reset();
    OSLab.software.reset();
    persist("reset");
    return clone(progress);
  }

  OSLab.events.subscribe("oslab:event", evaluate);
  OSLab.installLab = {
    start,
    restart() { return progress.active ? start(progress.active.id) : { ok: false }; },
    exit: stop,
    finish,
    useHint,
    getHint() { return progress.active?.hintRevealed ? clone(definition(progress.active.id)?.hint) : null; },
    getActiveVisualTarget() { return progress.active?.hintRevealed ? definition(progress.active.id)?.hint?.visualTarget || null : null; },
    getProgress: () => clone(progress),
    getMissions,
    resetAll,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  OSLab.activityCoordinator?.register?.("install-lab", { isActive: () => Boolean(progress.active), stop });
})(window);
