(function createActivityCoordinator(global) {
  "use strict";

  const OSLab = global.OSLab = global.OSLab || {};
  const controllers = new Map();
  let currentKind = null;

  function register(kind, controller) {
    controllers.set(kind, controller);
    return () => controllers.delete(kind);
  }

  function activeKind() {
    if (currentKind && controllers.get(currentKind)?.isActive?.()) return currentKind;
    currentKind = Array.from(controllers.entries()).find(([, controller]) => controller.isActive?.())?.[0] || null;
    return currentKind;
  }

  function claim(kind) {
    controllers.forEach((controller, candidate) => {
      if (candidate !== kind && controller.isActive?.()) controller.stop?.({ reason: "activity-switch", silent: true });
    });
    currentKind = kind;
    OSLab.events.emit("activity:claimed", { kind }, "activityCoordinator");
    return true;
  }

  function release(kind) {
    if (currentKind === kind) currentKind = null;
    OSLab.events.emit("activity:released", { kind }, "activityCoordinator");
  }

  OSLab.activityCoordinator = { register, claim, release, activeKind };
})(window);
