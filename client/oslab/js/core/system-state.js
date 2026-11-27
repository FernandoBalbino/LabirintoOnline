(function createSystemState(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const listeners = new Set();
  const GB = 1024 ** 3;
  let shellAdapter = null;
  let runtime = {
    storageTotalBytes: 237 * GB,
    systemReservedBytes: 89 * GB,
    requiredDownloadBytes: 0,
    blockedAppId: null,
    requiredAppMemoryMb: 0,
    slowMode: false,
    lastBootSeconds: 18,
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function storage() {
    const fileBytes = OSLab.fileSystem?.usedBytes?.() || 0;
    const usedBytes = Math.max(0, Math.min(runtime.storageTotalBytes, runtime.systemReservedBytes + fileBytes));
    return { totalBytes: runtime.storageTotalBytes, usedBytes, freeBytes: Math.max(0, runtime.storageTotalBytes - usedBytes), fileBytes };
  }
  function performance() {
    return OSLab.processManager?.getUsage?.() || { cpuPercent: 0, memoryPercent: 0, memoryUsedMb: 0, memoryFreeMb: 4096 };
  }
  function summary() { return { storage: storage(), performance: performance(), network: OSLab.network?.getSnapshot?.(), runtime: clone(runtime) }; }
  function notify(reason) {
    document.documentElement?.classList.toggle("is-system-slow", Boolean(runtime.slowMode));
    const current = summary(); listeners.forEach((listener) => listener(current, reason));
    OSLab.events.emit("system-state:changed", { reason, state: current }, "systemState"); return current;
  }
  function configure(patch, options = {}) {
    runtime = { ...runtime, ...(patch || {}) };
    return options.silent ? summary() : notify("configured");
  }
  function isAppLaunchAllowed(appId) {
    if (runtime.blockedAppId !== appId) return { ok: true };
    const usage = performance();
    return usage.memoryFreeMb >= runtime.requiredAppMemoryMb ? { ok: true } : { ok: false, reason: "memory", requiredMb: runtime.requiredAppMemoryMb, freeMb: usage.memoryFreeMb };
  }
  function snapshot() {
    return {
      runtime: clone(runtime),
      files: OSLab.fileSystem?.snapshot?.(),
      processes: OSLab.processManager?.snapshot?.(),
      network: OSLab.network?.getSnapshot?.(),
      shell: shellAdapter?.snapshot?.(),
    };
  }
  function restore(input, options = {}) {
    if (!input) return summary();
    runtime = { ...runtime, ...(input.runtime || {}) };
    if (input.files) OSLab.fileSystem?.restoreSnapshot?.(input.files);
    if (input.processes) OSLab.processManager?.restoreSnapshot?.(input.processes);
    if (input.network) OSLab.network?.restoreSnapshot?.(input.network, { silent: true });
    if (input.shell) shellAdapter?.restore?.(input.shell);
    return options.silent ? summary() : notify("restored");
  }
  function beginEphemeral() {
    const baseline = snapshot();
    shellAdapter?.setPersistenceSuspended?.(true);
    return baseline;
  }
  function endEphemeral(baseline) {
    restore(baseline, { silent: true });
    shellAdapter?.setPersistenceSuspended?.(false);
    shellAdapter?.persist?.();
    return notify("exercise-restored");
  }

  OSLab.systemState = {
    GB, bindShell(adapter) { shellAdapter = adapter; return this; }, snapshot, restore, beginEphemeral, endEphemeral,
    configure, getSummary: summary, getStorage: storage, getPerformance: performance, isAppLaunchAllowed,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
})(window);
