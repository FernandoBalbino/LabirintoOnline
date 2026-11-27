(function createUserMissionEngine(global) {
  "use strict";
  const O = global.OSLab, listeners = new Set(), catalog = O.userMissionCatalog;
  let progress = O.userMissionStorage.load();
  const clone = value => JSON.parse(JSON.stringify(value));
  function publish(reason = "changed") { O.userMissionStorage.save(progress); listeners.forEach(fn => fn(clone(progress), reason)); O.assistantRobot?.render?.(); }
  const clean = {};
  catalog.forEach((mission, index) => { if ((!index || clean[catalog[index - 1].id]) && progress.completed[mission.id]) clean[mission.id] = progress.completed[mission.id]; });
  progress.completed = clean;
  progress.context = progress.context || {};
  progress.totalScore = Object.values(clean).reduce((sum, item) => sum + Number(item.score || 0), 0);
  if (progress.active) { progress.active.checklist ||= {}; progress.active.facts ||= {}; }
  function getMissions() { return catalog.map((mission, index) => ({ ...mission, status: progress.completed[mission.id] ? "completed" : progress.active?.id === mission.id ? "active" : !index || progress.completed[catalog[index - 1].id] ? "available" : "locked" })); }
  function studentId() {
    const saved = progress.context.studentUserId || progress.completed["users-1"]?.studentUserId;
    if (saved && O.users.list().some(user => user.id === saved)) return saved;
    // Recover context for legacy v1 progress without removing existing achievements.
    return O.users.list().filter(user => user.id !== "user-aluno" && user.role === "standard").at(-1)?.id || null;
  }
  function start(id) {
    const mission = getMissions().find(entry => entry.id === id);
    if (!mission || mission.status === "locked") return { ok: false, reason: "locked" };
    O.activityCoordinator?.claim?.("users-permissions");
    if (progress.active?.id === id && progress.active.phase !== "completed") progress.active.suspended = false;
    else progress.active = { id, checklist: {}, facts: {}, hintsUsed: 0, mistakes: 0, startedAt: Date.now(), phase: "practice", suspended: false };
    progress.lastMissionId = id;
    publish("started");
    O.assistantRobot?.expand?.();
    if (mission.tool) O.shell?.openApp?.(mission.tool, mission.tool === "settings" ? { settingsView: "accounts" } : {});
    evaluateFinal();
    return { ok: true };
  }
  function complete() {
    const active = progress.active, mission = catalog.find(entry => entry.id === active?.id);
    if (!mission || active.suspended || active.phase === "completed" || !mission.objectives.every(item => active.checklist[item.id])) return;
    const score = Math.max(40, 100 - (active.hintsUsed || 0) * 10 - (active.mistakes || 0) * 5);
    const result = { missionId: mission.id, title: mission.title, concept: mission.success, score, mistakes: active.mistakes, hintsUsed: active.hintsUsed, completedAt: Date.now(), studentUserId: studentId(), facts: clone(active.facts) };
    progress.completed[mission.id] = result;
    progress.totalScore = Object.values(progress.completed).reduce((sum, item) => sum + Number(item.score || 0), 0);
    active.phase = "completed"; publish("completed");
    O.events.emit("users-mission:completed", { result }, "userMissionEngine");
    O.ui?.notify?.("Missão concluída", mission.title + ": " + score + " pontos.", "success", 5200);
  }
  function mark(objective, detail = {}) {
    const active = progress.active, mission = catalog.find(entry => entry.id === active?.id);
    if (!mission || active.suspended || active.phase === "completed" || active.checklist[objective] || !mission.objectives.some(item => item.id === objective)) return;
    active.checklist[objective] = true; active.facts[objective] = clone(detail);
    if (mission.objectives.every(item => active.checklist[item.id])) complete(); else publish("objective");
  }
  function mistake(reason) { if (!progress.active || progress.active.suspended || progress.active.phase === "completed") return; progress.active.mistakes = (progress.active.mistakes || 0) + 1; progress.active.lastMistake = reason; publish("mistake"); }
  function useHint() {
    const active = progress.active, mission = catalog.find(entry => entry.id === active?.id);
    if (!active || !mission || active.suspended || active.phase === "completed") return null;
    const index = Math.min(active.hintsUsed || 0, mission.hints.length - 1);
    if (active.hintsUsed < mission.hints.length) active.hintsUsed += 1;
    active.lastHint = { title: "Dica " + (index + 1), intro: mission.hints[index], steps: mission.hints.slice(0, index + 1), check: mission.objectives.find(item => !active.checklist[item.id])?.label || mission.success };
    publish("hint"); return clone(active.lastHint);
  }
  function finish(action = "return") {
    const active = progress.active, mission = catalog.find(entry => entry.id === active?.id);
    if (!active || !mission) return { ok: false, reason: "no-active-mission" };
    if (action === "next" && active.phase !== "completed") return { ok: false, reason: "not-completed" };
    progress.active = null; O.activityCoordinator?.release?.("users-permissions"); publish("finished");
    if (action === "repeat") return start(mission.id);
    if (action === "next") { const next = catalog.find(entry => entry.order === mission.order + 1); if (next) return start(next.id); }
    O.shell?.openApp?.("userspermissions"); return { ok: true };
  }
  function evaluateFinal() {
    const active = progress.active;
    if (active?.id !== "users-7" || active.suspended || active.phase === "completed") return;
    O.users.captureSystemState?.(undefined, O.users.getCurrent()?.id, false);
    const users = O.users.list(), students = users.filter(user => user.role === "standard");
    const customized = students.map(user => ({ user, profile: O.users.getProfile(user.id) })).filter(({ user, profile }) => (profile?.privateFileSystem?.items || []).some(item => item.kind === "file" && item.ownerId === user.id));
    const walls = new Set(customized.map(({ profile }) => profile?.preferences?.wallpaperId).filter(Boolean));
    const programs = O.software?.getState?.().installedPrograms || {};
    const publicItems = O.fileSystem?.list?.(O.fileSystem.roots.public) || [];
    active.checklist["accounts-ready"] = users.some(user => user.role === "administrator") && students.length >= 2;
    active.checklist["profiles-ready"] = customized.length >= 2 && walls.size >= 2;
    active.checklist["lab-ready"] = Object.values(programs).some(program => program.installed && program.installations?.all) && publicItems.some(item => item.kind === "file" && item.permission === "modify");
    if (catalog[6].objectives.every(item => active.checklist[item.id])) complete(); else publish("objective");
  }
  O.events.subscribe("oslab:event", ({ type, detail }) => {
    const active = progress.active;
    if (!active || active.suspended || active.phase === "completed") return;
    const actor = O.users.getCurrent(), student = studentId(), isStudent = actor?.id === student;
    const eventActor = detail.actorUserId || actor?.id;
    if (active.id === "users-1") {
      if (type === "settings:other-users-opened") mark("opened-accounts", detail);
      if (type === "account:created" && active.checklist["opened-accounts"] && detail.role === "standard" && O.users.list().some(user => user.id === detail.userId)) { progress.context.studentUserId = detail.userId; mark("created", detail); mark("standard", detail); }
    }
    if (active.id === "users-2") {
      if (["session:signed-in", "session:switched"].includes(type) && detail.userId === student) mark("signed-in", detail);
      if (type === "profile:updated" && isStudent && detail.userId === student && active.checklist["signed-in"]) mark("profile", detail);
      if (type === "wallpaper:changed" && isStudent && active.checklist["signed-in"]) mark("wallpaper", { ...detail, userId: student });
    }
    if (active.id === "users-3" && isStudent) {
      if (type === "file:created" && detail.kind === "file" && detail.parentFolderId === O.fileSystem.roots.documents && detail.item?.ownerId === student) mark("private-file", detail);
      if (type === "file:other-home-opened" && active.checklist["private-file"] && eventActor === student && detail.targetUserId !== student && O.users.list().some(user => user.id === detail.targetUserId)) mark("other-home", detail);
      if (type === "file:access-denied" && active.checklist["other-home"] && detail.targetUserId === active.facts["other-home"]?.targetUserId) mark("denied", detail);
    }
    if (active.id === "users-4" && isStudent) {
      if (type === "install:completed" && eventActor === student && detail.scope === "user" && detail.ownerId === student) mark("user-install", detail);
      if (type === "install:completed" && eventActor === student && detail.scope === "all" && active.checklist["user-install"]) mark("all-install", detail);
      if (type === "app:data-saved" && detail.userId === student && active.facts["all-install"]?.programIds?.includes(detail.programId)) mark("app-data", detail);
    }
    if (active.id === "users-5" && actor?.role === "standard") {
      if (type === "elevation:denied" && detail.action === "change-account-type" && eventActor === actor.id && detail.targetUserId && detail.targetUserId !== actor.id) mark("uac-denied", detail);
      const denied = active.facts["uac-denied"];
      if (type === "elevation:granted" && detail.action === "change-account-type" && detail.targetUserId === denied?.targetUserId && eventActor === denied?.actorUserId && detail.authorizationId) mark("uac-granted", detail);
      const granted = active.facts["uac-granted"];
      if (type === "account:type-changed" && detail.userId === granted?.targetUserId && detail.authorizationId === granted?.authorizationId && granted?.authorizationId && detail.previousRole !== detail.role) mark("role-changed", detail);
    }
    if (active.id === "users-6" && isStudent) {
      if (type === "file:created" && detail.kind === "file" && detail.parentFolderId === O.fileSystem.roots.public && detail.item?.ownerId === student) mark("public-file", detail);
      if (type === "file:permission-changed" && detail.fileId === active.facts["public-file"]?.fileId && eventActor === student) { if (detail.permission === "read") mark("read", detail); if (detail.permission === "modify" && active.checklist.read) mark("modify", detail); }
    }
    if (["account:created", "account:type-changed", "profile:updated", "wallpaper:changed", "install:completed", "file:created", "file:permission-changed", "session:switched", "session:signed-in"].includes(type)) evaluateFinal();
    if (["account:create-rejected", "file:write-denied", "elevation:invalid-credentials"].includes(type)) mistake(type);
  });
  function reset() { progress = O.userMissionStorage.reset(); progress.context = {}; O.activityCoordinator?.release?.("users-permissions"); publish("reset"); }
  function stop() { if (progress.active) { progress.active.suspended = true; publish("suspended"); } O.activityCoordinator?.release?.("users-permissions"); }
  O.activityCoordinator?.register?.("users-permissions", { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });
  O.userMissions = { catalog, getMissions, getProgress: () => clone(progress), start, finish, complete, mark, mistake, useHint, evaluateFinal, reset, stop, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
