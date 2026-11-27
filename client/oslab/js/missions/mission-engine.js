(function createMissionEngine(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let progress = OSLab.missionStorage.load();
  let handlingEvent = false;

  function catalog() { return OSLab.missionCatalog || []; }
  function missionById(id) { return catalog().find((mission) => mission.id === id) || null; }
  function clone(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }
  function snapshot() { return JSON.parse(JSON.stringify(progress)); }
  function notify(reason, detail = {}) {
    OSLab.missionStorage.save(progress);
    const current = snapshot();
    listeners.forEach((listener) => listener(current, reason, detail));
    OSLab.events.emit("mission:updated", { reason, progress: current, ...detail }, "missionEngine");
  }

  function activeContext(mission) {
    const active = progress.active;
    return {
      id: mission.id,
      shell: OSLab.shell,
      scenario: active.scenario || (active.scenario = {}),
      fact(key, value) { if (arguments.length > 1) active.facts[key] = value; return Boolean(active.facts[key]); },
      mistake() { active.mistakes += 1; },
      completed() { return Object.entries(active.checklist).filter(([, done]) => done).map(([id]) => id); },
    };
  }

  function statuses() {
    const ordered = catalog().slice().sort((a, b) => a.order - b.order);
    const firstIncomplete = ordered.find((mission) => !progress.completed[mission.id]);
    const boundaryOrder = firstIncomplete?.order ?? Number.POSITIVE_INFINITY;
    return ordered.map((mission) => {
      let status = "locked";
      if (progress.active?.id === mission.id) status = "active";
      else if (mission.order > boundaryOrder) status = "locked";
      else if (progress.completed[mission.id]) status = "completed";
      else if (mission.order === boundaryOrder) status = "available";
      return { ...mission, status };
    });
  }

  function makeActive(mission) {
    return {
      id: mission.id,
      checklist: Object.fromEntries(mission.objectives.map((objective) => [objective.id, false])),
      facts: {}, hintsUsed: 0, hintRevealed: false, mistakes: 0, hintIndex: 0, scenario: {},
      snapshot: { wallpaperId: OSLab.shell?.getWallpaper?.() || "1", audio: OSLab.shell?.getAudioState?.() || { volume: 100, muted: false } },
      startedAt: new Date().toISOString(),
    };
  }

  function cleanup(missionId, restoreSettings = true) {
    const active = progress.active;
    const mission = missionById(missionId);
    try { mission?.cleanup?.(activeContext(mission)); }
    catch (error) { OSLab.diagnostics.push({ type: "mission:cleanup", missionId, message: error.message }); }
    OSLab.fileSystem.removeMissionItems(missionId);
    OSLab.processManager.resetMissionProcesses(missionId);
    OSLab.shell?.closeMissionWindows?.(missionId);
    if (restoreSettings && active?.snapshot) {
      OSLab.shell?.setWallpaper?.(active.snapshot.wallpaperId, false);
      OSLab.shell?.setVolume?.(active.snapshot.audio.volume, active.snapshot.audio.muted, false);
    }
    OSLab.shell?.refreshDesktop?.();
  }

  function start(id) {
    const mission = missionById(id);
    const available = statuses().find((entry) => entry.id === id);
    if (!mission || !available || available.status === "locked") return { ok: false, reason: "locked" };
    OSLab.activityCoordinator?.claim?.("mission");
    if (progress.active && progress.active.id !== id) abandon();
    if (progress.active?.id === id) return { ok: true, active: snapshot().active };
    // Repetir uma missão deve sempre começar em um cenário limpo, sem tocar
    // nos arquivos normais do aluno.
    OSLab.fileSystem.removeMissionItems(id);
    OSLab.processManager.resetMissionProcesses(id);
    OSLab.shell?.closeMissionWindows?.(id);
    progress.active = makeActive(mission);
    notify("started", { missionId: id });
    try {
      const scenario = mission.setup?.(activeContext(mission)) || {};
      progress.active.scenario = { ...progress.active.scenario, ...scenario };
      notify("scenario-ready", { missionId: id });
    } catch (error) {
      OSLab.diagnostics.push({ type: "mission:setup", missionId: id, message: error.message });
      OSLab.shell?.notify?.("Não foi possível preparar a missão", "Reinicie a atividade e tente novamente.", "error");
    }
    return { ok: true, active: snapshot().active };
  }

  function calculateMedals() {
    const done = progress.completed;
    const medals = new Set(progress.medals);
    if (done["open-first-app"]) medals.add("Primeiro passo");
    if (["create-folder", "rename-document", "move-file", "copy-file", "restore-file", "search-file", "organize-school"].every((id) => done[id])) medals.add("Organizador");
    if (done["close-frozen-app"]) medals.add("Suporte iniciante");
    if (catalog().every((mission) => done[mission.id])) medals.add("Mestre do sistema");
    progress.medals = [...medals];
  }

  function complete(mission) {
    const active = progress.active;
    const score = Math.max(40, 100 - active.hintsUsed * 10 - active.mistakes * 5);
    const result = {
      missionId: mission.id, title: mission.title, concept: mission.concept, score,
      hintsUsed: active.hintsUsed, mistakes: active.mistakes, completedAt: new Date().toISOString(),
    };
    progress.completed[mission.id] = result;
    progress.totalScore = Object.values(progress.completed).reduce((sum, entry) => sum + (Number(entry.score) || 0), 0);
    progress.active = null;
    calculateMedals();
    notify("completed", { missionId: mission.id, result });
    OSLab.events.emit("mission:completed", { missionId: mission.id, result, medals: progress.medals }, "missionEngine");
    return result;
  }

  function handle(event) {
    if (handlingEvent || !progress.active) return;
    const mission = missionById(progress.active.id);
    if (!mission) return;
    handlingEvent = true;
    try {
      const completedIds = mission.validate?.(event, activeContext(mission)) || [];
      completedIds.forEach((id) => { if (id in progress.active.checklist) progress.active.checklist[id] = true; });
      const done = Object.values(progress.active.checklist).every(Boolean);
      if (done) complete(mission); else notify("validated", { missionId: mission.id, eventType: event.type });
    } catch (error) {
      OSLab.diagnostics.push({ type: "mission:validate", missionId: mission.id, message: error.message });
    } finally { handlingEvent = false; }
  }

  OSLab.events.subscribe("oslab:event", handle);

  function getHint() {
    if (!progress.active || Number(progress.active.hintsUsed) <= 0) return null;
    const mission = missionById(progress.active.id);
    return clone(mission?.hint);
  }

  function useHint() {
    if (!progress.active) return null;
    const mission = missionById(progress.active.id);
    if (!mission?.hint) return null;
    const alreadyRevealed = Boolean(progress.active.hintRevealed) || Number(progress.active.hintsUsed) > 0;
    if (alreadyRevealed) return clone(mission.hint);
    progress.active.hintRevealed = true;
    progress.active.hintsUsed = 1;
    const hint = clone(mission.hint);
    notify("hint", { missionId: mission.id, hint });
    OSLab.events.emit("mission:hint", { missionId: mission.id, hint }, "missionEngine");
    return hint;
  }

  OSLab.missions = {
    start,
    continue() { return progress.active ? { ok: true, active: snapshot().active } : { ok: false, reason: "none" }; },
    restart() { if (!progress.active) return { ok: false }; const id = progress.active.id; const mission = missionById(id); try { mission?.reset?.(activeContext(mission)); } catch (error) { OSLab.diagnostics.push({ type: "mission:reset", missionId: id, message: error.message }); } cleanup(id, true); progress.active = null; notify("restarting", { missionId: id }); return start(id); },
    abandon() { if (!progress.active) return { ok: false }; const id = progress.active.id; cleanup(id, true); progress.active = null; notify("abandoned", { missionId: id }); return { ok: true }; },
    useHint,
    getHint,
    getProgress: snapshot,
    getMissions: statuses,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    resetProgress() {
      if (progress.active) cleanup(progress.active.id, true);
      catalog().forEach((mission) => OSLab.fileSystem.removeMissionItems(mission.id));
      progress = OSLab.missionStorage.reset(); notify("progress-reset"); return snapshot();
    },
    resumeAfterBoot() {
      if (!progress.active) return;
      const mission = missionById(progress.active.id);
      if (["window-control", "close-frozen-app"].includes(mission.id)) {
        const id = mission.id; cleanup(id, false); progress.active = null; start(id);
        OSLab.shell?.notify?.("Missão restaurada", "O cenário temporário foi recriado com segurança.", "info");
      } else if (mission.id === "organize-school" && !OSLab.shell?.isWindowOpen?.(progress.active.scenario.unnecessaryWindowId)) {
        const app = OSLab.shell?.openApp?.("google", { missionId: mission.id });
        if (app?.windowId) progress.active.scenario.unnecessaryWindowId = app.windowId;
        notify("resumed", { missionId: mission.id });
        OSLab.shell?.notify?.("Missão restaurada", "O aplicativo do cenário final foi reaberto com segurança.", "info");
      } else notify("resumed", { missionId: mission.id });
    },
  };

  OSLab.activityCoordinator?.register?.("mission", {
    isActive: () => Boolean(progress.active),
    stop: () => OSLab.missions.abandon(),
  });
})(window);
