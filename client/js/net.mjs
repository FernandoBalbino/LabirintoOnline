// Conexão WebSocket com reconexão automática, pedidos com confirmação e relógio sincronizado.
import { SERVER_HTTP, SERVER_WS } from "./config.mjs";

export class Net {
  constructor({ onMessage, onStatus }) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.ws = null;
    this.open = false;
    this.wanted = false;
    this.rid = 0;
    this.pending = new Map();
    this.retryDelay = 600;
    this.offset = 0;
    this.rtt = 120;
    this.samples = [];
    this.openListeners = new Set();
    this.pingTimer = null;
  }

  serverNow() { return performance.now() + this.offset; }

  async wake() {
    // O plano gratuito do Render "dorme" após 15 minutos sem uso: este pedido o acorda.
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      await fetch(`${SERVER_HTTP}/health`, { cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  }

  connect() {
    this.wanted = true;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    const ws = new WebSocket(SERVER_WS);
    this.ws = ws;
    ws.addEventListener("open", () => {
      if (ws !== this.ws) return;
      this.open = true;
      this.retryDelay = 600;
      this.samples = [];
      this.onStatus?.("online");
      this.ping();
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.ping(), 2000);
      for (const listener of this.openListeners) listener();
    });
    ws.addEventListener("message", (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!Array.isArray(data)) {
        if (data.t === "pong") { this.handlePong(data); return; }
        if (data.t === "hello") { this.offset = data.serverTime - performance.now(); }
        if (data.t === "ack") {
          const entry = this.pending.get(data.rid);
          if (entry) { this.pending.delete(data.rid); clearTimeout(entry.timer); data.ok ? entry.resolve(data) : entry.reject(Object.assign(new Error(data.error || "Não foi possível concluir."), { server: true })); }
          return;
        }
      }
      this.onMessage(data);
    });
    ws.addEventListener("close", (event) => {
      if (ws !== this.ws) return;
      this.open = false;
      clearInterval(this.pingTimer);
      for (const [rid, entry] of this.pending) { clearTimeout(entry.timer); entry.reject(new Error("Conexão perdida. Tentando voltar…")); this.pending.delete(rid); }
      if (event.code === 4009) { this.wanted = false; this.onStatus?.("replaced"); return; }
      if (event.code === 4010) { this.wanted = false; this.onStatus?.("removed"); return; }
      this.onStatus?.("offline");
      if (this.wanted) {
        setTimeout(() => this.connect(), this.retryDelay);
        this.retryDelay = Math.min(5000, this.retryDelay * 1.6);
      }
    });
    ws.addEventListener("error", () => {});
  }

  whenOpen(timeout = 75_000) {
    if (this.open) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const done = () => { clearTimeout(timer); this.openListeners.delete(done); resolve(); };
      const timer = setTimeout(() => { this.openListeners.delete(done); reject(new Error("O servidor não respondeu. Verifique a internet e tente de novo.")); }, timeout);
      this.openListeners.add(done);
    });
  }

  onOpen(listener) { this.openListeners.add(listener); return () => this.openListeners.delete(listener); }

  request(t, payload = {}, timeout = 8000) {
    if (!this.open) return Promise.reject(new Error("Sem conexão com o servidor. Aguarde a reconexão."));
    const rid = ++this.rid;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(rid); reject(new Error("O servidor demorou para responder. Tente de novo.")); }, timeout);
      this.pending.set(rid, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ t, rid, ...payload }));
    });
  }

  send(data) { if (this.open) this.ws.send(JSON.stringify(data)); }

  ping() { this.send({ t: "ping", c: performance.now(), rtt: Math.round(this.rtt) }); }

  handlePong({ c, s }) {
    const now = performance.now();
    const rtt = now - c;
    this.samples.push({ rtt, offset: s - (c + rtt / 2) });
    if (this.samples.length > 10) this.samples.shift();
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.rtt = this.samples.reduce((sum, sample) => sum + sample.rtt, 0) / this.samples.length;
    // Ajuste suave para não "teletransportar" o que está na tela.
    this.offset += (best.offset - this.offset) * (this.samples.length < 3 ? 1 : 0.3);
  }

  close() {
    this.wanted = false;
    clearInterval(this.pingTimer);
    try { this.ws?.close(1000, "saída"); } catch { /* já fechada */ }
    this.open = false;
  }
}
