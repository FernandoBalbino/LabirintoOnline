(function createWifiLab(global) {
  "use strict";
  const O = global.OSLab, catalog = O.wifiMissionCatalog, listeners = new Set();
  const clone = value => JSON.parse(JSON.stringify(value));
  let progress = O.wifiMissionStorage.load(), preparing = false;
  const clean = {};
  catalog.forEach((mission, index) => { if ((!index || clean[catalog[index - 1].id]) && progress.completed[mission.id]?.quizCorrect) clean[mission.id] = { ...progress.completed[mission.id], score: 10 }; });
  progress.completed = clean; progress.totalScore = Object.keys(clean).length * 10;
  if (progress.active && (!catalog.some(m => m.id === progress.active.id) || !progress.active.checklist || !progress.active.scenario || !progress.active.baseline)) progress.active = null;
  function publish(reason) {
    if (progress.active && !progress.active.suspended && !preparing) progress.active.scenario = O.network.getSnapshot();
    O.wifiMissionStorage.save(progress); listeners.forEach(fn => fn(clone(progress), reason)); O.assistantRobot?.render?.();
  }
  function getMissions() { return catalog.map((m, i) => ({ ...m, status: progress.active?.id === m.id && progress.active.phase !== "completed" ? "active" : progress.completed[m.id] ? "completed" : !i || progress.completed[catalog[i - 1].id] ? "available" : "locked" })); }
  function start(id) {
    const mission = getMissions().find(m => m.id === id);
    if (!mission || mission.status === "locked") return { ok: false, reason: "locked" };
    if (progress.active?.id === id && progress.active.phase !== "completed") {
      if (progress.active.suspended) { O.activityCoordinator.claim("wifi-lab"); progress.active.baseline = O.network.getSnapshot(); preparing = true; O.network.restoreSnapshot(progress.active.scenario); preparing = false; progress.active.suspended = false; }
    } else {
      if (progress.active && !progress.active.suspended) stop();
      O.activityCoordinator.claim("wifi-lab");
      const baseline = O.network.getSnapshot();
      preparing = true;
      O.wifiScenarios.prepare(mission.order);
      progress.active = { id, phase: "practice", suspended: false, baseline, scenario: O.network.getSnapshot(), checklist: {}, hintsUsed: 0, quizAttempts: [], feedback: null, startedAt: Date.now() };
      preparing = false;
    }
    O.wifiUI?.resetPanels?.(); publish("started"); O.assistantRobot?.expand?.(); return { ok: true };
  }
  function stop() {
    const a = progress.active;
    if (!a || a.suspended) return;
    a.scenario = O.network.getSnapshot(); a.suspended = true;
    preparing = true; O.network.restoreSnapshot(a.baseline); preparing = false;
    O.activityCoordinator.release("wifi-lab"); O.wifiUI?.resetPanels?.(); publish("suspended");
  }
  function ready() {
    const a = progress.active, n = O.network.getSnapshot(), order = catalog.find(m => m.id === a?.id)?.order;
    if (!a || !catalog[order - 1].objectives.every(o => a.checklist[o.id])) return false;
    if (order === 1) return n.wifiEnabled;
    if (order === 2) return n.wifiEnabled && !n.airplaneMode;
    if ([3, 4, 7].includes(order)) return n.connectedSsid === "Escola_Alunos" && n.knownNetworks.Escola_Alunos?.password === "Alunos2026!";
    if (order === 8) return n.knownNetworks.Escola_Alunos?.autoConnect === true;
    if (order === 9) return n.availableNetworks.find(v => v.ssid === "Escola_Alunos")?.signal >= 70;
    if (order === 10) return n.knownNetworks.Escola_Alunos?.metered === true;
    return n.connectedSsid === "Escola_Alunos";
  }
  function evaluate() {
    const a = progress.active;
    if (!a || a.suspended || a.phase === "completed" || preparing) return;
    const solved = ready();
    if (solved && a.phase !== "question") { a.phase = "question"; a.feedback = null; O.assistantRobot?.expand?.(); }
    else if (!solved && a.phase === "question") { a.phase = "practice"; a.feedback = null; }
    publish("objective");
  }
  function mark(id) { const a = progress.active; if (a) a.checklist[id] = true; }
  O.events.subscribe("oslab:event", ({ type, detail }) => {
    const a = progress.active, order = catalog.find(m => m.id === a?.id)?.order;
    if (!a || a.suspended || a.phase === "completed" || preparing) return;
    if (type === "wifi:quick-opened" && [1, 2].includes(order)) mark("quick");
    if (type === "wifi:toggled" && detail.enabled && (order === 2 || order === 1 && detail.source === "quickSettings") && a.checklist.quick) mark("enabled");
    if (type === "network:changed" && detail.reason === "airplane" && order === 2 && a.checklist.quick && !detail.network.airplaneMode) mark("airplane-off");
    if (type === "wifi:list-opened" && order === 3) mark("list");
    if (type === "wifi:network-selected" && order === 3 && a.checklist.list && detail.ssid === "Escola_Alunos") mark("selected");
    if (type === "wifi:authentication-failed" && order === 4 && detail.ssid === "Escola_Alunos" && detail.reason === "authentication") mark("auth-error");
    if (type === "wifi:connected" && detail.ssid === "Escola_Alunos" && (order === 3 && a.checklist.selected || order === 4 && a.checklist["auth-error"] || order === 7 && a.checklist.forgotten)) mark("connected");
    if (type === "wifi:page-opened") {
      if (detail.page === "properties" && detail.ssid === "Escola_Alunos" && [5, 6, 8, 10].includes(order)) mark("properties");
      if (detail.page === "known" && order === 7) mark("known");
      if (detail.page === "signal" && order === 9) mark("signal");
    }
    if (type === "wifi:password-revealed" && order === 5 && a.checklist.properties && detail.ssid === "Escola_Alunos") mark("revealed");
    if (type === "wifi:forgotten" && order === 7 && a.checklist.known && detail.ssid === "Escola_Alunos") mark("forgotten");
    if (type === "wifi:property-changed" && detail.ssid === "Escola_Alunos" && a.checklist.properties && detail.value === true) { if (order === 8 && detail.property === "autoConnect") mark("auto"); if (order === 10 && detail.property === "metered") mark("metered"); }
    if (type === "wifi:position-changed" && order === 9 && a.checklist.signal && detail.signal >= 70 && detail.position !== "distant") mark("moved");
    if (type.startsWith("wifi:") || type === "network:changed") evaluate();
  });
  function verifyProperties(band, security) {
    const a = progress.active, n = O.network.getSnapshot().availableNetworks.find(n => n.ssid === "Escola_Alunos");
    if (!a || a.suspended || a.id !== "wifi-6" || a.phase !== "practice" || !a.checklist.properties) return { ok: false };
    const ok = band === n.band && security === n.security;
    a.propertyFeedback = ok ? "Correto! As informações registradas correspondem à rede." : "As informações ainda não correspondem. Consulte novamente os detalhes nas propriedades da rede.";
    a.propertyCorrect = ok;
    if (ok) mark("recorded"); evaluate(); return { ok };
  }
  function answer(index) {
    const a = progress.active, mission = catalog.find(m => m.id === a?.id);
    if (!a || a.suspended || a.phase !== "question" || !Number.isInteger(index) || index < 0 || index > 2 || !ready()) return { ok: false, reason: "practice-required" };
    const correct = index === mission.quiz.correct;
    a.quizAttempts.push({ index, correct }); a.feedback = { index, correct, text: mission.quiz.explanations[index] };
    if (correct) { a.phase = "completed"; progress.completed[a.id] = { score: 10, quizCorrect: true, completedAt: Date.now() }; progress.totalScore = Object.keys(progress.completed).length * 10; }
    publish(correct ? "completed" : "answer-incorrect"); O.assistantRobot?.expand?.(); return { ok: true, correct };
  }
  function finish(action = "return") {
    const a = progress.active, order = catalog.find(m => m.id === a?.id)?.order;
    if (!a || action === "next" && a.phase !== "completed") return { ok: false, reason: "not-completed" };
    const id = a.id; stop(); progress.active = null; publish("finished");
    if (action === "repeat") return start(id);
    if (action === "next" && order < 10) return start(`wifi-${order + 1}`);
    O.shell?.openApp?.("wifilab"); return { ok: true };
  }
  function restart() { return finish("repeat"); }
  function useHint() { const a = progress.active, m = catalog.find(m => m.id === a?.id); if (!a || a.suspended || a.phase !== "practice") return; a.hintsUsed = Math.min(3, a.hintsUsed + 1); a.lastHint = m.hints[a.hintsUsed - 1]; publish("hint"); O.assistantRobot?.expand?.(); }
  function reset() { stop(); progress = O.wifiMissionStorage.blank(); publish("reset"); }
  function initialize() { if (progress.active && !progress.active.suspended) { O.activityCoordinator.claim("wifi-lab"); preparing = true; O.network.restoreSnapshot(progress.active.scenario); preparing = false; publish("resumed"); O.assistantRobot?.expand?.(); } }
  O.activityCoordinator.register("wifi-lab", { isActive: () => Boolean(progress.active && !progress.active.suspended), stop });
  O.wifiLab = { getMissions, getProgress: () => clone(progress), start, stop, finish, restart, answer, verifyProperties, useHint, reset, initialize, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
})(window);
