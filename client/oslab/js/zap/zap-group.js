(function createZapGroup(global) {
  "use strict";

  // Grupo da turma em tempo real (servidor no Render). É opcional: sem internet ou com o servidor
  // dormindo, só o grupo fica offline; a trilha do WhatsApp continua 100% local.
  const O = global.OSLab = global.OSLab || {};
  const NAME = "2º Técnico em Manutenção e Suporte de Informática";
  // ?zapgrupo=ws://localhost:8787 aponta para um servidor de teste.
  const SERVER = new URLSearchParams(global.location?.search || "").get("zapgrupo") || "wss://oslab-zap-grupo.onrender.com";
  const KEEP = 200;
  const listeners = new Set();
  const state = { status: "off", messages: [], members: [], unread: 0 };
  let socket = null;
  let wanted = null;
  let focused = false;
  let retry = 0;
  let retryTimer = null;

  const clientId = (() => {
    try {
      let id = global.localStorage.getItem("oslab.zap.client");
      if (!id) { id = global.crypto?.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(16).slice(2)}`; global.localStorage.setItem("oslab.zap.client", id); }
      return id;
    } catch (_) { return `c-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  })();

  function emit(type, detail = {}) { listeners.forEach((listener) => { try { listener(type, detail); } catch (error) { console.error(error); } }); }
  function setStatus(status) { if (state.status !== status) { state.status = status; emit("status", { status }); } }
  function schedule() {
    global.clearTimeout(retryTimer);
    if (!wanted) return;
    // O Render gratuito pode levar ~1 min para acordar: tenta de novo com espera crescente, até 30 s.
    retryTimer = global.setTimeout(() => connect(wanted), Math.min(30000, 2000 * 2 ** retry++));
  }
  function receive(data) {
    if (data.t === "welcome") {
      state.messages = Array.isArray(data.history) ? data.history.slice(-KEEP) : [];
      state.members = Array.isArray(data.members) ? data.members : [];
      setStatus("online");
      emit("history");
    } else if (data.t === "members") {
      state.members = Array.isArray(data.members) ? data.members : [];
      emit("members");
    } else if (data.t === "msg" && data.message) {
      state.messages.push(data.message);
      if (state.messages.length > KEEP) state.messages.shift();
      const mine = data.message.from?.id === clientId;
      if (!mine && !focused) state.unread += 1;
      emit("message", { message: data.message, mine });
    } else if (data.t === "slow") emit("slow");
  }
  function connect(profile) {
    wanted = profile || wanted;
    if (socket || !wanted) return;
    if (!("WebSocket" in global) || global.navigator?.onLine === false) { setStatus("offline"); schedule(); return; }
    setStatus("connecting");
    try { socket = new global.WebSocket(SERVER); } catch (_) { socket = null; setStatus("offline"); schedule(); return; }
    socket.onopen = () => { retry = 0; socket.send(JSON.stringify({ t: "join", id: clientId, name: wanted.name, phone: wanted.phone })); };
    socket.onmessage = (event) => { try { receive(JSON.parse(event.data)); } catch (_) { /* mensagem inválida */ } };
    socket.onclose = () => { socket = null; if (wanted) { setStatus("offline"); schedule(); } else setStatus("off"); };
    socket.onerror = () => {};
  }
  function stop() {
    wanted = null;
    global.clearTimeout(retryTimer);
    retry = 0;
    if (socket) { socket.onclose = null; socket.close(); socket = null; }
    setStatus("off");
  }
  function send(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 500);
    if (!clean || state.status !== "online" || socket?.readyState !== 1) return false;
    socket.send(JSON.stringify({ t: "msg", text: clean, cid: `${Date.now()}` }));
    return true;
  }

  global.addEventListener?.("online", () => { if (wanted && !socket) { retry = 0; connect(wanted); } });

  O.zapGroup = {
    ID: "grupo", NAME, clientId, connect, stop, send,
    get: () => ({ status: state.status, unread: state.unread, members: state.members.slice(), messages: state.messages.slice() }),
    setFocus(value) {
      focused = Boolean(value);
      if (focused && state.unread) { state.unread = 0; emit("read"); }
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
})(window);
