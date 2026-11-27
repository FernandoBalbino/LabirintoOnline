// Poderes, sabotagens, eventos aleatórios e teleportes seguros (mesmas regras do original).
import { TILE, MIN_VIRUS_SPEED, PERSONAL_CHESTS } from "../shared/constants.mjs";
import { POWERS, POWER_BY_ID, EVENTS } from "../shared/catalog.mjs";
import { distanceField, pathFromField, canOccupy, cellCenter, toCell, isWall } from "../shared/physics.mjs";

const explorer = (p) => !p.removed && (p.state === "EXPLORING" || p.state === "ANSWERING");
const extend = (room, target, key, seconds) => { target.effects[key] = Math.max(target.effects[key] || 0, room.now() + seconds * 1000); };
const cellOf = (body) => toCell(body.x, body.y);
const fieldAt = (room, field, body) => { const c = cellOf(body); return field[c.y * room.grid.w + c.x] ?? -1; };

export function teleport(room, p, destination, { notice = true } = {}) {
  if (!destination) return false;
  p.x = destination.x;
  p.y = destination.y;
  extend(room, p, "immuneUntil", 1);
  room.forceStop(p);
  if (notice) room.notify(p, { kind: "teleport" });
  return true;
}

// Teleporte punitivo: nunca aproxima da saída, exige 60% da maior distância, evita ocupações e vírus.
export function safeTeleportDestination(room, p, { reserved = [], avoidViruses = true, minSeparation = 3 } = {}) {
  const extra = room.wallsFor(p.team);
  const field = room.exitFieldFor(p.team);
  let maximum = 0;
  for (const value of field) if (value > maximum) maximum = value;
  const current = fieldAt(room, field, p);
  const threshold = Math.max(current, Math.ceil(maximum * 0.6));
  const base = room.exitField;
  const baseThreshold = Math.max(fieldAt(room, base, p), Math.ceil(room.maxDistance * 0.6));
  const virusBodies = [
    ...room.viruses.filter((v) => v.respawnAt <= room.now()),
    ...room.activePlayers().filter((other) => other.state === "INFECTED"),
  ];
  const virusFields = avoidViruses ? virusBodies.map((v) => { const c = cellOf(v); return distanceField(room.grid, c.x, c.y, extra); }) : [];
  const occupied = [
    ...room.activePlayers().filter((other) => other !== p && other.state !== "ESCAPED").map(cellOf),
    ...reserved,
  ];
  const w = room.grid.w;
  const pick = (separation) => {
    const list = [];
    for (let index = 0; index < field.length; index += 1) {
      if (field[index] < threshold || base[index] < baseThreshold) continue;
      const x = index % w;
      const y = (index - x) / w;
      if (x === room.exit.x && y === room.exit.y) continue;
      const center = cellCenter(x, y);
      if (!canOccupy(room.grid, center.x, center.y, undefined, extra)) continue;
      if (occupied.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < separation)) continue;
      if (!virusFields.every((vf) => vf[index] === -1 || vf[index] >= 6)) continue;
      list.push(index);
    }
    return list;
  };
  let candidates = pick(minSeparation);
  if (!candidates.length) candidates = pick(1);
  if (!candidates.length) return null;
  const farthest = Math.max(...candidates.map((index) => field[index]));
  candidates = candidates.filter((index) => field[index] >= Math.max(threshold, farthest * 0.9));
  const index = room.random.pick(candidates);
  return cellCenter(index % w, Math.floor(index / w));
}

export function addBonusChests(room, p, count = 2) {
  const field = room.exitField;
  const w = room.grid.w;
  const floor = room.floorCells;
  let added = 0;
  const far = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) >= d;
  for (let attempt = 0; attempt < 6 && added < count; attempt += 1) {
    const candidates = room.random.shuffle(floor).filter((c) => (
      field[c.y * w + c.x] > 7
      && far(c, room.exit, 5)
      && room.teamStarts.every((s) => far(c, s, 8))
      && p.chests.every((other) => far(c, other, 5))
      && !room.viruses.some((v) => Math.hypot(v.x - cellCenter(c.x, c.y).x, v.y - cellCenter(c.x, c.y).y) < TILE * 2)
    ));
    const chosen = [];
    for (const c of candidates) {
      if (chosen.length >= count - added) break;
      if (chosen.every((other) => far(c, other, 7))) chosen.push(c);
    }
    for (const c of chosen) p.chests.push({ id: `${p.id}-b${p.nextChest++}`, x: c.x, y: c.y, opened: false });
    added += chosen.length;
  }
  return added;
}

export const initialChests = (room, p) => addBonusChests(room, p, PERSONAL_CHESTS);

function randomNearby(room, p, count) {
  const extra = room.wallsFor(p.team);
  const c = cellOf(p);
  const field = distanceField(room.grid, c.x, c.y, extra);
  const list = [];
  for (let index = 0; index < field.length; index += 1) {
    const x = index % room.grid.w;
    const y = (index - x) / room.grid.w;
    if (field[index] >= 3 && field[index] <= 18 && (x !== room.exit.x || y !== room.exit.y)) list.push({ x, y });
  }
  return room.random.shuffle(list).slice(0, count);
}

export function addSafeWall(room, team, near) {
  const extra = room.wallsFor(team);
  const origin = cellOf(near);
  const candidates = room.random.shuffle(room.floorCells.filter((c) => {
    const d = Math.abs(c.x - origin.x) + Math.abs(c.y - origin.y);
    return d >= 2 && d <= 7 && !extra.has(c.y * room.grid.w + c.x);
  }));
  for (const c of candidates) {
    if (c.x === room.exit.x && c.y === room.exit.y) continue;
    const center = cellCenter(c.x, c.y);
    if (room.activePlayers().some((p) => p.state !== "ESCAPED" && Math.hypot(p.x - center.x, p.y - center.y) < TILE)) continue;
    if (room.viruses.some((v) => Math.hypot(v.x - center.x, v.y - center.y) < TILE)) continue;
    const test = new Set(extra);
    test.add(c.y * room.grid.w + c.x);
    const field = distanceField(room.grid, room.exit.x, room.exit.y, test);
    const ok = room.activePlayers().filter((p) => p.team === team && explorer(p)).every((p) => fieldAt(room, field, p) >= 0);
    if (ok) {
      room.addWall({ x: c.x, y: c.y, team, until: room.now() + 12_000 });
      return c;
    }
  }
  return null;
}

function forwardJump(room, p, steps) {
  const extra = room.wallsFor(p.team);
  const field = room.exitFieldFor(p.team);
  const c = cellOf(p);
  const path = pathFromField(room.grid, field, c.x, c.y);
  const target = path[Math.min(steps, Math.max(0, path.length - 2))];
  if (target && !isWall(room.grid, target.x, target.y, extra)) teleport(room, p, cellCenter(target.x, target.y));
}

export function choosePower(room, p, powerId) {
  const power = POWER_BY_ID.get(powerId);
  if (!power) throw new Error("Poder inválido.");
  const T = room.now();
  const enemies = room.activePlayers().filter((other) => explorer(other) && other.team !== p.team);
  const addTime = (seconds) => { p.remaining += seconds; p.freeTime = Math.max(p.freeTime, p.remaining); };
  const viruses = () => [...room.viruses, ...room.activePlayers().filter((other) => other.state === "INFECTED")];
  const apply = (id) => {
    if (id === "escudo") p.effects.shield = (p.effects.shield || 0) + 1;
    if (id === "turbo") extend(room, p, "speedUntil", 10);
    if (id === "tempo") addTime(15);
    if (id === "vidente") extend(room, p, "seerUntil", 5);
    if (id === "bussola") extend(room, p, "compassUntil", 10);
    if (id === "invisibilidade") extend(room, p, "invisibleUntil", 8);
    if (id === "antivirus") {
      for (const v of viruses()) {
        if (v.isPlayer) { extend(room, v, "stunUntil", 4.5); room.dirtyMe(v); }
        else {
          v.respawnAt = T + 4500;
          v.sprinting = false;
          v.path = [];
          const destination = safeTeleportDestination(room, { team: p.team, x: v.x, y: v.y, id: "npc" });
          if (destination) { v.x = destination.x; v.y = destination.y; }
          room.markAnchor(v);
        }
      }
    }
    if (id === "congelar") for (const v of viruses()) { if (v.isPlayer) { extend(room, v, "stunUntil", 8); room.dirtyMe(v); } else { v.frozenUntil = Math.max(v.frozenUntil || 0, T + 8000); room.markAnchor(v); } }
    if (id === "lentidao") for (const v of viruses()) { if (v.isPlayer) { v.virusSpeed = Math.max(MIN_VIRUS_SPEED, v.virusSpeed * 0.72); room.dirtyMe(v); } else v.speed = Math.max(MIN_VIRUS_SPEED, v.speed * 0.72); }
    if (id === "teleporte") forwardJump(room, p, 14);
    if (id === "salto-sorte") forwardJump(room, p, 12 + room.random.int(19));
  };
  if (!power.sabotage && !power.lucky) apply(powerId);
  if (powerId === "dado-tempo") addTime([10, 20, 30][room.random.int(3)]);
  if (powerId === "salto-sorte") apply(powerId);
  if (powerId === "bau-duplicador" && addBonusChests(room, p) < 2) addTime(15);
  if (powerId === "combo-surpresa") {
    const pool = POWERS.filter((x) => ["escudo", "turbo", "vidente", "congelar", "invisibilidade", "bussola", "lentidao"].includes(x.id));
    room.random.shuffle(pool).slice(0, 2).forEach((x) => apply(x.id));
  }
  if (powerId === "trilha-premiada") {
    const c = cellOf(p);
    const path = pathFromField(room.grid, room.exitFieldFor(p.team), c.x, c.y);
    const usable = path.slice(3, Math.max(3, path.length - 1));
    const stride = Math.max(1, Math.floor(usable.length / 5));
    p.bits = [];
    for (let i = 0; i < usable.length && p.bits.length < 5; i += stride) p.bits.push({ id: `bit-${p.id}-${T}-${i}`, x: usable[i].x, y: usable[i].y });
    p.effects.bitsUntil = T + 20_000;
    if (!p.bits.length) addTime(10);
  }
  const sabotage = { inverter: ["invertUntil", 8], apagao: ["blackoutUntil", 6], "congelamento-coletivo": ["freezeUntil", 4], maldicao: ["slowUntil", 10], fantasma: ["phantomUntil", 10] }[powerId];
  if (sabotage) {
    for (const enemy of enemies) {
      extend(room, enemy, ...sabotage);
      if (powerId === "fantasma") enemy.phantoms = randomNearby(room, enemy, 6);
      if (powerId === "congelamento-coletivo") room.forceStop(enemy);
      room.dirtyMe(enemy);
      room.notify(enemy, { kind: "sabotage", powerId, by: p.team });
    }
  }
  if (powerId === "muralha") for (const enemy of enemies) { addSafeWall(room, enemy.team, enemy); room.notify(enemy, { kind: "sabotage", powerId, by: p.team }); }
  if (powerId === "saida-falsa") {
    for (const enemy of enemies) {
      const options = randomNearby(room, enemy, 20).filter((c) => room.exitField[c.y * room.grid.w + c.x] > 12);
      if (options.length) { enemy.fakeExit = { ...room.random.pick(options), until: T + 15_000 }; room.dirtyMe(enemy); }
    }
  }
  if (["caos", "separacao", "troca"].includes(powerId)) {
    const targets = powerId === "separacao"
      ? enemies.filter((a) => enemies.some((b) => a !== b && room.pathLength(cellOf(a), cellOf(b)) <= 12))
      : enemies;
    const original = targets.map((e) => ({ x: e.x, y: e.y }));
    const reserved = [];
    const shift = targets.length > 1 ? 1 + room.random.int(targets.length - 1) : 1;
    targets.forEach((target, i) => {
      let destination = null;
      if (powerId === "troca" && targets.length > 1) {
        const candidate = original[(i + shift) % targets.length];
        const field = room.exitFieldFor(target.team);
        let maximum = 0;
        for (const value of field) if (value > maximum) maximum = value;
        const d = fieldAt(room, field, candidate);
        const farEnough = d >= Math.max(fieldAt(room, field, target), maximum * 0.6)
          && fieldAt(room, room.exitField, candidate) >= Math.max(fieldAt(room, room.exitField, target), room.maxDistance * 0.6);
        const cc = cellOf(candidate);
        const virusFar = !viruses().some((v) => Math.hypot(v.x - candidate.x, v.y - candidate.y) < TILE * 6);
        if (farEnough && virusFar && !reserved.some((r) => r.x === cc.x && r.y === cc.y)) destination = candidate;
      }
      destination ||= safeTeleportDestination(room, target, { reserved, minSeparation: powerId === "separacao" ? 12 : 3 });
      if (teleport(room, target, destination, { notice: false })) reserved.push(cellOf(destination));
      room.notify(target, { kind: "sabotage", powerId, by: p.team });
    });
  }
  p.powerChoice = null;
  p.interaction = null;
  room.dirtyMe(p);
  room.notify(p, { kind: "power", powerId, name: power.name, description: power.description });
  room.markAnchor(p);
}

export function randomEvent(room) {
  const T = room.now();
  const available = EVENTS.filter((e) => e.id !== room.lastEventId && (room.config.powers || e.id !== "chuva-baus"));
  const event = room.random.pick(available);
  room.lastEventId = event.id;
  room.activeEvent = { id: event.id, startedAt: T, until: T + event.duration * 1000 };
  if (event.id === "virus-multiplicado") room.spawnTemporaryViruses(3, 15_000);
  if (event.id === "apagao-digital") for (const p of room.activePlayers().filter(explorer)) { extend(room, p, "blackoutUntil", 12); room.dirtyMe(p); }
  if (event.id === "chuva-baus") for (const p of room.activePlayers().filter(explorer)) { addBonusChests(room, p); room.dirtyMe(p); }
  if (event.id === "onda-antivirus") {
    for (const v of room.viruses) { v.frozenUntil = T + 10_000; room.markAnchor(v); }
    for (const p of room.activePlayers().filter((x) => x.state === "INFECTED")) { extend(room, p, "stunUntil", 10); room.dirtyMe(p); room.forceStop(p); }
  }
  room.broadcast({ t: "evt", kind: "random-event", eventId: event.id, until: room.activeEvent.until });
  room.dirtyRoomState();
}
