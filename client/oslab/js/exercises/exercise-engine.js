(function createExerciseEngine(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  let progress = OSLab.exerciseStorage.load();
  let session = null;
  let handlingEvent = false;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function definition(id) { return OSLab.exerciseCatalog.find((exercise) => exercise.id === id) || null; }
  function requiredExercises(exercise) { return OSLab.exerciseCatalog.filter((item) => item.order < exercise.order); }
  function isUnlocked(exercise) { return requiredExercises(exercise).every((item) => Boolean(progress.completed[item.id])); }
  function publicSession() {
    if (!session) return null;
    const { baseline, ...visible } = session;
    return clone(visible);
  }
  function snapshot() { return { progress: clone(progress), session: publicSession() }; }
  function persist(reason, detail = {}) {
    OSLab.exerciseStorage.save(progress);
    const current = snapshot(); listeners.forEach((listener) => listener(current, reason, detail));
    OSLab.events.emit("exercise:updated", { reason, ...detail, state: current }, "exerciseEngine");
    return current;
  }
  function context(exercise) {
    return {
      id: exercise.id,
      shell: OSLab.shell,
      scenario: session.scenario,
      fact(key, value) { if (arguments.length > 1) session.facts[key] = value; return session.facts[key]; },
    };
  }
  function speech(message, mood = "concerned") {
    if (!session || !message || session.lastSpeech === message) return;
    session.lastSpeech = message; session.speech = message; session.mood = mood;
  }
  function restoreActive() {
    if (!session?.baseline) return;
    OSLab.systemState.endEphemeral(session.baseline);
  }
  function stop(options = {}) {
    if (!session) return { ok: false };
    const id = session.id;
    handlingEvent = true;
    try { OSLab.shell?.closeMissionWindows?.(`exercise:${id}`); restoreActive(); }
    finally { session = null; handlingEvent = false; }
    OSLab.activityCoordinator?.release?.("exercise");
    persist(options.reason || "exited", { exerciseId: id });
    if (!options.silent) OSLab.shell?.openApp?.("exercises");
    return { ok: true };
  }
  function start(id) {
    const exercise = definition(id);
    if (!exercise) return { ok: false, reason: "missing" };
    if (!isUnlocked(exercise)) return { ok: false, reason: "locked" };
    if (session) stop({ reason: "switched", silent: true });
    OSLab.activityCoordinator?.claim?.("exercise");
    progress.attempts[id] = (Number(progress.attempts[id]) || 0) + 1;
    progress.hints[id] = { attempt: progress.attempts[id], used: false };
    progress.lastExerciseId = id;
    session = {
      id, phase: "preparing", attempt: progress.attempts[id], hintUsed: false, scenario: {}, facts: {},
      speech: exercise.initialSpeech, lastSpeech: exercise.initialSpeech, mood: "concerned", startedAt: new Date().toISOString(), baseline: OSLab.systemState.beginEphemeral(),
    };
    // A publicação do estado de preparação também gera um evento global.
    // Ignore validações até o setup preencher o cenário para que a fala inicial
    // da nova atividade não seja substituída usando dados ainda incompletos.
    handlingEvent = true;
    persist("preparing", { exerciseId: id });
    try {
      session.scenario = { ...(exercise.setup?.(context(exercise)) || {}) };
      session.phase = "investigating";
    } catch (error) {
      OSLab.diagnostics.push({ type: "exercise:setup", exerciseId: id, message: error.message });
      speech("Não foi possível preparar o ambiente. Reinicie o exercício.", "error");
    } finally { handlingEvent = false; }
    persist("started", { exerciseId: id });
    return { ok: true, session: publicSession() };
  }
  function evaluate(event) {
    if (handlingEvent || !session || ["testing", "completed"].includes(session.phase)) return;
    const exercise = definition(session.id);
    const isLearnerAction = /^(file:|recycle:|system-state:|network:|process:|startup:)/.test(event?.type || "");
    handlingEvent = true;
    try {
      const ready = Boolean(exercise.isReady?.(context(exercise)));
      if (ready && session.phase !== "awaiting-test") {
        session.phase = "awaiting-test";
        speech("A alteração parece ter funcionado. Vamos testar novamente?", "hopeful");
      } else if (!ready && session.phase === "investigating" && isLearnerAction) {
        session.phase = "partial";
      }
      persist("evaluated", { exerciseId: session.id, eventType: event?.type || "manual", ready });
    } catch (error) {
      OSLab.diagnostics.push({ type: "exercise:evaluate", exerciseId: session.id, message: error.message });
    } finally { handlingEvent = false; }
  }
  function complete(exercise) {
    const result = {
      exerciseId: exercise.id, title: exercise.title, cause: exercise.cause, tool: exercise.tool,
      hintUsed: session.hintUsed, attempt: session.attempt, completedAt: new Date().toISOString(),
    };
    progress.completed[exercise.id] = result;
    session.phase = "completed"; session.result = result;
    speech(exercise.success, "happy");
    persist("completed", { exerciseId: exercise.id, result });
    OSLab.events.emit("exercise:completed", { exerciseId: exercise.id, result }, "exerciseEngine");
    return result;
  }
  function runTest() {
    if (!session || session.phase === "completed") return { ok: false, reason: "none" };
    const exercise = definition(session.id);
    session.phase = "testing"; speech("Vou testar novamente para confirmar a correção.", "waiting"); persist("testing", { exerciseId: session.id });
    let ok = false;
    try { ok = Boolean(exercise.test?.(context(exercise))); }
    catch (error) { OSLab.diagnostics.push({ type: "exercise:test", exerciseId: session.id, message: error.message }); }
    if (ok) return { ok: true, result: complete(exercise) };
    session.phase = "investigating"; speech("A mensagem de erro continua aparecendo. Revise o diagnóstico e tente outra vez.", "concerned");
    persist("test-failed", { exerciseId: session.id });
    return { ok: false, reason: "not-solved" };
  }
  function useHint() {
    if (!session || session.hintUsed) return null;
    const exercise = definition(session.id); session.hintUsed = true;
    session.hint = clone(exercise.hint);
    progress.hints[session.id] = { attempt: session.attempt, used: true };
    speech("Dica aberta. Siga as etapas abaixo com calma e confira o resultado ao final.", "helpful");
    persist("hint", { exerciseId: session.id }); return clone(exercise.hint);
  }
  function getHint() { return session?.hintUsed ? clone(session.hint || definition(session.id)?.hint) : null; }
  function repeatSpeech() { if (!session) return null; persist("speech-repeated", { exerciseId: session.id }); return session.speech; }
  function restart() { if (!session) return { ok: false }; const id = session.id; stop({ reason: "restarting", silent: true }); return start(id); }
  function finish(action = "return") {
    if (!session) return { ok: false };
    if (action === "next" && session.phase !== "completed") return { ok: false, reason: "not-completed" };
    const completedId = session.id; const order = definition(completedId)?.order || 0;
    stop({ reason: "finished", silent: true });
    if (action === "repeat") return start(completedId);
    if (action === "next") { const next = OSLab.exerciseCatalog.find((item) => item.order === order + 1); if (next) return start(next.id); }
    OSLab.shell?.openApp?.("exercises"); return { ok: true };
  }
  function statuses() {
    return OSLab.exerciseCatalog.map((exercise) => ({
      ...exercise,
      status: session?.id === exercise.id ? "active" : !isUnlocked(exercise) ? "locked" : progress.completed[exercise.id] ? "completed" : "available",
      attempts: Number(progress.attempts[exercise.id]) || 0,
    }));
  }

  OSLab.events.subscribe("oslab:event", evaluate);
  OSLab.exercises = {
    start, restart, exit: stop, runTest, useHint, getHint, repeatSpeech, finish,
    getProgress: () => clone(progress), getSession: publicSession, getExercises: statuses,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    resetProgress() { if (session) stop({ silent: true }); progress = OSLab.exerciseStorage.reset(); persist("progress-reset"); return clone(progress); },
  };
  OSLab.activityCoordinator?.register?.("exercise", { isActive: () => Boolean(session), stop });
})(window);
