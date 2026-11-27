(function createVpnLabEngine(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let progress = OSLab.vpnLabStorage.load();
  let handling = false;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function definition(id) { return OSLab.vpnMissionCatalog.find((mission) => mission.id === id) || null; }
  function persist(reason, detail = {}) {
    OSLab.vpnLabStorage.save(progress);
    const current = clone(progress);
    listeners.forEach((listener) => listener(current, reason, detail));
    OSLab.events.emit("vpn-lab:updated", { reason, progress: current, ...detail }, "vpnLabEngine");
    return current;
  }
  function firstIncompleteOrder() {
    return OSLab.vpnMissionCatalog.find((mission) => !progress.completed[mission.id])?.order || OSLab.vpnMissionCatalog.length + 1;
  }
  function isUnlocked(mission) { return mission.order <= firstIncompleteOrder(); }
  function status(mission) {
    if (progress.active?.id === mission.id) return progress.active.phase === "completed" ? "completed" : "active";
    if (!isUnlocked(mission)) return "locked";
    return progress.completed[mission.id] ? "completed" : "available";
  }
  function checklistFor(id, facts) {
    const vpn = OSLab.vpn.getSnapshot();
    const network = OSLab.network.getSnapshot();
    if (id === "vpn-netflix") return { "netflix-br": Boolean(facts.netflixUnavailableBr), "vpn-us": vpn.connected && vpn.serverId === "us", "netflix-refresh": Boolean(facts.supernaturalVisibleUs) };
    if (id === "vpn-company") return { "portal-denied": Boolean(facts.portalDenied), "company-vpn": vpn.corporateNetwork === "empresa-os", "ticket-1542": Boolean(facts.ticket1542) };
    if (id === "vpn-my-ip") return { "ip-br": Boolean(facts.myIpBr), "ip-de": Boolean(facts.myIpDe), "ip-quiz": Boolean(facts.ipQuizCorrect) };
    if (id === "vpn-airport") return { "airport-wifi": network.connectedSsid === "Aeroporto_Free_WiFi", "airport-denied": Boolean(facts.airportPortalDenied), "airport-portal": Boolean(facts.airportPortalAllowed) };
    if (id === "vpn-bank") return { "bank-jp": Boolean(facts.bankBlockedJapan), "bank-home": Boolean(facts.bankReturnedBrazil), "bank-access": Boolean(facts.bankAuthorizedBrazil) };
    if (id === "vpn-speed") return { "speed-high": Boolean(facts.speedHigh), "speed-low": Boolean(facts.speedLow), "meet-green": Boolean(facts.meetGreen) };
    if (id === "vpn-school") return { "school-denied": Boolean(facts.schoolDenied), "school-vpn": vpn.corporateNetwork === "escola-admin", "school-lab": Boolean(facts.schoolLab02) };
    return {};
  }
  function completedBy(id, checklist) { return Object.values(checklist).length > 0 && Object.values(checklist).every(Boolean); }
  function complete(mission) {
    const result = { missionId: mission.id, title: mission.title, explanation: mission.success, hintsUsed: progress.active.hintsUsed || 0, completedAt: new Date().toISOString() };
    progress.completed[mission.id] = result;
    progress.active.phase = "completed";
    progress.active.result = result;
    persist("completed", { missionId: mission.id, result });
    OSLab.ui?.notify?.("Laboratório VPN", `Missão ${mission.order} concluída!`, "success", 4400);
    OSLab.events.emit("vpn-lab:completed", { missionId: mission.id, result }, "vpnLabEngine");
    return result;
  }
  function updateFacts(event) {
    if (!progress.active || progress.active.phase === "completed") return;
    const facts = progress.active.facts = progress.active.facts || {};
    const detail = event.detail || {};
    if (event.type === "network:changed") {
      const net = detail.network;
      if (net?.connectedSsid === "Aeroporto_Free_WiFi") facts.airportWifi = true;
    }
    if (event.type === "vpn:changed") {
      const vpn = detail.vpn;
      if (vpn?.serverId === "us") facts.connectedUs = true;
      if (vpn?.serverId === "de") facts.connectedGermany = true;
      if (vpn?.serverId === "jp") facts.connectedJapan = true;
      if ((!vpn?.connected || vpn?.country === "BR") && facts.bankBlockedJapan) facts.bankReturnedBrazil = true;
    }
    if (event.type === "vpn-browser:action") {
      const action = detail.action;
      if (action === "netflix-unavailable-br") facts.netflixUnavailableBr = true;
      if (action === "netflix-supernatural-us") facts.supernaturalVisibleUs = true;
      if (action === "portal-denied") {
        facts.portalDenied = true;
        if (detail.wifi === "Aeroporto_Free_WiFi") facts.airportPortalDenied = true;
      }
      if (action === "portal-open" && detail.wifi === "Aeroporto_Free_WiFi") facts.airportPortalAllowed = true;
      if (action === "portal-ticket-1542") facts.ticket1542 = true;
      if (action === "myip-view-br") facts.myIpBr = true;
      if (action === "myip-view-de") facts.myIpDe = true;
      if (action === "myip-quiz-correct") facts.ipQuizCorrect = true;
      if (action === "bank-blocked-jp") facts.bankBlockedJapan = true;
      if (action === "bank-authorized-br") { facts.bankReturnedBrazil = true; facts.bankAuthorizedBrazil = true; }
      if (action === "speed-result") {
        const ping = Number(detail.ping) || 0;
        if (ping > 200) facts.speedHigh = true;
        if (ping > 0 && ping < 60 && detail.vpnConnected) facts.speedLow = true;
      }
      if (action === "meet-joined-green") facts.meetGreen = true;
      if (action === "school-denied") facts.schoolDenied = true;
      if (action === "school-lab-02") facts.schoolLab02 = true;
    }
    progress.active.checklist = checklistFor(progress.active.id, facts);
    const mission = definition(progress.active.id);
    persist("evaluated", { missionId: mission.id, eventType: event.type });
    if (completedBy(mission.id, progress.active.checklist)) complete(mission);
  }
  function evaluate(event) {
    if (handling || !progress.active || event.type.startsWith("vpn-lab:")) return;
    handling = true;
    try { updateFacts(event); } finally { handling = false; }
  }
  function start(id, options = {}) {
    const mission = definition(id);
    if (!mission) return { ok: false, reason: "missing" };
    if (!options.debug && !isUnlocked(mission)) return { ok: false, reason: "locked" };
    OSLab.activityCoordinator?.claim?.("vpn-lab");
    progress.lastMissionId = id;
    progress.active = { id, phase: "active", checklist: checklistFor(id, {}), facts: {}, hintsUsed: 0, startedAt: new Date().toISOString() };
    persist("started", { missionId: id });
    return { ok: true, active: clone(progress.active) };
  }
  function useHint() {
    if (!progress.active || progress.active.phase === "completed") return null;
    const mission = definition(progress.active.id);
    if ((Number(progress.active.hintsUsed) || 0) >= mission.hints.length) return progress.active.hint ? clone(progress.active.hint) : clone(mission.hints[mission.hints.length - 1]);
    const next = Math.min(mission.hints.length, (Number(progress.active.hintsUsed) || 0) + 1);
    progress.active.hintsUsed = next;
    progress.active.hint = clone(mission.hints[next - 1]);
    persist("hint", { missionId: mission.id, hintNumber: next });
    return clone(progress.active.hint);
  }
  function getHint() { return progress.active?.hint ? clone(progress.active.hint) : null; }
  function finish(action = "return") {
    if (!progress.active) return { ok: false };
    const activeId = progress.active.id;
    const order = definition(activeId)?.order || 0;
    if (action === "next" && progress.active.phase !== "completed") return { ok: false, reason: "not-completed" };
    progress.active = null;
    OSLab.activityCoordinator?.release?.("vpn-lab");
    persist("finished", { missionId: activeId });
    if (action === "repeat") return start(activeId);
    if (action === "next") { const next = OSLab.vpnMissionCatalog.find((mission) => mission.order === order + 1); if (next) return start(next.id); }
    OSLab.shell?.openApp?.("vpnlab");
    return { ok: true };
  }
  function stop(options = {}) {
    if (!progress.active) return { ok: false };
    const id = progress.active.id;
    progress.active = null;
    OSLab.activityCoordinator?.release?.("vpn-lab");
    persist(options.reason || "exited", { missionId: id });
    if (!options.silent) OSLab.shell?.openApp?.("vpnlab");
    return { ok: true };
  }
  function restart() { if (!progress.active) return { ok: false }; return start(progress.active.id); }
  function missions() { return OSLab.vpnMissionCatalog.map((mission) => ({ ...mission, status: status(mission) })); }
  function setCompleted(id, value) {
    const mission = definition(id); if (!mission) return { ok: false };
    if (value) progress.completed[id] = { missionId: id, title: mission.title, debug: true, completedAt: new Date().toISOString() };
    else delete progress.completed[id];
    if (progress.active?.id === id) progress.active = null;
    persist("debug-completion", { missionId: id, completed: Boolean(value) });
    return { ok: true };
  }
  function setFinalQuiz(answers) {
    const passed = answers?.anonymous === "no" && answers?.antivirus === "no" && answers?.corporate === "yes";
    progress.finalQuiz = { answers: clone(answers || {}), passed, answeredAt: new Date().toISOString() };
    persist("final-quiz", { passed });
    return { ok: true, passed };
  }
  function resetProgress() { progress = OSLab.vpnLabStorage.reset(); persist("reset"); return clone(progress); }

  OSLab.events.subscribe("oslab:event", evaluate);
  OSLab.vpnLab = {
    start, restart, exit: stop, finish, useHint, getHint, setCompleted, setFinalQuiz, resetProgress,
    debugStart: (id) => start(id, { debug: true }),
    getProgress: () => clone(progress), getMissions: missions,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  OSLab.activityCoordinator?.register?.("vpn-lab", { isActive: () => Boolean(progress.active), stop });
})(window);
