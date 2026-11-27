(function createDriverState(global) {
  "use strict";

  // Estado da trilha de Drivers: impressora do laboratório, driver instalado e cabo USB.
  // Marca e modelos são fictícios (Printix), para simular um site de fabricante sem copiar nenhuma marca real.
  const O = global.OSLab = global.OSLab || {};
  const KEY = "oslab.drivers.state.v1";
  const BRAND = "Printix";
  const LAB = "inkjet-2350";
  const listeners = new Set();

  // Fotos reais de impressora (com os logos trocados por Printix). Modelos da mesma série parecem iguais de propósito.
  const img = (name) => `assets/drivers/printer-${name}.png`;
  const printers = Object.freeze({
    "inkjet-2300": { id: "inkjet-2300", model: "InkJet 2300", kind: "Impressora jato de tinta", year: 2020, img: img("inkjet-2305") },
    "inkjet-2305": { id: "inkjet-2305", model: "InkJet 2305", kind: "Impressora jato de tinta", year: 2021, img: img("inkjet-2305") },
    "inkjet-2350": { id: "inkjet-2350", model: "InkJet 2350", kind: "Multifuncional tanque de tinta (imprime, copia e digitaliza)", year: 2024, img: img("inkjet-2350") },
    "inkjet-2350-pro": { id: "inkjet-2350-pro", model: "InkJet 2350 Pro", kind: "Multifuncional tanque de tinta com Wi-Fi e frente e verso", year: 2025, img: img("inkjet-2350-pro") },
    "inkjet-2355": { id: "inkjet-2355", model: "InkJet 2355", kind: "Multifuncional tanque de tinta", year: 2025, img: img("inkjet-2530") },
    "inkjet-2530": { id: "inkjet-2530", model: "InkJet 2530", kind: "Multifuncional tanque de tinta com Wi-Fi", year: 2025, img: img("inkjet-2530") },
    "inkjet-3250": { id: "inkjet-3250", model: "InkJet 3250", kind: "Multifuncional tanque de tinta para escritório", year: 2026, img: img("inkjet-2350") },
    "inkjet-3255": { id: "inkjet-3255", model: "InkJet 3255", kind: "Multifuncional tanque de tinta para escritório", year: 2026, img: img("inkjet-2305") },
  });

  // Arquivos do site de suporte. Só o primeiro é o certo para a impressora do laboratório.
  const files = Object.freeze({
    "drv-ij2350-full": { product: LAB, kind: "full", os: "win64", version: "3.1.0", date: "12/08/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix. Recomendado.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij2350-basic32": { product: LAB, kind: "basic", os: "win32", version: "3.0.4", date: "03/02/2026", title: "Driver básico", note: "Somente o driver de impressão.", compat: "Windows 10 (32 bits)" },
    "drv-ij2350-fw": { product: LAB, kind: "firmware", os: "any", version: "02.14", date: "20/09/2026", title: "Atualização de firmware", note: "Atualiza o programa interno da impressora.", compat: "Firmware da impressora" },
    "drv-ij2350-mac": { product: LAB, kind: "full", os: "mac", version: "3.1.0", date: "12/08/2026", title: "Pacote completo para Mac", note: "Driver e utilitário para computadores Apple.", compat: "macOS 13 ou mais recente" },
    "drv-ij2305-full": { product: "inkjet-2305", kind: "full", os: "win64", version: "2.8.1", date: "10/05/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij2530-full": { product: "inkjet-2530", kind: "full", os: "win64", version: "4.0.2", date: "28/09/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij2350pro-full": { product: "inkjet-2350-pro", kind: "full", os: "win64", version: "3.3.0", date: "02/10/2026", title: "Pacote completo de software e driver", note: "Driver de impressão e de digitalização.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij2300-full": { product: "inkjet-2300", kind: "full", os: "win64", version: "2.6.0", date: "14/01/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij2355-full": { product: "inkjet-2355", kind: "full", os: "win64", version: "3.1.2", date: "30/08/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij3250-full": { product: "inkjet-3250", kind: "full", os: "win64", version: "5.0.1", date: "15/10/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix.", compat: "Windows 11 e Windows 10 (64 bits)" },
    "drv-ij3255-full": { product: "inkjet-3255", kind: "full", os: "win64", version: "5.0.1", date: "15/10/2026", title: "Pacote completo de software e driver", note: "Driver de impressão + utilitário Printix.", compat: "Windows 11 e Windows 10 (64 bits)" },
  });
  const CORRECT = "drv-ij2350-full";

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const blank = () => ({ version: 1, usb: true, driver: null, previous: null, garbled: false, prints: 0, lastPrint: null });
  function load() {
    try { const v = JSON.parse(global.localStorage.getItem(KEY) || "null"); return v?.version === 1 ? { ...blank(), ...v } : blank(); }
    catch (_) { return blank(); }
  }
  let state = load();
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* continua em memória */ } }
  function publish(reason, detail = {}) {
    save();
    listeners.forEach((fn) => fn(clone(state), reason));
    O.events?.emit?.("drivers:changed", { reason, ...detail, state: clone(state) }, "drivers");
  }
  const emit = (type, detail = {}) => O.events?.emit?.(type, detail, "drivers");

  /** por que este arquivo não instala na impressora do laboratório (null = instala) */
  function problem(fileId) {
    const f = files[fileId];
    if (!f) return "missing";
    if (f.kind === "firmware") return "firmware";
    if (f.os === "mac") return "mac";
    if (f.product !== LAB) return "model";
    if (f.os === "win32") return "bits";
    return null;
  }
  const PROBLEM_TEXT = {
    firmware: ["Este arquivo é um firmware", "Firmware é o programa interno da própria impressora. Ele não instala o driver no Windows. Volte ao site e baixe o pacote completo de driver."],
    mac: ["Este arquivo é para macOS", "Arquivos .dmg são instaladores de computadores Apple. O Windows não consegue abrir. Escolha o sistema Windows 11 (64 bits) no site."],
    model: ["Nenhuma impressora compatível foi encontrada", "Este driver é de outro modelo. A impressora conectada é a InkJet 2350. Confira o modelo na etiqueta e baixe o driver dela."],
    bits: ["Este driver é para Windows de 32 bits", "O seu Windows é de 64 bits. Um driver de 32 bits não funciona nele. Baixe a versão de 64 bits."],
  };

  function install(fileId) {
    const p = problem(fileId);
    if (p) { emit("drivers:install-error", { fileId, reason: p }); return { ok: false, reason: p, text: PROBLEM_TEXT[p] }; }
    const f = files[fileId];
    state.previous = state.driver;
    state.driver = { fileId, version: f.version, date: f.date, provider: BRAND };
    state.garbled = false;
    publish("installed", { fileId });
    emit("drivers:installed", { fileId, version: f.version });
    return { ok: true };
  }
  function unplug() { if (state.usb) { state.usb = false; publish("unplug"); } }
  function connectUsb() { if (!state.usb) { state.usb = true; publish("usb"); emit("drivers:usb-connected", {}); } return true; }
  function rollback() {
    if (!state.previous) return { ok: false };
    state.driver = state.previous; state.previous = null; state.garbled = false;
    publish("rollback"); emit("drivers:rollback", { version: state.driver.version });
    return { ok: true };
  }
  function uninstall() { state.previous = null; state.driver = null; state.garbled = false; publish("uninstalled"); emit("drivers:uninstalled", {}); }
  /** imprime uma página de teste: precisa do cabo e de um driver que funcione */
  function testPrint() {
    const result = !state.usb ? "no-usb" : !state.driver ? "no-driver" : state.garbled ? "garbled" : "ok";
    state.prints++; state.lastPrint = { result, at: Date.now() };
    publish("print", { result });
    emit("drivers:test-print", { result });
    return result;
  }
  /** prepara o computador para cada missão (as primeiras começam sem driver) */
  function prepare(order) {
    state = blank();
    // impressora ligada no USB e sem driver; na missão 9 o cabo começa solto porque o instalador pede para conectar na hora certa
    state.usb = order !== 9;
    if (order >= 10) { state.driver = { fileId: CORRECT, version: "3.1.0", date: "12/08/2026", provider: BRAND }; }
    if (order === 12) { state.previous = state.driver; state.driver = { fileId: "beta", version: "3.2.0 (beta)", date: "01/11/2026", provider: BRAND }; state.garbled = true; }
    publish("prepared", { order });
  }
  function reset() { state = blank(); publish("reset"); }

  O.drivers = {
    BRAND, LAB, CORRECT, printers, files, PROBLEM_TEXT,
    get: () => clone(state), problem, install, connectUsb, unplug, rollback, uninstall, testPrint, prepare, reset, emit,
    deviceName: () => (state.driver ? `${BRAND} ${printers[LAB].model}` : "Dispositivo desconhecido"),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})(window);
