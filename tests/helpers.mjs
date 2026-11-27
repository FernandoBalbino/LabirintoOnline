import WebSocket from "ws";

export class TestClient {
  constructor(url) {
    this.url = url;
    this.messages = [];
    this.waiters = [];
    this.rid = 0;
    this.pending = new Map();
    this.anchors = new Map();
    this.state = {};
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on("open", resolve);
      this.ws.on("error", reject);
      this.ws.on("message", (raw) => this.receive(JSON.parse(raw.toString())));
    });
  }
  receive(data) {
    this.messages.push(data);
    if (Array.isArray(data)) {
      if (data[0] === 1) for (let i = 2; i < data.length; i += 8) this.anchors.set(data[i], { at: data[1], x: data[i + 1], y: data[i + 2], ix: data[i + 3], iy: data[i + 4], spd: data[i + 5], flags: data[i + 6], lim: data[i + 7] });
      if (data[0] === 2) for (const id of data.slice(1)) this.anchors.delete(id);
    } else if (data.t === "ack") {
      this.pending.get(data.rid)?.(data);
      this.pending.delete(data.rid);
    } else {
      this.state[data.t] = data;
    }
    this.waiters = this.waiters.filter((waiter) => !waiter(data));
  }
  request(t, payload = {}) {
    const rid = ++this.rid;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout ${t}`)), 4000);
      this.pending.set(rid, (data) => { clearTimeout(timer); data.ok ? resolve(data) : reject(new Error(data.error)); });
      this.ws.send(JSON.stringify({ t, rid, ...payload }));
    });
  }
  waitFor(predicate, timeout = 4000) {
    const found = this.messages.find(predicate);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("waitFor timeout")), timeout);
      this.waiters.push((data) => { if (predicate(data)) { clearTimeout(timer); resolve(data); return true; } return false; });
    });
  }
  move(x, y, ix, iy) { this.ws.send(JSON.stringify([++this.rid, x, y, ix, iy, this.state.me?.tv ?? this.tv])); }
  close() { this.ws.close(); }
}
