(function createAudioState(global) {
  "use strict";

  // Estado do som do notebook do laboratório (Vertex Note 14, chip de áudio Sonora; marcas fictícias).
  // Três famílias de problema: driver faltando, dispositivo desabilitado e mudo ou saída errada.
  const O = global.OSLab = global.OSLab || {};
  const KEY = "oslab.audio.state.v1";
  const MODEL = "vn14";
  const CORRECT = "aud-vn14-w11";
  const CODEC = "Sonora High Definition Audio";
  const listeners = new Set();

  const products = Object.freeze({
    vn14: { id: "vn14", name: "Vertex Note 14", code: "VN14-2026", kind: "Notebook 14\" · Intel Core · 8 GB", tone: "#9aa3b2" },
    vn14pro: { id: "vn14pro", name: "Vertex Note 14 Pro", code: "VN14P-2026", kind: "Notebook 14\" · tela 2,8K · áudio Studio", tone: "#4b5563" },
    vn15: { id: "vn15", name: "Vertex Note 15", code: "VN15-2025", kind: "Notebook 15,6\" · teclado numérico", tone: "#c0c6d0" },
    vb14: { id: "vb14", name: "Vertex Book 14", code: "VB14-2024", kind: "Notebook leve 14\" · uso escolar", tone: "#7c8aa5" },
  });
  // Arquivos do site de suporte. Só o primeiro serve para o notebook do laboratório.
  const files = Object.freeze({
    "aud-vn14-w11": { product: "vn14", cat: "Áudio", os: "win64", version: "6.0.9612.1", date: "18/07/2026", title: "Driver de áudio Sonora High Definition", note: "Driver do chip de som: alto-falantes, fone e microfone.", compat: "Windows 11 (64 bits)" },
    "aud-vn14-w10x86": { product: "vn14", cat: "Áudio", os: "win32", version: "6.0.8899.1", date: "02/03/2025", title: "Driver de áudio Sonora High Definition", note: "Versão para sistemas de 32 bits.", compat: "Windows 10 (32 bits)" },
    "app-vn14-console": { product: "vn14", cat: "Aplicativos", os: "win64", version: "1.4.2", date: "05/09/2026", title: "Sonora Audio Console", note: "Aplicativo de equalizador e efeitos. Precisa do driver de áudio instalado.", compat: "Windows 11 (64 bits)" },
    "vid-vn14-w11": { product: "vn14", cat: "Vídeo", os: "win64", version: "31.0.101.5590", date: "21/08/2026", title: "Driver de vídeo Intel UHD Graphics", note: "Controla a tela e o HDMI.", compat: "Windows 11 (64 bits)" },
    "bios-vn14": { product: "vn14", cat: "BIOS e firmware", os: "any", version: "1.12", date: "30/09/2026", title: "Atualização de BIOS", note: "Programa da placa-mãe. Só atualize se o suporte pedir.", compat: "Notebook Vertex Note 14" },
    "aud-vn14pro-w11": { product: "vn14pro", cat: "Áudio", os: "win64", version: "7.1.2", date: "10/10/2026", title: "Driver de áudio Sonora Studio", note: "Driver do áudio Studio do modelo Pro.", compat: "Windows 11 (64 bits)" },
    "aud-vn15-w11": { product: "vn15", cat: "Áudio", os: "win64", version: "6.0.9580.1", date: "11/06/2026", title: "Driver de áudio Sonora High Definition", note: "Driver do chip de som do Note 15.", compat: "Windows 11 (64 bits)" },
    "aud-vb14-w11": { product: "vb14", cat: "Áudio", os: "win64", version: "6.0.9101.1", date: "14/01/2026", title: "Driver de áudio Sonora High Definition", note: "Driver do chip de som do Book 14.", compat: "Windows 11 (64 bits)" },
  });
  const PROBLEM_TEXT = {
    model: ["Este driver é de outro notebook", "O instalador não encontrou o hardware compatível. Este computador é um Vertex Note 14: baixe o driver da página dele."],
    bits: ["Este driver é para Windows de 32 bits", "O Windows deste computador é de 64 bits. Baixe a versão para Windows 11 (64 bits)."],
    app: ["Este arquivo é um aplicativo, não o driver", "O Sonora Audio Console só ajusta equalizador e efeitos e precisa do driver já instalado. Baixe o Driver de áudio."],
    video: ["Este é o driver de vídeo", "Ele controla a tela, não o som. Procure na categoria Áudio."],
    bios: ["Esta é uma atualização de BIOS", "A BIOS é o programa da placa-mãe. Atualizar sem necessidade é arriscado e não resolve o som. Baixe o driver de áudio."],
  };
  function problem(fileId) {
    const f = files[fileId];
    if (!f) return "missing";
    if (f.cat === "Vídeo") return "video";
    if (f.cat === "BIOS e firmware") return "bios";
    if (f.cat === "Aplicativos") return "app";
    if (f.product !== MODEL) return "model";
    if (f.os === "win32") return "bits";
    return null;
  }

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const installed = () => ({ fileId: CORRECT, version: files[CORRECT].version, date: files[CORRECT].date, provider: "Sonora" });
  // estado padrão: tudo funcionando (o som só quebra quando uma missão prepara o cenário)
  const blank = () => ({ version: 1, driver: installed(), restartPending: false, codecDisabled: false, spkDisabled: false, micDisabled: false, camDisabled: false, hdmi: false, output: "speakers", appMuted: false, appVolume: 100 });
  function load() { try { const v = JSON.parse(global.localStorage.getItem(KEY) || "null"); return v?.version === 1 ? { ...blank(), ...v } : blank(); } catch (_) { return blank(); } }
  let state = load();
  let local = { volume: 60, muted: false }; // usado só quando o OSLab não tem o controle de volume (testes)
  const system = () => O.shell?.getAudioState?.() || local;
  function setSystem(volume, muted) {
    if (O.shell?.setVolume) O.shell.setVolume(volume, muted);
    else { local = { volume, muted }; O.events?.emit?.("volume:changed", { volume, muted }, "audio"); }
  }
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* continua em memória */ } }
  const emit = (type, detail = {}) => O.events?.emit?.(type, detail, "audio");
  function publish(reason) {
    save();
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap, reason));
    emit("audio:changed", { reason });
  }

  const driverActive = () => Boolean(state.driver && !state.restartPending);
  function outputs() {
    const list = [];
    if (driverActive() && !state.codecDisabled) list.push({ id: "speakers", name: "Alto-falantes", detail: CODEC, enabled: !state.spkDisabled });
    if (state.hdmi) list.push({ id: "hdmi", name: "TV da sala", detail: "Intel(R) Display Audio (HDMI)", enabled: true });
    return list;
  }
  function snapshot() {
    const sys = system(), all = outputs(), usable = all.filter((o) => o.enabled);
    const current = usable.find((o) => o.id === state.output) || usable[0] || null;
    const micPresent = driverActive() && !state.codecDisabled;
    const muted = Boolean(sys.muted) || Number(sys.volume) === 0;
    const reason = !state.driver ? "nodriver" : state.restartPending ? "restart" : state.codecDisabled ? "disabled" : !current ? "spk-disabled"
      : current.id !== "speakers" ? "wrong-output" : muted ? "muted" : state.appMuted || state.appVolume === 0 ? "app-muted" : null;
    return {
      ...clone(state), outputs: all, current, volume: Number(sys.volume), muted: Boolean(sys.muted),
      micPresent, mic: micPresent && !state.micDisabled, audible: !reason, reason,
      tray: !current ? "nodevice" : muted ? "muted" : "ok",
    };
  }

  function install(fileId) {
    const p = problem(fileId);
    if (p) { emit("audio:install-error", { fileId, reason: p }); return { ok: false, reason: p, text: PROBLEM_TEXT[p] }; }
    state.driver = { fileId, version: files[fileId].version, date: files[fileId].date, provider: "Sonora" };
    state.restartPending = true;
    publish("installed"); emit("audio:installed", { fileId });
    return { ok: true };
  }
  function restart() { const was = state.restartPending; state.restartPending = false; publish("restarted"); emit("audio:restarted", { applied: was }); }
  /** habilita ou desabilita: codec (controlador), spk (alto-falantes), mic (microfone) ou cam (câmera) */
  function setEnabled(device, enabled, source = "devmgr") {
    const flag = { codec: "codecDisabled", spk: "spkDisabled", mic: "micDisabled", cam: "camDisabled" }[device];
    if (!flag) return;
    state[flag] = !enabled;
    publish("enabled"); emit("audio:device-enabled", { device, enabled: Boolean(enabled), source });
  }
  function setOutput(id) { state.output = id; publish("output"); emit("audio:output-selected", { output: snapshot().current?.id || null }); }
  function setAppMuted(muted) { state.appMuted = Boolean(muted); publish("app"); emit("audio:app-mute", { muted: state.appMuted }); }
  function setAppVolume(v) { state.appVolume = Math.max(0, Math.min(100, Number(v) || 0)); publish("app"); emit("audio:app-volume", { volume: state.appVolume }); }
  function test() { const s = snapshot(); emit("audio:test", { audible: s.audible, reason: s.reason, output: s.current?.id || null }); return s; }
  function micTest() { const s = snapshot(); emit("audio:mic-test", { ok: s.mic }); return s; }

  /** prepara o notebook para cada missão */
  function prepare(order) {
    state = blank();
    if (order <= 5) state.driver = null;
    if (order === 6) state.driver = null;
    if (order === 3) state.camDisabled = true;
    if (order === 7) state.codecDisabled = true;
    if (order === 8) state.spkDisabled = true;
    if (order === 9) state.micDisabled = true;
    if (order === 11) state.appMuted = true;
    if (order === 12) { state.hdmi = true; state.output = "hdmi"; }
    setSystem(60, order === 10);
    publish("prepared");
  }
  function reset() { state = blank(); publish("reset"); }
  O.events?.subscribe?.("volume:changed", () => { listeners.forEach((fn) => fn(snapshot(), "volume")); emit("audio:changed", { reason: "volume" }); });

  O.audio = {
    MODEL, CORRECT, CODEC, products, files, PROBLEM_TEXT, problem,
    get: snapshot, install, restart, setEnabled, setOutput, setAppMuted, setAppVolume, setSystem, test, micTest, prepare, reset, emit,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})(window);
