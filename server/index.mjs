// Servidor da arena: HTTP mínimo (saúde e arquivos em desenvolvimento) + WebSocket.
// Pensado para o plano gratuito do Render: 0,1 CPU e 5 GB de banda por mês.
// O site estático fica no GitHub Pages; aqui trafegam só as mensagens do jogo.
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { WebSocketServer } from "ws";
import { Room, newToken, hashToken, serverNow } from "./room.mjs";
import { serveStatic } from "./static.mjs";

const VERSION = "2.0.0";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export async function startServer({
  port = Number(process.env.PORT) || 3000,
  origins = (process.env.ALLOWED_ORIGINS || "https://fernandobalbino.github.io,http://localhost:3000,http://127.0.0.1:3000").split(",").map((o) => o.trim()).filter(Boolean),
  serveFiles = process.env.SERVE_STATIC !== "0",
  publicClientUrl = process.env.PUBLIC_CLIENT_URL || "https://fernandobalbino.github.io/LabirintoOnline/",
  tickRate = 20,
  quiet = false,
} = {}) {
  const rooms = new Map();
  const startedAt = Date.now();
  const totals = { connections: 0, messagesIn: 0 };

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/health") {
      let players = 0;
      const traffic = { moves: 0, corrections: 0, sent: 0, kb: 0 };
      for (const room of rooms.values()) {
        players += room.activePlayers().filter((p) => p.connected).length;
        traffic.moves += room.stats.moves; traffic.corrections += room.stats.corrections; traffic.sent += room.stats.sent; traffic.kb += Math.round(room.stats.bytes / 1024);
      }
      const cpu = process.cpuUsage();
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" });
      response.end(JSON.stringify({ ok: true, version: VERSION, rooms: rooms.size, players, traffic, cpuSeconds: Math.round((cpu.user + cpu.system) / 1e4) / 100, cpuUserSeconds: Math.round(cpu.user / 1e4) / 100, uptime: Math.round(process.uptime()), memoryMb: Math.round(process.memoryUsage().rss / 1048576) }));
      return;
    }
    if (serveFiles && serveStatic(request, response, ROOT)) return;
    response.writeHead(302, { location: publicClientUrl });
    response.end();
  });

  const wss = new WebSocketServer({ server, path: "/ws", perMessageDeflate: false, maxPayload: 64 * 1024 });

  const originAllowed = (origin) => !origin || origins.includes(origin);
  const makeCode = () => {
    let code;
    do code = Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    while (rooms.has(code));
    return code;
  };

  function sendJson(socket, message) { if (socket.readyState === 1) socket.send(JSON.stringify(message)); }

  function sendInitial(socket, room, player) {
    room.send(socket, room.stateFor(socket));
    if (room.status !== "LOBBY" && room.mapMessage) room.send(socket, room.mapMessage);
    if (player) { player.meDirty = true; player.view = new Set(); }
    room.scheduleFlush();
  }

  function attachTeacher(socket, room) {
    const old = room.teacher.socket;
    room.teacher.socket = socket;
    if (old && old !== socket) { try { old.close(4009, "Sessão aberta em outra aba."); } catch { /* já fechada */ } }
    socket.ctx.room = room;
    socket.ctx.role = "teacher";
    room.dirtyRoomState();
  }

  function attachPlayer(socket, room, player) {
    room.attach(player, socket);
    socket.ctx.room = room;
    socket.ctx.role = "student";
    socket.ctx.player = player;
  }

  const handlers = {
    create(socket, data) {
      if (socket.ctx.room) throw new Error("Você já está em uma sala.");
      if (rooms.size >= 60) throw new Error("Muitas salas abertas agora. Tente em instantes.");
      const token = newToken();
      const room = new Room({ code: makeCode(), teacherHash: hashToken(token), config: { ...(data.config || {}), name: data.name ?? data.config?.name } });
      rooms.set(room.code, room);
      attachTeacher(socket, room);
      sendInitial(socket, room, null);
      return { code: room.code, token, role: "teacher" };
    },
    join(socket, data) {
      if (socket.ctx.room) throw new Error("Você já está em uma sala.");
      const room = rooms.get(String(data.code || "").trim().toUpperCase());
      if (!room) throw new Error("Sala não encontrada. Confira o código com o professor.");
      const { player, token } = room.addPlayer(data.name);
      attachPlayer(socket, room, player);
      sendInitial(socket, room, player);
      return { code: room.code, token, role: "student", playerId: player.id };
    },
    resume(socket, data) {
      const room = rooms.get(String(data.code || "").trim().toUpperCase());
      if (!room) throw new Error("Esta sala não existe mais (o servidor pode ter reiniciado).");
      const digest = hashToken(data.token);
      if (digest === room.teacherHash) { attachTeacher(socket, room); sendInitial(socket, room, null); return { code: room.code, role: "teacher" }; }
      const player = [...room.players.values()].find((p) => p.tokenHash === digest);
      if (!player) throw new Error("Sessão inválida para esta sala.");
      attachPlayer(socket, room, player);
      sendInitial(socket, room, player);
      return { code: room.code, role: "student", playerId: player.id };
    },
    leave(socket) {
      const { room, player, role } = socket.ctx;
      if (room && player && room.status === "LOBBY") room.remove(player);
      if (room && player) room.detach(player, socket);
      if (room && role === "teacher" && room.teacher.socket === socket) { room.teacher.socket = null; room.dirtyRoomState(); }
      socket.ctx.room = null; socket.ctx.player = null; socket.ctx.role = null;
      return {};
    },
    cfg: (socket, data, room) => { room.configure(data.config); return {}; },
    redistribute: (socket, data, room) => { if (room.status !== "LOBBY") throw new Error("As equipes já estão definidas."); room.redistribute(); return {}; },
    start: (socket, data, room) => { room.start(); return {}; },
    finish: (socket, data, room) => { room.finish("manual"); return {}; },
    remove: (socket, data, room) => {
      const target = room.players.get(data.playerId);
      if (!target) throw new Error("Aluno não encontrado.");
      const targetSocket = target.socket;
      room.remove(target);
      if (targetSocket) { sendJson(targetSocket, { t: "removed" }); targetSocket.close(4010, "Removido pelo professor"); }
      return {};
    },
    release: (socket, data, room) => { const target = room.players.get(data.playerId); if (!target || target.removed) throw new Error("Aluno não encontrado."); room.release(target); return {}; },
    ans: (socket, data, room, player) => room.answer(player, data),
    skip: (socket, data, room, player) => room.skip(player, data),
    pow: (socket, data, room, player) => { room.choose(player, data); return {}; },
    watch: (socket, data, room, player) => { player.watch = typeof data.playerId === "string" ? data.playerId : null; player.view = new Set(); room.scheduleFlush(); return {}; },
  };
  // Somente para testes locais (LAB_DEBUG=1): aproxima alunos e força desafios.
  if (process.env.LAB_DEBUG === "1") {
    handlers.debug = (socket, data, room) => {
      const target = room.players.get(data.playerId);
      if (data.action === "near") { const other = room.players.get(data.otherId); Object.assign(target, { x: other.x, y: other.y }); room.forceStop(target); }
      if (data.action === "question") { target.remaining = 0; if (data.challenge) target.deck.unshift(data.challenge); }
      if (data.action === "release" && target.state === "ANSWERING") room.release(target);
      if (data.action === "chest") { target.chests.unshift({ id: `dbg${Date.now()}`, x: Math.floor(target.x / 36), y: Math.floor(target.y / 36), opened: false }); }
      return {};
    };
  }
  const TEACHER_ONLY = new Set(["cfg", "redistribute", "start", "finish", "remove", "release"]);
  const PLAYER_ONLY = new Set(["ans", "skip", "pow", "watch"]);
  const NO_ROOM = new Set(["create", "join", "resume", "leave"]);

  wss.on("connection", (socket, request) => {
    if (!originAllowed(request.headers.origin)) { socket.close(4003, "Origem não autorizada"); return; }
    totals.connections += 1;
    socket.ctx = { room: null, role: null, player: null, window: 0, count: 0 };
    sendJson(socket, { t: "hello", serverTime: serverNow(), version: VERSION });

    socket.on("message", (raw, isBinary) => {
      if (isBinary) return;
      totals.messagesIn += 1;
      const ctx = socket.ctx;
      const second = Math.floor(performance.now() / 1000);
      if (second !== ctx.window) { ctx.window = second; ctx.count = 0; }
      if (++ctx.count > 90) return;
      const text = raw.toString();
      let data;
      try { data = JSON.parse(text); } catch { return; }
      if (Array.isArray(data)) {
        if (ctx.player && ctx.room) ctx.room.onMove(ctx.player, data);
        return;
      }
      if (!data || typeof data.t !== "string") return;
      if (data.t === "ping") {
        if (ctx.player && Number.isFinite(data.rtt)) ctx.player.owd = Math.max(5, Math.min(300, data.rtt / 2));
        sendJson(socket, { t: "pong", c: data.c, s: serverNow() });
        if (ctx.room) ctx.room.lastActivity = Date.now();
        return;
      }
      const handler = handlers[data.t];
      if (!handler) return;
      const reply = (result) => sendJson(socket, { t: "ack", rid: data.rid, ...result });
      try {
        const room = ctx.room;
        if (!NO_ROOM.has(data.t) && !room) throw new Error("Entre em uma sala primeiro.");
        if (TEACHER_ONLY.has(data.t) && ctx.role !== "teacher") throw new Error("Somente o professor pode fazer isso.");
        if (PLAYER_ONLY.has(data.t) && (!ctx.player || ctx.player.removed)) throw new Error("Operação não autorizada.");
        const result = handler(socket, data, room, ctx.player);
        reply({ ok: true, ...result });
      } catch (error) {
        reply({ ok: false, error: error.message || "Não foi possível concluir." });
      }
    });

    socket.on("close", () => {
      const { room, player, role } = socket.ctx;
      if (!room) return;
      if (player) room.detach(player, socket);
      if (role === "teacher" && room.teacher.socket === socket) { room.teacher.socket = null; room.dirtyRoomState(); }
    });
    socket.on("error", () => {});
  });

  let previous = performance.now();
  const tickTimer = setInterval(() => {
    const current = performance.now();
    const dt = Math.min(0.15, (current - previous) / 1000);
    previous = current;
    for (const room of rooms.values()) if (room.status === "PLAYING") room.tick(dt);
  }, Math.round(1000 / tickRate));

  const cleanupTimer = setInterval(() => {
    const limit = Date.now() - 2 * 60 * 60 * 1000;
    for (const [code, room] of rooms) {
      const connected = room.teacher.socket || room.activePlayers().some((p) => p.connected);
      if (connected) room.lastActivity = Date.now();
      else if (room.lastActivity < limit || ((room.status === "FINISHED" || room.status === "CANCELLED") && room.lastActivity < Date.now() - 20 * 60 * 1000)) rooms.delete(code);
    }
  }, 60_000);

  await new Promise((resolve) => server.listen(port, "0.0.0.0", resolve));
  if (!quiet) console.log(`Labirinto da Informática ${VERSION} na porta ${server.address().port}`);

  async function close() {
    clearInterval(tickTimer);
    clearInterval(cleanupTimer);
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }
  return { server, rooms, close, port: server.address().port, totals, startedAt };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const instance = await startServer();
  for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, async () => { await instance.close(); process.exit(0); });
}
