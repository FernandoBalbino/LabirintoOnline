// Sala autoritativa da arena.
// Movimento: o aluno simula o próprio personagem e envia a posição só quando muda a direção
// (e a cada 200 ms enquanto anda). O servidor valida (velocidade, paredes, alcance) e repassa
// imediatamente uma "âncora" (posição + direção + velocidade + horário) apenas para quem pode ver.
// Os colegas extrapolam com a mesma física: o boneco aparece onde o colega está agora, sem fila.
import { randomBytes, createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  TILE, PLAYER_RADIUS, VIRUS_RADIUS, PLAYER_SPEED, NPC_VIRUS_SPEED, INFECTED_SPEED,
  QUESTION_PROTECTION_MS, OSLAB_PROTECTION_MS, SUCCESS_RESUME_MS, POWER_CHOICE_MS,
  EVENT_INTERVAL_MS, DISCONNECT_BUDGET_MS, INFECTION_RADIUS, INFECTION_GRACE_MS, RELEASE_SECONDS,
  VIEW_HALF_WIDTH, VIEW_HALF_HEIGHT, INITIAL_FREE_TIME, freeTimeForStreak,
} from "../shared/constants.mjs";
import { TEAMS, POWERS, DEFAULT_CONFIG } from "../shared/catalog.mjs";
import { createRandom } from "../shared/rng.mjs";
import { generateArena, spawnCells } from "../shared/maze.mjs";
import { advance, canOccupy, distanceField, pathFromField, toCell, cellCenter, isWall, gridToString, directionFor } from "../shared/physics.mjs";
import { CHALLENGE_BY_ID, CLASSIC_IDS, publicChallenge, checkResponse, acceptedParts } from "./bank.mjs";
import { choosePower, randomEvent, initialChests, safeTeleportDestination, teleport } from "./powers.mjs";

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (value) => createHash("sha256").update(String(value)).digest("hex");
export const serverNow = () => Math.round(performance.now());

const FLAG = { INFECTED: 1, SHIELD: 2, PROTECTED: 4, FROZEN: 8, SPRINT: 16, NPC: 32, TEMP: 64, OFFLINE: 128 };
const round1 = (v) => Math.round(v * 10) / 10;

export function validateConfig(input, base = DEFAULT_CONFIG) {
  const config = { ...base };
  for (const key of Object.keys(DEFAULT_CONFIG)) if (input?.[key] !== undefined) config[key] = input[key];
  config.name = String(config.name ?? "").trim().slice(0, 60) || DEFAULT_CONFIG.name;
  for (const [key, min, max] of [["maxPlayers", 2, 24], ["teamCount", 2, 4], ["width", 31, 131], ["height", 31, 101], ["timeLimit", 0, 7200]]) {
    const value = Number(config[key]);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Configuração inválida: ${key}.`);
    config[key] = value;
  }
  if (config.maxPlayers < config.teamCount) throw new Error("As vagas precisam comportar todas as equipes.");
  if (!["auto", "custom"].includes(config.mapSize)) throw new Error("Tamanho de mapa inválido.");
  if (config.mapSize === "custom" && (config.width % 2 === 0 || config.height % 2 === 0)) throw new Error("Use dimensões ímpares para o mapa.");
  for (const key of ["powers", "controlledViruses", "allowJoin", "oslab"]) if (typeof config[key] !== "boolean") throw new Error("Configuração inválida.");
  return config;
}

export class Room {
  constructor({ code, teacherHash, config = {}, seed = newToken(), clock = serverNow }) {
    this.code = code;
    this.teacherHash = teacherHash;
    this.config = validateConfig(config);
    this.seed = seed;
    this.random = createRandom(seed);
    this.now = clock;
    this.status = "LOBBY";
    this.players = new Map();
    this.order = [];
    this.teacher = { socket: null };
    this.viruses = [];
    this.walls = [];
    this.teamWalls = new Map();
    this.teamFields = new Map();
    this.activeEvent = null;
    this.lastEventId = null;
    this.result = null;
    this.nextPlayer = 1;
    this.nextVirus = 1;
    this.createdAt = clock();
    this.lastActivity = Date.now();
    this.roomDirty = true;
    this.flushScheduled = false;
    this.minimapAt = 0;
    this.stats = { moves: 0, corrections: 0, sent: 0, bytes: 0 };
  }

  // ---------------- utilidades ----------------
  activePlayers() { return this.order.map((id) => this.players.get(id)).filter((p) => p && !p.removed); }
  send(socket, message) {
    if (!socket || socket.readyState !== 1) return;
    const text = typeof message === "string" ? message : JSON.stringify(message);
    socket.send(text);
    this.stats.sent += 1;
    this.stats.bytes += text.length;
  }
  sendTo(p, message) { this.send(p.socket, message); }
  broadcast(message) {
    const text = JSON.stringify(message);
    for (const p of this.players.values()) this.send(p.socket, text);
    this.send(this.teacher.socket, text);
  }
  notify(p, data) { this.sendTo(p, { t: "evt", ...data }); }
  dirtyMe(p) { p.meDirty = true; this.scheduleFlush(); }
  dirtyRoomState() { this.roomDirty = true; this.scheduleFlush(); }
  markAnchor(actor) { actor.anchorDirty = true; this.scheduleFlush(); }
  // Agrupa envios: no máximo um lote a cada 33 ms (30 Hz): menos CPU e menos quadros WebSocket.
  scheduleFlush() {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    const wait = Math.max(0, 33 - (performance.now() - (this.lastFlushAt || 0)));
    const run = () => { this.flushScheduled = false; this.flush(); };
    if (wait <= 0) setImmediate(run); else setTimeout(run, wait);
  }

  wallsFor(team) { return this.teamWalls.get(team) || null; }
  exitFieldFor(team) {
    const extra = this.wallsFor(team);
    if (!extra) return this.exitField;
    if (!this.teamFields.has(team)) this.teamFields.set(team, distanceField(this.grid, this.exit.x, this.exit.y, extra));
    return this.teamFields.get(team);
  }
  addWall(wall) { this.walls.push(wall); this.rebuildWalls(); }
  rebuildWalls() {
    this.teamWalls = new Map();
    this.teamFields = new Map();
    for (const wall of this.walls) {
      if (!this.teamWalls.has(wall.team)) this.teamWalls.set(wall.team, new Set());
      this.teamWalls.get(wall.team).add(wall.y * this.grid.w + wall.x);
    }
    for (const p of this.activePlayers()) this.dirtyMe(p);
  }
  pathLength(a, b) {
    const field = distanceField(this.grid, b.x, b.y);
    return field[a.y * this.grid.w + a.x];
  }

  // ---------------- lobby ----------------
  addPlayer(name) {
    if (this.status !== "LOBBY" || !this.config.allowJoin) throw new Error("A sala não está aceitando novos participantes.");
    if (this.activePlayers().length >= this.config.maxPlayers) throw new Error("A sala está cheia.");
    const clean = String(name ?? "").trim().normalize("NFC").replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 30 || /[\x00-\x1f<>]/.test(clean)) throw new Error("Informe um nome de 2 a 30 caracteres.");
    if (this.activePlayers().some((p) => p.name.toLocaleLowerCase("pt-BR") === clean.toLocaleLowerCase("pt-BR"))) throw new Error("Já existe alguém com esse nome na sala. Use também o sobrenome.");
    const token = newToken();
    const teams = TEAMS.slice(0, this.config.teamCount);
    const counts = teams.map((t) => this.activePlayers().filter((p) => p.team === t.id).length);
    const team = teams[counts.indexOf(Math.min(...counts))].id;
    const p = {
      id: `p${this.nextPlayer++}`, tokenHash: hashToken(token), name: clean, team, isPlayer: true,
      state: "EXPLORING", connected: false, removed: false, socket: null,
      x: 0, y: 0, dir: "down", ix: 0, iy: 0, tv: 1, lastMoveAt: 0, lastAnchorAt: 0, moving: false, strikes: 0,
      speedNow: PLAYER_SPEED, speedPrev: PLAYER_SPEED, speedChangedAt: 0, flagsNow: 0,
      remaining: INITIAL_FREE_TIME, freeTime: INITIAL_FREE_TIME, streak: 0, highestStreak: 0, answered: 0, wrong: 0, correct: 0,
      effects: { shield: 0 }, chests: [], nextChest: 0, bits: [], meteors: [], fakeExit: null, phantoms: [],
      deck: [], lastChallengeId: null, challenge: null, serial: 0, questionAt: 0, questionUntil: 0, questionExpired: false, successAt: 0,
      powerChoice: null, interaction: null, virusSpeed: INFECTED_SPEED, infectedAt: 0, escapedAt: 0,
      disconnectBudget: DISCONNECT_BUDGET_MS, disconnectAt: null, owd: 60, view: new Set(), watch: null,
      aiPath: [], aiPathAt: 0, meDirty: true, anchorDirty: false,
    };
    this.players.set(p.id, p);
    this.order.push(p.id);
    this.dirtyRoomState();
    return { player: p, token };
  }

  redistribute() {
    const teams = TEAMS.slice(0, this.config.teamCount);
    this.random.shuffle(this.activePlayers()).forEach((p, index) => { p.team = teams[index % teams.length].id; this.dirtyMe(p); });
    this.dirtyRoomState();
  }

  configure(input) {
    if (this.status !== "LOBBY") throw new Error("A configuração está fechada.");
    const next = validateConfig(input, this.config);
    if (this.activePlayers().length > next.maxPlayers) throw new Error("Há mais participantes que vagas.");
    const teamsChanged = next.teamCount !== this.config.teamCount;
    this.config = next;
    if (teamsChanged) this.redistribute();
    this.dirtyRoomState();
  }

  remove(p) {
    p.removed = true;
    p.ix = 0; p.iy = 0;
    if (this.status === "LOBBY") { this.order = this.order.filter((id) => id !== p.id); this.players.delete(p.id); }
    this.dirtyRoomState();
    this.checkVictory();
  }

  attach(p, socket) {
    if (p.removed) throw new Error("Sua participação foi encerrada pelo professor.");
    const old = p.socket;
    p.socket = socket;
    if (old && old !== socket) { try { old.close(4009, "Sessão aberta em outra aba."); } catch { /* já fechado */ } }
    if (!p.connected) {
      if (p.disconnectAt !== null) p.disconnectBudget = Math.max(0, p.disconnectBudget - (this.now() - p.disconnectAt));
      p.connected = true;
      p.disconnectAt = null;
    }
    p.ix = 0; p.iy = 0;
    p.tv += 1;
    p.view = new Set();
    p.meDirty = true;
    this.markAnchor(p);
    this.dirtyRoomState();
  }

  detach(p, socket) {
    if (p.socket !== socket) return;
    p.socket = null;
    p.connected = false;
    p.ix = 0; p.iy = 0;
    p.disconnectAt = this.now();
    this.markAnchor(p);
    this.dirtyRoomState();
  }

  // ---------------- início da partida ----------------
  start() {
    if (this.status !== "LOBBY") throw new Error("A partida já foi iniciada.");
    const participants = this.activePlayers();
    if (participants.length < this.config.teamCount) throw new Error(`Entre pelo menos ${this.config.teamCount} alunos (um por equipe).`);
    const offline = participants.filter((p) => !p.connected);
    if (offline.length) throw new Error(`Aguarde a reconexão (ou remova): ${offline.map((p) => p.name).join(", ")}.`);
    for (const team of TEAMS.slice(0, this.config.teamCount)) if (!participants.some((p) => p.team === team.id)) this.redistribute();
    const arena = generateArena({ teamCount: this.config.teamCount, players: participants.length, mapSize: this.config.mapSize, width: this.config.width, height: this.config.height, seed: this.seed });
    this.grid = { w: arena.maze.w, h: arena.maze.h, cells: arena.maze.cells };
    this.decorations = arena.maze.decorations;
    this.exit = arena.exit;
    this.teamStarts = arena.teamStarts;
    this.exitField = arena.exitField;
    this.maxDistance = arena.maxDistance;
    this.floorCells = [];
    for (let y = 1; y < this.grid.h - 1; y += 1) for (let x = 1; x < this.grid.w - 1; x += 1) if (!isWall(this.grid, x, y)) this.floorCells.push({ x, y });
    this.mapMessage = JSON.stringify({ t: "map", w: this.grid.w, h: this.grid.h, grid: gridToString(this.grid), exit: this.exit, starts: this.teamStarts, decorations: this.decorations });

    const used = new Set();
    const occupied = [];
    TEAMS.slice(0, this.config.teamCount).forEach((team, index) => {
      const group = participants.filter((p) => p.team === team.id);
      const cells = spawnCells(this.grid, this.teamStarts[index], group.length, used);
      group.forEach((p, i) => {
        const c = cells[i];
        used.add(c.y * this.grid.w + c.x);
        occupied.push(c);
        Object.assign(p, cellCenter(c.x, c.y));
        p.dir = "down";
        p.deck = this.buildDeck();
      });
    });
    const T = this.now();
    this.viruses = [this.createVirus({ avoid: occupied, minDistance: 18, temporary: false })];
    this.startedAt = T;
    this.nextEventAt = T + EVENT_INTERVAL_MS;
    this.lastMeteorAt = 0;
    this.status = "PLAYING";
    for (const p of participants) {
      if (this.config.powers) initialChests(this, p);
      p.lastMoveAt = T;
      p.tv += 1;
      p.meDirty = true;
      this.markAnchor(p);
      this.sendTo(p, this.mapMessage);
    }
    this.send(this.teacher.socket, this.mapMessage);
    this.dirtyRoomState();
  }

  buildDeck() {
    const classic = this.random.shuffle(CLASSIC_IDS);
    const practical = this.config.oslab ? this.random.shuffle([...CHALLENGE_BY_ID.values()].filter((c) => c.template === "oslab").map((c) => c.id)) : [];
    const deck = [];
    while (classic.length || practical.length) {
      if (classic.length) deck.push(classic.shift());
      if (classic.length) deck.push(classic.shift());
      if (practical.length) deck.push(practical.shift());
    }
    return deck;
  }

  createVirus({ avoid = [], minDistance = 18, temporary = false, speed = NPC_VIRUS_SPEED }) {
    const pool = this.floorCells.filter((c) => (c.x !== this.exit.x || c.y !== this.exit.y) && avoid.every((a) => Math.hypot(a.x - c.x, a.y - c.y) >= minDistance));
    const cell = this.random.pick(pool.length ? pool : this.floorCells);
    const T = this.now();
    return {
      id: `v${this.nextVirus++}`, isPlayer: false, ...cellCenter(cell.x, cell.y), dir: "left", speed, temporary,
      sprinting: temporary, nextSprintAt: T + 5500 + this.random() * 6500, sprintEndsAt: temporary ? Infinity : 0,
      respawnAt: 0, frozenUntil: 0, path: [], pathAt: 0, ix: 0, iy: 0, until: temporary ? Infinity : 0,
      anchorDirty: true, flagsNow: 0, speedNow: 0, lastAnchorAt: 0,
    };
  }

  spawnTemporaryViruses(count, durationMs) {
    const avoid = this.activePlayers().map((p) => toCell(p.x, p.y));
    for (let i = 0; i < count; i += 1) {
      const virus = this.createVirus({ avoid: [...avoid, ...this.viruses.map((v) => toCell(v.x, v.y))], minDistance: 12, temporary: true, speed: Math.round(NPC_VIRUS_SPEED * 0.75) });
      virus.until = this.now() + durationMs;
      this.viruses.push(virus);
    }
  }

  // ---------------- regras de estado ----------------
  protectedDisconnect(p) { return !p.connected && p.disconnectAt !== null && this.now() - p.disconnectAt < p.disconnectBudget; }
  immune(p) {
    const T = this.now();
    return this.protectedDisconnect(p) || p.effects.immuneUntil > T || p.effects.freezeUntil > T
      || (p.state === "ANSWERING" && !p.questionExpired) || p.interaction === "power";
  }
  canMove(p) {
    if (this.status !== "PLAYING" || p.removed || !p.connected) return false;
    const T = this.now();
    if (p.effects.freezeUntil > T || p.effects.stunUntil > T) return false;
    if (p.state === "EXPLORING") return !p.interaction;
    if (p.state === "INFECTED") return this.config.controlledViruses && T - p.infectedAt >= 300;
    return false;
  }
  speedOf(p) {
    if (!this.canMove(p) && !(p.state === "INFECTED" && !this.config.controlledViruses)) return 0;
    const T = this.now();
    if (p.state === "INFECTED") return p.effects.stunUntil > T ? 0 : p.virusSpeed;
    return PLAYER_SPEED * (p.effects.speedUntil > T ? 2 : 1) * (p.effects.slowUntil > T ? 0.5 : 1);
  }
  flagsOf(actor) {
    const T = this.now();
    if (!actor.isPlayer) {
      return FLAG.NPC | FLAG.INFECTED | (actor.temporary ? FLAG.TEMP : 0) | (actor.frozenUntil > T ? FLAG.FROZEN : 0) | (actor.sprinting ? FLAG.SPRINT : 0);
    }
    return (actor.state === "INFECTED" ? FLAG.INFECTED : 0) | (actor.effects.shield > 0 ? FLAG.SHIELD : 0)
      | (actor.state !== "INFECTED" && this.immune(actor) ? FLAG.PROTECTED : 0) | (actor.effects.stunUntil > T ? FLAG.FROZEN : 0)
      | (actor.connected ? 0 : FLAG.OFFLINE);
  }

  // Posição informada pelo próprio aluno: [seq, x, y, ix, iy, tv].
  onMove(p, message) {
    if (this.status !== "PLAYING" || p.removed) return;
    const [, rawX, rawY, rawIx, rawIy, tv] = message;
    if (tv !== p.tv) return;
    const x = Number(rawX);
    const y = Number(rawY);
    const ix = Math.sign(Number(rawIx)) || 0;
    const iy = Math.sign(Number(rawIy)) || 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const T = this.now();
    this.stats.moves += 1;
    if (!this.canMove(p)) {
      if (p.ix || p.iy) { p.ix = 0; p.iy = 0; this.markAnchor(p); }
      if (Math.hypot(x - p.x, y - p.y) > 6) this.forceStop(p);
      return;
    }
    const extra = p.state === "INFECTED" ? null : this.wallsFor(p.team);
    const speed = this.speedOf(p);
    const maxSpeed = Math.max(speed, T - p.speedChangedAt < 800 ? p.speedPrev : 0);
    const owd = Math.min(150, Math.max(0, p.owd));
    const tolerance = maxSpeed * (0.32 + owd / 1000) + 20;
    const distance = Math.hypot(x - p.x, y - p.y);
    const valid = canOccupy(this.grid, x, y, PLAYER_RADIUS, extra) && distance <= tolerance && this.reachable(p, x, y, tolerance, extra);
    if (!valid) {
      p.strikes += 1;
      if (p.strikes >= 2 || !canOccupy(this.grid, x, y, PLAYER_RADIUS, extra)) { this.stats.corrections += 1; p.strikes = 0; this.forceStop(p); }
      return;
    }
    p.strikes = 0;
    const inputChanged = ix !== p.ix || iy !== p.iy;
    p.x = x;
    p.y = y;
    p.ix = ix;
    p.iy = iy;
    advance(this.grid, p, ix, iy, speed, owd / 1000, PLAYER_RADIUS, extra);
    p.dir = directionFor(ix, iy, p.dir);
    p.lastMoveAt = T;
    if (inputChanged || T - p.lastAnchorAt > 1000) this.markAnchor(p);
  }

  reachable(p, x, y, tolerance, extra) {
    const from = toCell(p.x, p.y);
    const to = toCell(x, y);
    if (from.x === to.x && from.y === to.y) return true;
    const limit = Math.ceil(tolerance / TILE) + 1;
    if (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) > limit) return false;
    let frontier = [from];
    const seen = new Set([from.y * this.grid.w + from.x]);
    for (let depth = 0; depth < limit && frontier.length; depth += 1) {
      const next = [];
      for (const c of frontier) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          const key = ny * this.grid.w + nx;
          if (seen.has(key) || isWall(this.grid, nx, ny, extra)) continue;
          if (nx === to.x && ny === to.y) return true;
          seen.add(key);
          next.push({ x: nx, y: ny });
        }
      }
      frontier = next;
    }
    return false;
  }

  // Para o personagem no servidor e no navegador do aluno (perguntas, baús, teleporte, congelamento).
  forceStop(p) {
    p.ix = 0;
    p.iy = 0;
    p.moving = false;
    p.tv += 1;
    p.strikes = 0;
    this.sendTo(p, { t: "cor", tv: p.tv, x: round1(p.x), y: round1(p.y) });
    this.markAnchor(p);
  }

  openQuestion(p) {
    if (!p.deck.length) p.deck = this.buildDeck();
    let index = 0;
    if (p.deck[0] === p.lastChallengeId && p.deck.length > 1) index = 1;
    const id = p.deck.splice(index, 1)[0];
    const challenge = CHALLENGE_BY_ID.get(id);
    const T = this.now();
    p.challenge = id;
    p.lastChallengeId = id;
    p.state = "ANSWERING";
    p.serial += 1;
    p.questionAt = T;
    // Trocar de desafio conta como erro e não renova a proteção.
    if (!p.keepProtection) {
      p.questionUntil = T + (challenge.template === "oslab" ? OSLAB_PROTECTION_MS : QUESTION_PROTECTION_MS);
      p.questionExpired = false;
    }
    p.keepProtection = false;
    p.successAt = 0;
    this.forceStop(p);
    this.dirtyMe(p);
    this.dirtyRoomState();
  }

  answer(p, { serial, response }) {
    const T = this.now();
    if (this.status !== "PLAYING" || p.state !== "ANSWERING" || serial !== p.serial || p.successAt) throw new Error("Este desafio não está mais disponível.");
    const challenge = CHALLENGE_BY_ID.get(p.challenge);
    if (challenge.template === "oslab" && challenge.solution.done && T - p.questionAt < 2500) throw new Error("Conclua a tarefa no OSLab antes de verificar.");
    const correct = checkResponse(challenge, response);
    p.answered += 1;
    if (correct) {
      p.streak += 1;
      p.highestStreak = Math.max(p.highestStreak, p.streak);
      p.freeTime = freeTimeForStreak(p.streak);
      p.remaining = p.freeTime;
      p.correct += 1;
      p.successAt = T + SUCCESS_RESUME_MS;
      p.effects.immuneUntil = p.successAt + 500;
    } else {
      p.streak = 0;
      p.wrong += 1;
      p.remaining = 0;
    }
    this.dirtyMe(p);
    this.dirtyRoomState();
    return { correct, accepted: acceptedParts(challenge, response), message: correct ? `Você ganhou ${p.freeTime} segundos para explorar!` : "Sequência interrompida. Tente novamente." };
  }

  skip(p, { serial }) {
    if (this.status !== "PLAYING" || p.state !== "ANSWERING" || serial !== p.serial || p.successAt) throw new Error("Este desafio não está mais disponível.");
    if (this.now() - p.questionAt < 15_000) throw new Error("Tente um pouco mais antes de trocar (15 segundos).");
    p.answered += 1;
    p.wrong += 1;
    p.streak = 0;
    p.remaining = 0;
    p.keepProtection = true;
    this.openQuestion(p);
    return {};
  }

  release(p) {
    if (this.status !== "PLAYING" || p.state !== "ANSWERING") throw new Error("O aluno não está respondendo um desafio.");
    Object.assign(p, { state: "EXPLORING", challenge: null, successAt: 0, questionExpired: false, remaining: RELEASE_SECONDS, freeTime: RELEASE_SECONDS, streak: 0 });
    p.effects.immuneUntil = this.now() + 1000;
    this.notify(p, { kind: "released" });
    this.forceStop(p);
    this.dirtyMe(p);
    this.dirtyRoomState();
  }

  choose(p, { powerId, choiceId }) {
    if (this.status !== "PLAYING" || p.state !== "EXPLORING" || !p.powerChoice || p.powerChoice.id !== choiceId || !p.powerChoice.ids.includes(powerId)) throw new Error("Escolha de poder inválida.");
    choosePower(this, p, powerId);
    this.forceStop(p);
  }

  infect(p, attacker) {
    if (!["EXPLORING", "ANSWERING"].includes(p.state) || p.removed || this.immune(p)) return false;
    const T = this.now();
    if (p.effects.shield > 0) {
      p.effects.shield -= 1;
      p.effects.immuneUntil = T + 1500;
      if (attacker.isPlayer) { attacker.effects.stunUntil = T + 3000; this.dirtyMe(attacker); this.forceStop(attacker); }
      else { attacker.respawnAt = T + 3000; this.markAnchor(attacker); }
      this.notify(p, { kind: "shield" });
      this.dirtyMe(p);
      this.markAnchor(p);
      return false;
    }
    Object.assign(p, { state: "INFECTED", infectedAt: T, effects: { shield: 0 }, chests: [], bits: [], challenge: null, successAt: 0, powerChoice: null, interaction: null, fakeExit: null, phantoms: [], virusSpeed: INFECTED_SPEED, aiPath: [], aiPathAt: 0 });
    this.notify(p, { kind: "infection" });
    this.broadcast({ t: "evt", kind: "infected", playerId: p.id, name: p.name, team: p.team });
    this.forceStop(p);
    this.dirtyMe(p);
    this.dirtyRoomState();
    return true;
  }

  // ---------------- vírus ----------------
  virusTargets() {
    const T = this.now();
    return this.activePlayers().filter((p) => (p.state === "EXPLORING" || p.state === "ANSWERING") && !this.immune(p) && !(p.effects.invisibleUntil > T));
  }

  stepVirus(v, dt, always = false) {
    const T = this.now();
    const wasMoving = v.ix !== 0 || v.iy !== 0;
    if (v.respawnAt > T || v.frozenUntil > T || (v.isPlayer && v.effects.stunUntil > T)) { this.setVirusDir(v, 0, 0, wasMoving); return; }
    if (always) v.sprinting = true;
    if (!v.isPlayer && !always) {
      if (!v.sprinting && T >= v.nextSprintAt) { v.sprinting = true; v.sprintEndsAt = T + 4000; v.pathAt = 0; this.markAnchor(v); }
      if (v.sprinting && T >= v.sprintEndsAt) { v.sprinting = false; v.nextSprintAt = T + 5500 + this.random() * 6500; this.markAnchor(v); }
    }
    if (!v.sprinting) { this.setVirusDir(v, 0, 0, wasMoving); return; }
    const pathKey = v.isPlayer ? "aiPath" : "path";
    const atKey = v.isPlayer ? "aiPathAt" : "pathAt";
    if (T >= v[atKey] || !v[pathKey].length) {
      const origin = toCell(v.x, v.y);
      const targets = this.virusTargets().filter((p) => Math.abs(p.x - v.x) + Math.abs(p.y - v.y) <= TILE * 50);
      let path = [];
      if (targets.length) {
        const field = distanceField(this.grid, origin.x, origin.y);
        let best = null;
        let bestDistance = Infinity;
        for (const target of targets) {
          const c = toCell(target.x, target.y);
          const d = field[c.y * this.grid.w + c.x];
          if (d >= 0 && d < bestDistance) { best = c; bestDistance = d; }
        }
        if (best) path = [...pathFromField(this.grid, field, best.x, best.y).reverse().slice(1), best];
      }
      v[pathKey] = path;
      v[atKey] = T + 400;
    }
    const speed = v.isPlayer ? v.virusSpeed : v.speed;
    let budget = speed * dt;
    let ix = 0;
    let iy = 0;
    const path = v[pathKey];
    while (budget > 0 && path.length) {
      const target = cellCenter(path[0].x, path[0].y);
      const dx = target.x - v.x;
      const dy = target.y - v.y;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) { v.x = target.x; v.y = target.y; path.shift(); continue; }
      // Alinha primeiro o eixo menor (sai do meio do corredor) e depois segue.
      if (Math.abs(dx) > 0.01 && (Math.abs(dy) < 0.01 || Math.abs(dx) < Math.abs(dy))) {
        const move = Math.min(Math.abs(dx), budget);
        v.x += Math.sign(dx) * move; budget -= move; ix = Math.sign(dx); iy = 0;
      } else {
        const move = Math.min(Math.abs(dy), budget);
        v.y += Math.sign(dy) * move; budget -= move; iy = Math.sign(dy); ix = 0;
      }
    }
    v.dir = directionFor(ix, iy, v.dir);
    this.setVirusDir(v, ix, iy, wasMoving);
  }

  setVirusDir(v, ix, iy, wasMoving) {
    if (v.ix !== ix || v.iy !== iy) { v.ix = ix; v.iy = iy; this.markAnchor(v); }
    else if (wasMoving !== (ix !== 0 || iy !== 0)) this.markAnchor(v);
  }

  // Distância até a próxima curva (o navegador para de extrapolar ali e espera a nova âncora).
  turnLimit(v) {
    const path = v.isPlayer ? v.aiPath : v.path;
    if (!path?.length || (!v.ix && !v.iy)) return 0;
    let limit = 0;
    let x = v.x;
    let y = v.y;
    for (const cell of path) {
      const c = cellCenter(cell.x, cell.y);
      const dx = c.x - x;
      const dy = c.y - y;
      if ((v.ix && Math.abs(dy) > 0.01) || (v.iy && Math.abs(dx) > 0.01)) break;
      if ((v.ix && Math.sign(dx) !== v.ix && Math.abs(dx) > 0.01) || (v.iy && Math.sign(dy) !== v.iy && Math.abs(dy) > 0.01)) break;
      limit += Math.abs(dx) + Math.abs(dy);
      x = c.x; y = c.y;
    }
    return Math.max(1, Math.round(limit));
  }

  // ---------------- laço principal (20 Hz) ----------------
  tick(dt) {
    if (this.status !== "PLAYING") return;
    const T = this.now();
    if (this.walls.some((w) => w.until <= T)) { this.walls = this.walls.filter((w) => w.until > T); this.rebuildWalls(); }
    const before = this.viruses.length;
    this.viruses = this.viruses.filter((v) => !v.temporary || v.until > T);
    if (this.viruses.length !== before) this.dirtyRoomState();
    if (this.activeEvent && this.activeEvent.until <= T) { this.activeEvent = null; this.dirtyRoomState(); }

    for (const p of this.activePlayers()) {
      if (p.state === "ESCAPED") continue;
      if (this.protectedDisconnect(p)) {
        if (p.state === "ANSWERING" && !p.questionExpired) p.questionUntil += dt * 1000;
        if (p.powerChoice) p.powerChoice.until += dt * 1000;
        this.trackActor(p);
        continue;
      }
      if (p.state === "ANSWERING") {
        if (p.successAt && T >= p.successAt) {
          Object.assign(p, { successAt: 0, challenge: null, state: "EXPLORING" });
          this.forceStop(p);
          this.dirtyMe(p);
          this.dirtyRoomState();
        } else if (!p.questionExpired && T >= p.questionUntil) {
          p.streak = 0; p.answered += 1; p.wrong += 1; p.questionExpired = true;
          this.notify(p, { kind: "timeout" });
          this.dirtyMe(p);
          this.markAnchor(p);
        }
        this.trackActor(p);
        continue;
      }
      if (p.interaction === "power") {
        if (T >= p.powerChoice.until) choosePower(this, p, p.powerChoice.ids[0]);
        this.trackActor(p);
        continue;
      }
      if (p.state === "EXPLORING") {
        p.remaining = Math.max(0, p.remaining - dt);
        if (p.remaining <= 0) { this.openQuestion(p); continue; }
      }
      if (p.state === "INFECTED" && !this.config.controlledViruses) this.stepVirus(p, dt, true);
      else if (p.ix || p.iy) {
        if (!this.canMove(p)) { p.ix = 0; p.iy = 0; this.markAnchor(p); }
        else if (T - p.lastMoveAt > 900) { p.ix = 0; p.iy = 0; this.markAnchor(p); }
        else {
          const moved = advance(this.grid, p, p.ix, p.iy, this.speedOf(p), dt, PLAYER_RADIUS, p.state === "INFECTED" ? null : this.wallsFor(p.team));
          if (moved !== p.moving) { p.moving = moved; this.markAnchor(p); }
        }
      }
      if (p.state === "EXPLORING") this.explorerInteractions(p, T);
      this.trackActor(p);
    }

    for (const v of this.viruses) { this.stepVirus(v, dt, v.temporary); this.trackActor(v); }
    this.collisions(T);
    if (T >= this.nextEventAt) { this.nextEventAt += EVENT_INTERVAL_MS; randomEvent(this); }
    this.meteors(T);
    this.checkVictory();
    this.scheduleFlush();
  }

  explorerInteractions(p, T) {
    const exit = cellCenter(this.exit.x, this.exit.y);
    if (Math.hypot(p.x - exit.x, p.y - exit.y) <= TILE * 0.48) {
      Object.assign(p, { state: "ESCAPED", escapedAt: T, chests: [], ix: 0, iy: 0 });
      this.notify(p, { kind: "escape" });
      this.broadcast({ t: "evt", kind: "escaped", playerId: p.id, name: p.name, team: p.team });
      this.forceStop(p);
      this.dirtyMe(p);
      this.dirtyRoomState();
      return;
    }
    if (p.fakeExit && p.fakeExit.until > T) {
      const fake = cellCenter(p.fakeExit.x, p.fakeExit.y);
      if (Math.hypot(p.x - fake.x, p.y - fake.y) < 20) {
        p.fakeExit = null;
        teleport(this, p, safeTeleportDestination(this, p), { notice: false });
        this.notify(p, { kind: "trap" });
        this.dirtyMe(p);
      }
    }
    const chest = p.chests.find((c) => !c.opened && Math.hypot(p.x - (c.x + 0.5) * TILE, p.y - (c.y + 0.5) * TILE) < 24);
    if (chest) {
      chest.opened = true;
      p.interaction = "power";
      p.powerChoice = { id: newToken().slice(0, 10), ids: this.random.shuffle(POWERS).slice(0, 4).map((x) => x.id), until: T + POWER_CHOICE_MS };
      this.forceStop(p);
      this.dirtyMe(p);
    }
    if (p.effects.bitsUntil > T) {
      const left = p.bits.filter((bit) => Math.hypot(p.x - (bit.x + 0.5) * TILE, p.y - (bit.y + 0.5) * TILE) >= 24);
      if (left.length !== p.bits.length) { p.remaining += 2 * (p.bits.length - left.length); p.bits = left; this.dirtyMe(p); }
    } else if (p.bits.length) { p.bits = []; this.dirtyMe(p); }
  }

  collisions(T) {
    const attackers = [
      ...this.viruses.filter((v) => v.respawnAt <= T && !(v.frozenUntil > T)),
      ...this.activePlayers().filter((p) => p.state === "INFECTED" && T - p.infectedAt >= INFECTION_GRACE_MS && !(p.effects.stunUntil > T) && !this.protectedDisconnect(p)),
    ];
    for (const p of this.activePlayers()) {
      if (p.state !== "EXPLORING" && p.state !== "ANSWERING") continue;
      for (const attacker of attackers) {
        if (Math.hypot(attacker.x - p.x, attacker.y - p.y) <= INFECTION_RADIUS) { this.infect(p, attacker); break; }
      }
    }
  }

  meteors(T) {
    if (this.activeEvent?.id !== "chuva-meteoros") {
      for (const p of this.activePlayers()) if (p.meteors.length) { p.meteors = []; this.dirtyMe(p); }
      return;
    }
    const spawn = T - this.lastMeteorAt >= 900;
    if (spawn) this.lastMeteorAt = T;
    for (const p of this.activePlayers()) {
      if (p.state !== "EXPLORING") continue;
      if (spawn) {
        const c = toCell(p.x, p.y);
        const options = [];
        for (let y = c.y - 5; y <= c.y + 5; y += 1) for (let x = c.x - 5; x <= c.x + 5; x += 1) if (!isWall(this.grid, x, y)) options.push({ x, y });
        if (options.length) { p.meteors.push({ ...this.random.pick(options), id: `m${T}${p.id}`, hitAt: T + 1200, until: T + 1600 }); this.dirtyMe(p); }
      }
      for (const meteor of p.meteors) {
        if (meteor.hit || meteor.hitAt > T) continue;
        meteor.hit = true;
        if (!this.immune(p) && Math.hypot(p.x - (meteor.x + 0.5) * TILE, p.y - (meteor.y + 0.5) * TILE) < 30) {
          p.remaining = Math.max(0, p.remaining - 3);
          this.notify(p, { kind: "meteor" });
          this.dirtyMe(p);
          if (!p.remaining) this.openQuestion(p);
        }
      }
      const left = p.meteors.filter((m) => m.until > T);
      if (left.length !== p.meteors.length) { p.meteors = left; this.dirtyMe(p); }
    }
  }

  // Detecta mudanças de velocidade/estado visual e pede nova âncora.
  trackActor(actor) {
    const T = this.now();
    const speed = actor.isPlayer ? this.speedOf(actor) : (actor.ix || actor.iy ? actor.speed : 0);
    if (speed !== actor.speedNow) { actor.speedPrev = actor.speedNow; actor.speedNow = speed; actor.speedChangedAt = T; this.markAnchor(actor); }
    const flags = this.flagsOf(actor);
    if (flags !== actor.flagsNow) { actor.flagsNow = flags; this.markAnchor(actor); }
    if ((actor.ix || actor.iy) && T - actor.lastAnchorAt > 1000) this.markAnchor(actor);
  }

  scoreboard() {
    return TEAMS.slice(0, this.config.teamCount).map((team) => {
      const all = this.order.map((id) => this.players.get(id)).filter((p) => p && p.team === team.id);
      const escaped = all.filter((p) => p.state === "ESCAPED");
      return {
        id: team.id, name: team.name, color: team.color, symbol: team.symbol, total: all.length,
        escaped: escaped.length, infected: all.filter((p) => p.state === "INFECTED").length,
        exploring: all.filter((p) => !p.removed && (p.state === "EXPLORING" || p.state === "ANSWERING")).length,
        lastEscape: escaped.length ? Math.max(...escaped.map((p) => p.escapedAt)) : -1,
      };
    });
  }

  checkVictory() {
    if (this.status !== "PLAYING") return;
    const board = this.scoreboard();
    const remaining = board.reduce((sum, team) => sum + team.exploring, 0);
    const leader = [...board].sort((a, b) => b.escaped - a.escaped || a.lastEscape - b.lastEscape)[0];
    const timeUp = this.config.timeLimit > 0 && this.now() - this.startedAt >= this.config.timeLimit * 1000;
    const unbeatable = leader.escaped > 0 && board.filter((t) => t.id !== leader.id).every((t) => t.escaped + t.exploring < leader.escaped);
    if (remaining === 0 || timeUp || unbeatable) this.finish("automatic");
  }

  finish(reason = "manual") {
    if (this.status === "FINISHED" || this.status === "CANCELLED") return;
    const board = this.scoreboard();
    const total = board.reduce((sum, team) => sum + team.escaped, 0);
    const sorted = [...board].sort((a, b) => b.escaped - a.escaped || a.lastEscape - b.lastEscape);
    const cancelled = reason === "manual" && !total;
    this.status = cancelled ? "CANCELLED" : "FINISHED";
    const all = this.order.map((id) => this.players.get(id)).filter(Boolean);
    this.result = {
      reason, duration: Math.round((this.now() - this.startedAt) / 1000),
      winner: cancelled ? null : total ? sorted[0].id : "virus",
      tie: total > 0 && sorted[0].escaped === sorted[1]?.escaped,
      scoreboard: board,
      arrivals: all.filter((p) => p.state === "ESCAPED").sort((a, b) => a.escapedAt - b.escapedAt).map((p) => ({ id: p.id, name: p.name, team: p.team, at: Math.round((p.escapedAt - this.startedAt) / 1000) })),
      players: all.map((p) => ({ id: p.id, name: p.name, team: p.team, state: p.state, correct: p.correct, wrong: p.wrong, streak: p.highestStreak, removed: p.removed })),
    };
    for (const p of all) { p.ix = 0; p.iy = 0; }
    this.dirtyRoomState();
    this.flush();
  }

  // ---------------- mensagens ----------------
  // Professor recebe tudo; alunos recebem a lista compacta [id, nome, equipe, estado, conectado, removido].
  publicState(full = true) {
    const list = this.order.map((id) => this.players.get(id)).filter((p) => p && !(this.status === "LOBBY" && p.removed));
    return {
      t: "room", code: this.code, status: this.status, config: this.config, teacherConnected: Boolean(this.teacher.socket),
      startedAt: this.startedAt || 0, serverTime: this.now(),
      players: full ? list.map((p) => ({
        id: p.id, name: p.name, team: p.team, state: p.state, connected: p.connected, removed: p.removed,
        correct: p.correct, wrong: p.wrong, streak: p.streak, challenge: p.state === "ANSWERING" ? CHALLENGE_BY_ID.get(p.challenge)?.theme : null,
      })) : undefined,
      roster: full ? undefined : list.map((p) => [p.id, p.name, p.team, p.state, p.connected ? 1 : 0, p.removed ? 1 : 0]),
      scoreboard: this.scoreboard(),
      viruses: this.viruses.length + this.activePlayers().filter((p) => p.state === "INFECTED").length,
      activeEvent: this.activeEvent, result: this.result,
    };
  }

  stateFor(socket) { return this.publicState(socket === this.teacher.socket); }

  meState(p) {
    const T = this.now();
    const challenge = p.challenge ? publicChallenge(CHALLENGE_BY_ID.get(p.challenge), p.serial) : null;
    return {
      t: "me", at: T, id: p.id, name: p.name, team: p.team, state: p.state, tv: p.tv, x: round1(p.x), y: round1(p.y),
      remaining: p.remaining, freeTime: p.freeTime, streak: p.streak, correct: p.correct,
      effects: p.effects, chests: p.chests.filter((c) => !c.opened).map(({ id, x, y }) => ({ id, x, y })),
      bits: p.bits, meteors: p.meteors, fakeExit: p.fakeExit && p.fakeExit.until > T ? p.fakeExit : null,
      phantoms: p.effects.phantomUntil > T ? p.phantoms : [], walls: p.state === "INFECTED" ? [] : this.walls.filter((w) => w.team === p.team),
      challenge, questionUntil: p.questionUntil, questionExpired: p.questionExpired, successAt: p.successAt,
      powerChoice: p.powerChoice, interaction: p.interaction, virusSpeed: p.virusSpeed, controlled: this.config.controlledViruses, infectedAt: p.infectedAt,
    };
  }

  cameraOf(p) {
    if (p.state !== "ESCAPED") return p;
    const watched = p.watch && this.players.get(p.watch);
    if (watched && !watched.removed && watched.state !== "ESCAPED") return watched;
    return this.activePlayers().find((other) => other.state !== "ESCAPED") || p;
  }

  actorVisibleTo(actor, viewer, camera) {
    if (actor === viewer) return false;
    if (actor.isPlayer && (actor.removed || actor.state === "ESCAPED")) return false;
    if (!actor.isPlayer && actor.respawnAt > this.now()) return false;
    if (actor.isPlayer && viewer.state === "INFECTED" && actor.state !== "INFECTED" && actor.effects.invisibleUntil > this.now()) return false;
    return Math.abs(actor.x - camera.x) <= VIEW_HALF_WIDTH && Math.abs(actor.y - camera.y) <= VIEW_HALF_HEIGHT;
  }

  anchorFields(actor) {
    const speed = actor.speedNow ?? 0;
    const moving = speed > 0 && (actor.ix || actor.iy);
    return [actor.id, round1(actor.x), round1(actor.y), moving ? actor.ix : 0, moving ? actor.iy : 0, Math.round(speed), actor.flagsNow, actor.isPlayer && !(actor.state === "INFECTED" && !this.config.controlledViruses) ? 0 : this.turnLimit(actor)];
  }

  flush() {
    const T = this.now();
    this.lastFlushAt = performance.now();
    // Estado da sala: no máximo 1 vez por segundo durante a partida (economia de banda).
    if (this.roomDirty) {
      const wait = this.status === "PLAYING" && this.lastStatus === "PLAYING" ? 1000 - (T - (this.roomSentAt || 0)) : 0;
      if (wait > 0) {
        if (!this.roomTimer) this.roomTimer = setTimeout(() => { this.roomTimer = null; this.flush(); }, wait);
      } else {
        this.roomDirty = false;
        this.roomSentAt = T;
        this.lastStatus = this.status;
        const full = JSON.stringify(this.publicState(true));
        const compact = JSON.stringify(this.publicState(false));
        for (const p of this.players.values()) this.send(p.socket, compact);
        this.send(this.teacher.socket, full);
      }
    }
    for (const p of this.players.values()) if (p.meDirty) { p.meDirty = false; this.sendTo(p, this.meState(p)); }
    if (this.status !== "PLAYING") return;
    const actors = [...this.activePlayers(), ...this.viruses];
    // Cada âncora vira texto uma única vez por lote e é reaproveitada para todos os alunos.
    const fragments = new Map();
    const fragmentOf = (actor) => {
      let text = fragments.get(actor.id);
      if (text === undefined) { text = JSON.stringify(this.anchorFields(actor)).slice(1, -1); fragments.set(actor.id, text); }
      return text;
    };
    for (const viewer of this.players.values()) {
      if (viewer.removed || !viewer.socket) continue;
      const camera = this.cameraOf(viewer);
      const parts = [];
      const gone = [];
      const visible = new Set();
      for (const actor of actors) {
        if (!this.actorVisibleTo(actor, viewer, camera)) continue;
        visible.add(actor.id);
        if (actor.anchorDirty || !viewer.view.has(actor.id)) parts.push(fragmentOf(actor));
      }
      for (const id of viewer.view) if (!visible.has(id)) gone.push(JSON.stringify(id));
      viewer.view = visible;
      if (parts.length) this.send(viewer.socket, `[1,${T},${parts.join(",")}]`);
      if (gone.length) this.send(viewer.socket, `[2,${gone.join(",")}]`);
    }
    for (const actor of actors) if (actor.anchorDirty) { actor.anchorDirty = false; actor.lastAnchorAt = T; }
    // Professor: minimapa de toda a arena a 4 Hz.
    if (this.teacher.socket && T - this.minimapAt >= 250) {
      this.minimapAt = T;
      const map = [3, T];
      for (const actor of actors) {
        if (actor.isPlayer && actor.state === "ESCAPED") continue;
        if (!actor.isPlayer && actor.respawnAt > T) continue;
        map.push(actor.id, Math.round(actor.x), Math.round(actor.y), actor.flagsNow);
      }
      this.send(this.teacher.socket, JSON.stringify(map));
    }
  }
}

export const ACTOR_FLAGS = FLAG;
