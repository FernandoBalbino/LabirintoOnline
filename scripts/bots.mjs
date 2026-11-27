// Robôs que entram numa sala e andam pelo labirinto como alunos de verdade.
// Uso: node scripts/bots.mjs --url ws://localhost:3000/ws --code ABCDE --bots 22 [--near p1] [--seconds 120]
// Mede o atraso das âncoras recebidas (idade = horário do servidor - horário da âncora) e o volume de dados.
import WebSocket from "ws";
import { advance, gridFromString, isWall, toCell } from "../shared/physics.mjs";

import { PLAYER_RADIUS, PLAYER_SPEED } from "../shared/constants.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, list) => (value.startsWith("--") ? [...pairs, [value.slice(2), list[index + 1]]] : pairs), []));
const url = args.url || "ws://localhost:3000/ws";
const count = Number(args.bots || 1);
const seconds = Number(args.seconds || 60);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const stats = { anchors: 0, ageSum: 0, ageMax: 0, bytes: 0, messages: 0, corrections: 0 };

function bot(index) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers: { origin: "http://localhost:3000" } });
    let rid = 0;
    let me = null;
    let grid = null;
    let body = null;
    let dir = [0, 0];
    let offset = 0;
    let seq = 0;
    let lastSend = 0;
    const pending = new Map();
    const request = (t, payload = {}) => new Promise((ok, fail) => { const id = ++rid; pending.set(id, (m) => (m.ok ? ok(m) : fail(new Error(m.error)))); ws.send(JSON.stringify({ t, rid: id, ...payload })); });
    const now = () => performance.now() + offset;
    ws.on("message", (raw) => {
      const text = raw.toString();
      stats.bytes += text.length;
      stats.messages += 1;
      const m = JSON.parse(text);
      if (Array.isArray(m)) {
        if (m[0] === 1) for (let i = 2; i + 8 <= m.length; i += 8) { const age = now() - m[1]; stats.anchors += 1; stats.ageSum += age; stats.ageMax = Math.max(stats.ageMax, age); }
        return;
      }
      if (m.t === "hello") offset = m.serverTime - performance.now();
      if (m.t === "ack") { pending.get(m.rid)?.(m); pending.delete(m.rid); }
      if (m.t === "map") grid = gridFromString(m.w, m.h, m.grid);
      if (m.t === "me") { if (!me || me.tv !== m.tv) body = { x: m.x, y: m.y, dir: "down" }; me = m; }
      if (m.t === "cor") { stats.corrections += 1; body = { x: m.x, y: m.y, dir: "down" }; if (me) me.tv = m.tv; }
    });
    ws.on("open", async () => {
      try {
        await request("join", { code: args.code, name: `Robô ${String(index + 1).padStart(2, "0")}` });
      } catch (error) { console.error("join", error.message); ws.close(); resolve(); return; }
      let last = performance.now();
      const loop = setInterval(async () => {
        const t = performance.now();
        const dt = (t - last) / 1000;
        last = t;
        if (!grid || !me || !body) return;
        if (args.near && !bot.placed) { bot.placed = true; await request("debug", { action: "near", playerId: me.id, otherId: args.near }).catch(() => {}); return; }
        if (me.challenge) { if (!me.answering) { me.answering = true; setTimeout(() => request("debug", { action: "release", playerId: me.id }).catch(() => {}), 2500 + Math.random() * 4000); } return; }
        if (me.state !== "EXPLORING" && me.state !== "INFECTED") return;
        const c = toCell(body.x, body.y);
        const blocked = body.stuck;
        let next = dir;
        if (blocked || (dir[0] === 0 && dir[1] === 0) || Math.random() < 0.01) {
          const options = DIRS.filter(([dx, dy]) => !isWall(grid, c.x + dx, c.y + dy));
          next = options[Math.floor(Math.random() * options.length)] || [0, 0];
        }
        const changed = next[0] !== dir[0] || next[1] !== dir[1];
        dir = next;
        if (changed || t - lastSend > 300) { ws.send(JSON.stringify([++seq, Math.round(body.x * 10) / 10, Math.round(body.y * 10) / 10, dir[0], dir[1], me.tv])); lastSend = t; }
        body.stuck = !advance(grid, body, dir[0], dir[1], me.state === "INFECTED" ? me.virusSpeed : PLAYER_SPEED, dt, PLAYER_RADIUS);
      }, 16);
      setTimeout(() => { clearInterval(loop); ws.close(); resolve(); }, seconds * 1000);
    });
    ws.on("error", (error) => { console.error("ws", error.message); resolve(); });
  });
}

const started = Date.now();
const report = setInterval(() => {
  const elapsed = (Date.now() - started) / 1000;
  console.log(`${elapsed.toFixed(0)}s • âncoras ${stats.anchors} • idade média ${(stats.ageSum / Math.max(1, stats.anchors)).toFixed(0)} ms (máx ${stats.ageMax.toFixed(0)}) • ${(stats.bytes / 1024 / elapsed).toFixed(1)} KB/s recebidos por todos os robôs • correções ${stats.corrections}`);
}, 5000);
await Promise.all(Array.from({ length: count }, (_, i) => bot(i)));
clearInterval(report);
console.log("fim");
