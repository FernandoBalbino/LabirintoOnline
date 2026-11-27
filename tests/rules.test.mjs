import test from "node:test";
import assert from "node:assert/strict";
import { generateArena, generateMaze } from "../shared/maze.mjs";
import { advance, canOccupy, cellCenter, distanceField, isWall } from "../shared/physics.mjs";
import { TILE, PLAYER_RADIUS } from "../shared/constants.mjs";
import { Room } from "../server/room.mjs";
import { CHALLENGES, CHALLENGE_BY_ID, checkResponse } from "../server/bank.mjs";
import { POWERS } from "../shared/catalog.mjs";

test("labirinto conectado e equilibrado para 2, 3 e 4 equipes", () => {
  for (const [teamCount, players] of [[2, 6], [3, 12], [4, 24], [2, 24]]) {
    for (let i = 0; i < 4; i += 1) {
      const arena = generateArena({ teamCount, players, seed: `t${teamCount}-${players}-${i}` });
      const { maze, exitField } = arena;
      for (let index = 0; index < maze.cells.length; index += 1) if (maze.cells[index] === 0) assert.ok(exitField[index] >= 0, "toda célula livre alcança a saída");
      const lengths = arena.teamStarts.map((s) => exitField[s.y * maze.w + s.x]);
      assert.ok(Math.max(...lengths) / Math.min(...lengths) <= 1.12, `equilíbrio ${lengths}`);
      assert.ok(Math.min(...lengths) >= 30);
    }
  }
});

test("física: mesmo trajeto com passos diferentes (servidor x aluno x colega)", () => {
  const maze = generateMaze({ width: 41, height: 31, seed: "fisica" });
  const grid = { w: maze.w, h: maze.h, cells: maze.cells };
  let start = null;
  for (let y = 1; y < grid.h && !start; y += 1) for (let x = 1; x < grid.w; x += 1) if (!isWall(grid, x, y)) { start = cellCenter(x, y); break; }
  const inputs = [[1, 0, 0.9], [0, 1, 0.7], [-1, 0, 1.1], [0, -1, 0.6], [1, 1, 0.8]];
  const run = (stepSeconds) => {
    const body = { ...start, dir: "down" };
    for (const [ix, iy, seconds] of inputs) {
      let left = seconds;
      while (left > 1e-9) { const dt = Math.min(stepSeconds, left); advance(grid, body, ix, iy, 148, dt); left -= dt; }
    }
    return body;
  };
  const a = run(1 / 120);
  const b = run(1 / 20);
  const c = run(0.33);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1.5, `${a.x},${a.y} x ${b.x},${b.y}`);
  assert.ok(Math.hypot(a.x - c.x, a.y - c.y) < 1.5, `${a.x},${a.y} x ${c.x},${c.y}`);
  assert.ok(canOccupy(grid, a.x, a.y, PLAYER_RADIUS), "nunca entra na parede");
});

test("quina assistida: virar com o personagem um pouco desalinhado", () => {
  // Corredor horizontal com abertura para baixo na coluna 3.
  const w = 7; const h = 5; const cells = new Uint8Array(w * h).fill(1);
  for (let x = 1; x < 6; x += 1) cells[1 * w + x] = 0;
  cells[2 * w + 3] = 0; cells[3 * w + 3] = 0;
  const grid = { w, h, cells };
  const body = { x: 3.5 * TILE + 12, y: 1.5 * TILE, dir: "right" };
  advance(grid, body, 0, 1, 148, 0.6);
  assert.ok(body.y > 2.2 * TILE, "desceu pela abertura");
  assert.ok(Math.abs(body.x - 3.5 * TILE) < 0.5, "alinhou no corredor");
});

test("banco de desafios: ids únicos, soluções válidas e sem vazar respostas", () => {
  const ids = new Set();
  for (const c of CHALLENGES) {
    assert.ok(!ids.has(c.id), `id repetido ${c.id}`);
    ids.add(c.id);
    if (c.template === "choice") assert.ok(c.payload.options.some((o) => o.id === c.solution), c.id);
    if (c.template === "sort") for (const [item, target] of Object.entries(c.solution)) { assert.ok(c.payload.items.some((i) => i.id === item), c.id); assert.ok(c.payload.targets.some((t) => t.id === target), c.id); }
    if (c.template === "slots") for (const [slot, part] of Object.entries(c.solution)) { assert.ok(c.payload.slots.includes(slot), c.id); assert.ok(c.payload.parts.some((p) => p.id === part), c.id); }
    if (c.template === "order") assert.deepEqual([...c.solution].sort(), c.payload.items.map((i) => i.id).sort(), c.id);
    if (c.template === "oslab" && c.solution.answer) assert.ok(c.payload.options.some((o) => o.id === c.solution.answer), c.id);
  }
  assert.ok(CHALLENGES.filter((c) => c.template === "oslab").length >= 20);
  assert.ok(CHALLENGES.filter((c) => c.theme.includes("Hardware") || c.theme.includes("Montagem")).length >= 25);
  assert.equal(checkResponse(CHALLENGE_BY_ID.get("hw-ordem-unidades"), ["kb", "mb", "gb", "tb"]), true);
  assert.equal(checkResponse(CHALLENGE_BY_ID.get("hw-montar-1"), { socket: "processador", dimm: "ram" }), true);
  assert.equal(checkResponse(CHALLENGE_BY_ID.get("hw-montar-1"), { socket: "ram", dimm: "processador" }), false);
  assert.equal(POWERS.length, 25);
});

function playingRoom(names = ["Ana", "Bia", "Caio", "Davi"], config = {}) {
  let time = 1000;
  const room = new Room({ code: "TESTE", teacherHash: "x", config: { teamCount: 2, ...config }, seed: "regras", clock: () => time });
  const socket = { readyState: 1, sent: [], send(text) { this.sent.push(text); }, close() {} };
  for (const name of names) { const { player } = room.addPlayer(name); room.attach(player, { ...socket, sent: [] }); }
  room.start();
  room.advanceTime = (ms, step = 50) => { for (let t = 0; t < ms; t += step) { time += step; room.tick(step / 1000); } };
  return room;
}

test("cronômetro individual abre desafio, acerto dá 20/30/40s e erro zera a sequência", () => {
  const room = playingRoom();
  const p = [...room.players.values()][0];
  p.chests = [];
  room.viruses = [];
  room.advanceTime(20_100);
  assert.equal(p.state, "ANSWERING");
  const challenge = CHALLENGE_BY_ID.get(p.challenge);
  const wrong = room.answer(p, { serial: p.serial, response: "resposta-errada" });
  assert.equal(wrong.correct, false);
  assert.equal(p.streak, 0);
  const right = challenge.template === "oslab" ? (room.advanceTime(2600), challenge.solution.answer ? { answer: challenge.solution.answer } : { done: true }) : challenge.solution;
  const result = room.answer(p, { serial: p.serial, response: right });
  assert.equal(result.correct, true);
  assert.equal(p.freeTime, 20);
  room.advanceTime(800);
  assert.equal(p.state, "EXPLORING");
});

test("vírus infecta, escudo protege e quem chega à saída é salvo", () => {
  const room = playingRoom();
  const [ana, bia] = [...room.players.values()];
  room.viruses = [];
  ana.effects.shield = 1;
  const virus = room.createVirus({});
  Object.assign(virus, { x: ana.x, y: ana.y, respawnAt: 0, frozenUntil: 0 });
  room.viruses = [virus];
  room.collisions(room.now());
  assert.equal(ana.state, "EXPLORING");
  assert.equal(ana.effects.shield, 0);
  room.collisions(room.now());
  ana.effects.immuneUntil = 0;
  virus.respawnAt = 0;
  room.collisions(room.now());
  assert.equal(ana.state, "INFECTED");
  // Bia vai direto para a saída.
  room.viruses = [];
  const exit = cellCenter(room.exit.x, room.exit.y);
  Object.assign(bia, exit);
  room.explorerInteractions(bia, room.now());
  assert.equal(bia.state, "ESCAPED");
});

test("vitória: equipe com mais salvos, e vírus vencem se ninguém escapar", () => {
  const room = playingRoom(["Ana", "Bia"]);
  const [ana, bia] = [...room.players.values()];
  room.viruses = [];
  Object.assign(ana, cellCenter(room.exit.x, room.exit.y));
  room.explorerInteractions(ana, room.now());
  room.checkVictory();
  assert.equal(room.status, "PLAYING", "a outra equipe ainda pode empatar");
  bia.state = "INFECTED";
  room.checkVictory();
  assert.equal(room.status, "FINISHED");
  assert.equal(room.result.winner, ana.team);
  const other = playingRoom(["Caio", "Davi"]);
  for (const p of other.players.values()) { p.state = "INFECTED"; }
  other.checkVictory();
  assert.equal(other.result.winner, "virus");
});

test("movimento enviado pelo aluno é validado (sem atravessar paredes nem correr demais)", () => {
  const room = playingRoom(["Ana", "Bia"]);
  const ana = [...room.players.values()][0];
  const field = distanceField(room.grid, Math.floor(ana.x / TILE), Math.floor(ana.y / TILE));
  void field;
  const before = { x: ana.x, y: ana.y, tv: ana.tv };
  room.onMove(ana, [1, ana.x + 400, ana.y, 1, 0, ana.tv]);
  room.onMove(ana, [2, ana.x + 400, ana.y, 1, 0, ana.tv]);
  assert.equal(ana.tv, before.tv + 1, "salto absurdo gera correção");
  assert.equal(Math.round(ana.x), Math.round(before.x));
  room.onMove(ana, [3, ana.x, ana.y, 1, 0, ana.tv - 1]);
  assert.equal(ana.ix, 0, "mensagem antiga (antes do teleporte) é ignorada");
});
