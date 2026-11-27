// Partida no navegador do aluno.
// - O próprio personagem anda na hora (física local idêntica à do servidor).
// - Os colegas e os vírus são extrapolados a partir da última âncora recebida, usando o relógio
//   sincronizado: o boneco do colega aparece onde ele está agora, sem buffer de interpolação.
import { TILE, PLAYER_RADIUS, VIRUS_RADIUS, PLAYER_SPEED, formatClock, freeTimeForStreak } from "../shared/constants.mjs";
import { advance, gridFromString, directionFor, distanceField, pathFromField, toCell } from "../shared/physics.mjs";
import { TEAMS, POWER_BY_ID, EVENT_BY_ID, EFFECT_LABELS, STATE_LABELS, ATLAS_FILES } from "../shared/catalog.mjs";
import { Renderer } from "./renderer.mjs";
import { ChallengeManager } from "./challenges.mjs";
import { OslabFrame } from "./oslab-frame.mjs";
import { gameShell } from "./views.mjs";

const FLAG = { INFECTED: 1, SHIELD: 2, PROTECTED: 4, FROZEN: 8, SPRINT: 16, NPC: 32, TEMP: 64, OFFLINE: 128 };
const KEYS = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] };
const DPAD = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const round1 = (v) => Math.round(v * 10) / 10;

export function iconStyle(icon) {
  if (!icon) return "";
  const col = icon.index % icon.columns;
  const row = Math.floor(icon.index / icon.columns);
  return `background-image:url('${ATLAS_FILES[icon.sheet]}');background-size:${icon.columns * 100}% ${icon.rows * 100}%;background-position:${(col * 100) / (icon.columns - 1)}% ${(row * 100) / (icon.rows - 1)}%`;
}

export class Game {
  constructor({ root, net, audio, roster, onLeave }) {
    this.root = root;
    this.net = net;
    this.audio = audio;
    this.roster = roster;
    this.onLeave = onLeave;
    this.actors = new Map();
    this.keys = [];
    this.dpad = null;
    this.lastSent = { ix: 0, iy: 0, at: 0 };
    this.seq = 0;
    this.self = null;
    this.offset = { x: 0, y: 0 };
    this.me = null;
    this.room = null;
    this.challengeSerial = null;
    this.choiceId = null;
    this.hudAt = 0;
    this.stepAt = 0;
    this.toastTimer = null;
    this.teamWalls = null;
    this.seer = { at: 0, path: [] };
    this.destroyed = false;
    this.mount();
  }

  mount() {
    document.body.classList.add("maze-game-active");
    this.root.innerHTML = gameShell;
    this.$ = (selector) => this.root.querySelector(selector);
    this.canvas = this.$(".maze-canvas");
    this.renderer = new Renderer(this.canvas);
    this.challenges = new ChallengeManager({
      host: this.$(".maze-challenge-host"),
      submit: (serial, response) => this.net.request("ans", { serial, response }),
      skip: (serial) => this.net.request("skip", { serial }),
      sound: (kind) => this.audio.play(kind),
      serverNow: () => this.net.serverNow(),
    });
    this.$("[data-maze-action='toggle-sound']").textContent = this.audio.enabled ? "🔊 Som ligado" : "🔇 Som desligado";
    this.onKeyDown = (event) => this.keyDown(event);
    this.onKeyUp = (event) => this.keyUp(event);
    this.onBlur = () => { this.keys = []; this.dpad = null; };
    this.onResize = () => this.renderer.resize();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onBlur);
    this.root.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("[data-direction]");
      if (!button) return;
      event.preventDefault();
      this.dpad = button.dataset.direction;
      button.setPointerCapture?.(event.pointerId);
      this.audio.unlock();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) this.root.addEventListener(type, (event) => { if (event.target.closest?.("[data-direction]")) this.dpad = null; });
    this.root.addEventListener("click", (event) => this.click(event));
    this.canvas.tabIndex = 0;
    this.canvas.focus();
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
    // Aquece o cache do OSLab em segundo plano, em horários diferentes para cada aluno.
    this.prefetchTimer = setTimeout(() => OslabFrame.prefetch(), 8000 + Math.random() * 40000);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.prefetchTimer);
    this.challenges.close();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onBlur);
    document.body.classList.remove("maze-game-active");
  }

  // ---------------- dados do servidor ----------------
  setMap(msg) {
    const grid = gridFromString(msg.w, msg.h, msg.grid);
    this.map = { grid, exit: msg.exit, starts: msg.starts, decorations: msg.decorations };
    this.exitField = distanceField(grid, msg.exit.x, msg.exit.y);
    this.renderer.setMap(this.map);
    this.actors.clear();
  }

  setRoom(room) {
    this.room = room;
    this.updateScore();
  }

  setMe(msg) {
    const previous = this.me;
    this.me = msg;
    if (!this.self || msg.tv !== this.self.tv) this.snapTo(msg.x, msg.y, msg.tv);
    this.teamWalls = msg.walls?.length && this.map ? new Set(msg.walls.map((w) => w.y * this.map.grid.w + w.x)) : null;
    if (previous && previous.state !== msg.state) this.keys = [];

    const challenge = msg.challenge;
    if (challenge && challenge.serial !== this.challengeSerial) {
      this.challengeSerial = challenge.serial;
      this.keys = [];
      this.dpad = null;
      this.challenges.show(challenge, msg);
    } else if (!challenge && this.challengeSerial !== null) {
      this.challengeSerial = null;
      this.challenges.close();
      this.canvas.focus();
    }
    this.challenges.update(msg);
    const open = Boolean(challenge);
    this.$(".maze-challenge-layer").hidden = !open;
    this.$(".maze-game-shell").classList.toggle("is-challenge-open", open);

    const choice = msg.powerChoice;
    const layer = this.$(".maze-power-layer");
    if (choice && choice.id !== this.choiceId) {
      this.choiceId = choice.id;
      this.keys = [];
      layer.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="power-title"><span class="maze-kicker">Baú encontrado!</span><h2 id="power-title">ESCOLHA 1 DE 4 PODERES</h2><p>Escolha agora. <b data-choice-clock></b></p><div class="maze-power-options">${choice.ids.map((id) => {
        const power = POWER_BY_ID.get(id);
        return `<button type="button" data-power="${id}" class="${power.sabotage ? "is-sabotage" : power.lucky ? "is-lucky" : ""}"><span class="maze-power-icon" style="${iconStyle(power.icon)}" aria-hidden="true"></span><strong>${esc(power.name)}</strong><small>${esc(power.description)}</small><em>${power.sabotage ? "SABOTAGEM" : power.lucky ? "SORTE" : "PODER"}</em><b>ESCOLHER</b></button>`;
      }).join("")}</div></section>`;
      this.audio.play("chest");
      requestAnimationFrame(() => layer.querySelector("button")?.focus());
    } else if (!choice && this.choiceId) {
      this.choiceId = null;
      layer.innerHTML = "";
      this.canvas.focus();
    }
    layer.hidden = !choice;
    this.hudAt = 0;
  }

  snapTo(x, y, tv) {
    const old = this.self;
    if (old && Math.hypot(old.x + this.offset.x - x, old.y + this.offset.y - y) < 2.5 * TILE) this.offset = { x: old.x + this.offset.x - x, y: old.y + this.offset.y - y };
    else this.offset = { x: 0, y: 0 };
    this.self = { x, y, dir: old?.dir || "down", tv, moving: false };
    this.lastSent = { ix: 0, iy: 0, at: 0 };
  }

  onCorrection(msg) { this.snapTo(msg.x, msg.y, msg.tv); if (this.me) this.me.tv = msg.tv; }

  onAnchors(batch) {
    if (!this.map) return;
    const at = batch[1];
    const now = this.net.serverNow();
    for (let i = 2; i + 8 <= batch.length; i += 8) {
      const [id, x, y, ix, iy, spd, flags, lim] = batch.slice(i, i + 8);
      const npc = Boolean(flags & FLAG.NPC);
      const info = this.roster.get(id);
      const sim = { x, y, dir: this.actors.get(id)?.dir || "down" };
      let travelled = 0;
      if (spd > 0 && (ix || iy)) {
        let seconds = Math.max(0, Math.min(0.6, (now - at) / 1000));
        if (lim > 0) seconds = Math.min(seconds, lim / spd);
        const bx = sim.x;
        const by = sim.y;
        advance(this.map.grid, sim, ix, iy, spd, seconds, npc ? VIRUS_RADIUS : PLAYER_RADIUS, this.wallsForActor(info));
        travelled = Math.abs(sim.x - bx) + Math.abs(sim.y - by);
      }
      sim.dir = directionFor(ix, iy, sim.dir);
      const old = this.actors.get(id);
      let ex = 0;
      let ey = 0;
      if (old) {
        ex = old.x + old.ex - sim.x;
        ey = old.y + old.ey - sim.y;
        if (Math.hypot(ex, ey) > 2.5 * TILE) { ex = 0; ey = 0; }
      }
      const wasInfected = old ? old.flags & FLAG.INFECTED : flags & FLAG.INFECTED;
      this.actors.set(id, { id, x: sim.x, y: sim.y, dir: sim.dir, ix, iy, spd, flags, lim, travelled, ex, ey, npc, moving: spd > 0 && Boolean(ix || iy), infectedAt: !wasInfected && flags & FLAG.INFECTED ? performance.now() : old?.infectedAt || 0 });
    }
  }

  onGone(list) { for (const id of list.slice(1)) this.actors.delete(id); }

  wallsForActor(info) { return info && this.me && info.team === this.me.team && this.me.state !== "INFECTED" ? this.teamWalls : null; }

  onEvent(evt) {
    const sounds = { infection: "caught", escape: "victory", power: "power", timeout: "wrong", meteor: "wrong", trap: "caught", shield: "power", sabotage: "event-danger" };
    if (sounds[evt.kind]) this.audio.play(sounds[evt.kind]);
    if (evt.kind === "random-event") {
      const event = EVENT_BY_ID.get(evt.eventId);
      this.audio.play(event.kind === "help" ? "event-help" : "event-danger");
      this.banner(event);
    } else if (evt.kind === "power") this.toast(evt.name, evt.description);
    else if (evt.kind === "infection") this.toast("VOCÊ FOI INFECTADO!", "Agora você é um vírus: capture os exploradores das outras equipes.");
    else if (evt.kind === "escape") this.toast("VOCÊ ENCONTROU A SAÍDA!", "Clique no mapa para acompanhar outros colegas.");
    else if (evt.kind === "timeout") this.toast("Proteção encerrada", "Um erro foi registrado. Continue tentando: agora os vírus podem pegar você.");
    else if (evt.kind === "trap") this.toast("SAÍDA FALSA!", "Era uma armadilha digital de outra equipe.");
    else if (evt.kind === "teleport") this.toast("TELEPORTE!", "Um poder mudou sua posição no labirinto.");
    else if (evt.kind === "shield") this.toast("ESCUDO!", "Seu escudo bloqueou o vírus.");
    else if (evt.kind === "meteor") this.toast("Meteoro!", "Você perdeu 3 segundos.");
    else if (evt.kind === "released") this.toast("Liberado pelo professor", "Você ganhou 30 segundos para explorar.");
    else if (evt.kind === "sabotage") { const p = POWER_BY_ID.get(evt.powerId); const team = TEAMS.find((t) => t.id === evt.by); this.toast(`Sabotagem da equipe ${team?.name || ""}!`, p ? `${p.name}: ${p.description}` : ""); }
    else if (evt.kind === "infected" && evt.playerId !== this.me?.id) this.feed(`🦠 ${evt.name} foi infectado`);
    else if (evt.kind === "escaped" && evt.playerId !== this.me?.id) this.feed(`🏁 ${evt.name} escapou!`);
  }

  toast(title, message) {
    const box = this.$(".maze-power-toast");
    clearTimeout(this.toastTimer);
    box.hidden = false;
    box.innerHTML = `<strong>${esc(title)}</strong><span>${esc(message)}</span>`;
    this.toastTimer = setTimeout(() => { box.hidden = true; }, 4200);
  }

  banner(event) {
    const box = this.$(".maze-event-banner");
    box.hidden = false;
    box.className = `maze-event-banner is-${event.kind}`;
    box.innerHTML = `<span class="maze-event-icon" style="${iconStyle(event.icon)}" aria-hidden="true"></span><span><small>${event.kind === "help" ? "AJUDA PARA TODOS" : "AMEAÇA NO LABIRINTO"}</small><strong>${esc(event.name)}</strong><b>${esc(event.description)}</b></span>`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { box.hidden = true; }, 4500);
  }

  feed(text) {
    const list = this.$("[data-feed]");
    const item = document.createElement("li");
    item.textContent = text;
    list.prepend(item);
    while (list.children.length > 4) list.lastChild.remove();
    setTimeout(() => item.remove(), 9000);
  }

  // ---------------- entrada ----------------
  keyDown(event) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) || event.target.closest?.(".maze-challenge-layer")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!KEYS[key]) return;
    if (this.me?.challenge || this.me?.powerChoice) return;
    event.preventDefault();
    this.audio.unlock();
    this.keys = this.keys.filter((k) => k !== key);
    this.keys.push(key);
  }

  keyUp(event) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    this.keys = this.keys.filter((k) => k !== key);
  }

  // A última tecla pressionada tem prioridade; uma segunda tecla perpendicular ajuda a virar.
  input() {
    if (this.dpad) return DPAD[this.dpad];
    if (!this.keys.length) return [0, 0];
    const [lx, ly] = KEYS[this.keys[this.keys.length - 1]];
    let ix = lx;
    let iy = ly;
    for (let i = this.keys.length - 2; i >= 0; i -= 1) {
      const [kx, ky] = KEYS[this.keys[i]];
      if (lx === 0 && kx !== 0 && ix === lx) { ix = kx; break; }
      if (ly === 0 && ky !== 0 && iy === ly) { iy = ky; break; }
    }
    return [ix, iy];
  }

  canMove(T) {
    const m = this.me;
    if (!m || !this.net.open || !this.map) return false;
    if (m.effects.freezeUntil > T || m.effects.stunUntil > T) return false;
    if (m.state === "EXPLORING") return !m.interaction && !m.challenge;
    if (m.state === "INFECTED") return m.controlled && T - m.infectedAt >= 300;
    return false;
  }

  speed(T) {
    const m = this.me;
    if (m.state === "INFECTED") return m.virusSpeed;
    return PLAYER_SPEED * (m.effects.speedUntil > T ? 2 : 1) * (m.effects.slowUntil > T ? 0.5 : 1);
  }

  click(event) {
    const action = event.target.closest("[data-maze-action]")?.dataset.mazeAction;
    if (action === "toggle-sound") { const on = this.audio.toggle(); event.target.textContent = on ? "🔊 Som ligado" : "🔇 Som desligado"; return; }
    if (action === "fullscreen") { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else this.$(".maze-game-shell").requestFullscreen?.().catch(() => {}); return; }
    if (action === "leave") { this.onLeave(); return; }
    const power = event.target.closest("[data-power]");
    if (power && this.me?.powerChoice) {
      this.root.querySelectorAll("[data-power]").forEach((b) => { b.disabled = true; });
      this.net.request("pow", { powerId: power.dataset.power, choiceId: this.me.powerChoice.id }).catch((error) => { this.toast("Não foi possível", error.message); this.root.querySelectorAll("[data-power]").forEach((b) => { b.disabled = false; }); });
      return;
    }
    if (event.target === this.canvas && this.me?.state === "ESCAPED") {
      const options = [...this.roster.values()].filter((p) => !p.removed && p.state !== "ESCAPED");
      const index = options.findIndex((p) => p.id === this.watch);
      this.watch = options[(index + 1) % options.length]?.id || null;
      this.net.request("watch", { playerId: this.watch }).catch(() => {});
      this.actors.clear();
    }
  }

  // ---------------- quadro a quadro ----------------
  frame(now) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (!this.map || !this.me || !this.self || document.hidden) return;
    const T = this.net.serverNow();
    const me = this.me;
    const walls = me.state === "INFECTED" ? null : this.teamWalls;

    if (this.canMove(T)) {
      let [ix, iy] = this.input();
      if (me.effects.invertUntil > T) { ix = -ix; iy = -iy; }
      const changed = ix !== this.lastSent.ix || iy !== this.lastSent.iy;
      if (changed || ((ix || iy) && now - this.lastSent.at > 300)) {
        this.net.send([++this.seq, round1(this.self.x), round1(this.self.y), ix, iy, this.self.tv]);
        this.lastSent = { ix, iy, at: now };
      }
      this.self.moving = advance(this.map.grid, this.self, ix, iy, this.speed(T), dt, PLAYER_RADIUS, walls);
      if (this.self.moving && now - this.stepAt > 190) { this.audio.play("step"); this.stepAt = now; }
    } else {
      this.self.moving = false;
      if (this.lastSent.ix || this.lastSent.iy) { this.net.send([++this.seq, round1(this.self.x), round1(this.self.y), 0, 0, this.self.tv]); this.lastSent = { ix: 0, iy: 0, at: now }; }
    }
    const decay = Math.exp(-dt / 0.1);
    this.offset.x *= decay;
    this.offset.y *= decay;

    for (const a of this.actors.values()) {
      a.moving = false;
      if (a.spd > 0 && (a.ix || a.iy)) {
        let seconds = dt;
        if (a.lim > 0) seconds = Math.min(dt, Math.max(0, a.lim - a.travelled) / a.spd);
        if (seconds > 0) {
          const bx = a.x;
          const by = a.y;
          a.moving = advance(this.map.grid, a, a.ix, a.iy, a.spd, seconds, a.npc ? VIRUS_RADIUS : PLAYER_RADIUS, this.wallsForActor(this.roster.get(a.id)));
          a.travelled += Math.abs(a.x - bx) + Math.abs(a.y - by);
        }
      }
      a.ex *= decay;
      a.ey *= decay;
    }
    this.draw(now, T);
    if (now - this.hudAt > 200) { this.hudAt = now; this.updateHud(T); this.challenges.update(me); }
  }

  draw(now, T) {
    const me = this.me;
    const pos = { x: this.self.x + this.offset.x, y: this.self.y + this.offset.y };
    const actors = [];
    for (const a of this.actors.values()) {
      const info = this.roster.get(a.id);
      actors.push({
        id: a.id, x: a.x + a.ex, y: a.y + a.ey, dir: a.dir, moving: a.moving, npc: a.npc, name: info?.name, team: info?.team,
        infected: Boolean(a.flags & FLAG.INFECTED), shielded: Boolean(a.flags & FLAG.SHIELD), protected: Boolean(a.flags & FLAG.PROTECTED),
        frozen: Boolean(a.flags & FLAG.FROZEN), sprinting: Boolean(a.flags & FLAG.SPRINT), temporary: Boolean(a.flags & FLAG.TEMP), offline: Boolean(a.flags & FLAG.OFFLINE),
        justInfected: a.infectedAt && now - a.infectedAt < 1000 ? (now - a.infectedAt) / 1000 : 0,
      });
    }
    let camera = pos;
    if (me.state === "ESCAPED") {
      const target = (this.watch && actors.find((a) => a.id === this.watch && !a.npc)) || actors.find((a) => !a.npc);
      if (target) camera = target;
    } else {
      actors.push({ id: me.id, x: pos.x, y: pos.y, dir: this.self.dir, moving: this.self.moving, local: true, name: me.name, team: me.team, infected: me.state === "INFECTED", shielded: me.effects.shield > 0, protected: me.state === "ANSWERING" && !me.questionExpired, frozen: me.effects.stunUntil > T || me.effects.freezeUntil > T });
    }
    if (me.effects.seerUntil > T && now - this.seer.at > 250) {
      this.seer.at = now;
      const field = this.teamWalls ? distanceField(this.map.grid, this.map.exit.x, this.map.exit.y, this.teamWalls) : this.exitField;
      const c = toCell(pos.x, pos.y);
      this.seer.path = [c, ...pathFromField(this.map.grid, field, c.x, c.y)];
    }
    const event = this.room?.activeEvent;
    const teamIndex = TEAMS.findIndex((t) => t.id === me.team);
    this.renderer.draw({
      time: now, serverTime: T, camera, me: pos, actors,
      chests: me.state === "INFECTED" ? [] : me.chests, bits: me.bits, meteors: me.meteors, walls: me.walls, phantoms: me.phantoms, fakeExit: me.fakeExit,
      seerPath: me.effects.seerUntil > T ? this.seer.path : [], compass: me.effects.compassUntil > T,
      blackout: me.effects.blackoutUntil > T && me.state !== "ESCAPED",
      wave: event?.id === "onda-antivirus" ? (T - event.startedAt) / 2000 : null,
      teamStart: me.state !== "INFECTED" && teamIndex >= 0 ? this.map.starts[teamIndex] : null,
    });
  }

  remaining(T) {
    const m = this.me;
    if (m.state === "EXPLORING" && !m.interaction) return Math.max(0, m.remaining - (T - m.at) / 1000);
    return m.remaining;
  }

  updateHud(T) {
    const m = this.me;
    const set = (selector, text) => { const el = this.$(selector); if (el && el.textContent !== text) el.textContent = text; };
    const remaining = this.remaining(T);
    set("[data-maze-time]", m.state === "INFECTED" ? "VÍRUS" : m.state === "ESCAPED" ? "SALVO" : formatClock(remaining));
    this.$("[data-maze-time-bar]").style.width = `${m.state === "EXPLORING" ? Math.min(100, (remaining / Math.max(1, m.freeTime)) * 100) : 0}%`;
    this.$(".maze-time-card").classList.toggle("is-urgent", m.state === "EXPLORING" && remaining <= 5);
    set("[data-maze-streak]", String(m.streak));
    set("[data-maze-next]", `Próximo acerto: ${freeTimeForStreak(m.streak + 1)}s`);
    set("[data-maze-status]", STATE_LABELS[m.state] || m.state);
    set("[data-maze-status-detail]", m.state === "INFECTED" ? (m.controlled ? "Use as setas para perseguir." : "O jogo controla seu vírus.") : m.state === "ESCAPED" ? "Clique no mapa para trocar de colega." : this.net.open ? "O relógio é individual." : "Reconectando…");
    const team = TEAMS.find((t) => t.id === m.team);
    set(".maze-location-chip strong", `${team?.symbol || ""} ${team?.name.toUpperCase() || ""} • ${m.name}`);
    set(".maze-hud-objective strong", m.state === "INFECTED" ? "Infecte exploradores!" : m.state === "ESCAPED" ? "Você encontrou a saída!" : "Encontre a saída!");
    set(".maze-hud-objective p", m.state === "ESCAPED" ? "Sua equipe agradece! Acompanhe os colegas." : m.state === "INFECTED" ? "Pegue jogadores de outras equipes." : "Explore os corredores, abra baús e fuja dos vírus.");
    const active = Object.entries(EFFECT_LABELS).filter(([key]) => m.effects[key] > T).map(([key, label]) => `${label} ${Math.ceil((m.effects[key] - T) / 1000)}s`);
    set("[data-maze-power-status]", active.join(" • ") || `${m.effects.shield || 0} escudo(s) • ${m.chests.length} baús restantes`);
    set("[data-maze-virus-status]", `${this.room?.viruses ?? 1} vírus ativos`);
    const badge = this.$(".online-effect-badge");
    badge.hidden = !active.length;
    if (active.length) set(".online-effect-badge", active.join(" • "));
    const clock = this.$("[data-choice-clock]");
    if (clock && m.powerChoice) clock.textContent = `Faltam ${Math.max(0, Math.ceil((m.powerChoice.until - T) / 1000))}s`;
    const lag = this.$("[data-lag]");
    if (lag) { const ms = Math.round(this.net.rtt); lag.textContent = this.net.open ? `${ms} ms` : "sem conexão"; lag.dataset.level = !this.net.open || ms > 350 ? "bad" : ms > 200 ? "mid" : "good"; }
  }

  updateScore() {
    const box = this.$("[data-score]");
    if (!box || !this.room) return;
    box.innerHTML = this.room.scoreboard.map((t) => `<div class="score-row" style="--team-color:${t.color}"><strong>${t.symbol} ${esc(t.name)}</strong><b>${t.escaped} salvos</b><small>${t.exploring} explorando • ${t.infected} infectados</small></div>`).join("");
  }
}
