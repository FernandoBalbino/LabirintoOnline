// Renderizador do labirinto em Canvas 2D (visual do jogo original).
// O chão e as paredes são desenhados uma vez em blocos de 16×16 células e reaproveitados a cada quadro.
import { TILE } from "../shared/constants.mjs";
import { TEAMS } from "../shared/catalog.mjs";

const CHUNK = 16;
const ASSETS = "./assets/maze-game/";
const load = (src) => new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = src; });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FLOOR = ["#17334a", "#183d45", "#25334f", "#2d3049"];
const WALL = ["#0b1b2b", "#0a2430", "#111d35", "#191c34"];
const ROW = { down: 0, left: 1, right: 2, up: 3 };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.camera = { x: 0, y: 0 };
    this.width = 1;
    this.height = 1;
    this.ratio = 1;
    this.chunks = new Map();
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    this.ready = Promise.all([
      load(`${ASSETS}player-sprites.webp`), load(`${ASSETS}lab-props.webp`), load(`${ASSETS}virus-power-atlas.webp`),
      load(`${ASSETS}maze-luck-event-atlas.webp`), load(`${ASSETS}maze-meteor-sprites.webp`), load(`${ASSETS}team-flags.svg`), load(`${ASSETS}infected-player-sprites.svg`),
    ]).then(([player, props, virus, luck, meteor, flags, infected]) => {
      Object.assign(this, { player, props, virus, luck, meteor, flags, infected });
      this.chunks.clear();
    });
    this.resize();
  }

  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, box.width);
    this.height = Math.max(1, box.height);
    this.ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
  }

  setMap(map) { this.map = map; this.chunks.clear(); }

  atlas(ctx, image, index, x, y, w, h, columns = 4, rows = 4) {
    if (!image) return;
    const sw = image.naturalWidth / columns;
    const sh = image.naturalHeight / rows;
    ctx.drawImage(image, (index % columns) * sw, Math.floor(index / columns) * sh, sw, sh, x, y, w, h);
  }

  chunk(cx, cy) {
    const key = cy * 1000 + cx;
    let canvas = this.chunks.get(key);
    if (canvas) { this.chunks.delete(key); this.chunks.set(key, canvas); return canvas; }
    // Mantém só os blocos usados recentemente (memória dos Chromebooks).
    if (this.chunks.size >= 24) this.chunks.delete(this.chunks.keys().next().value);
    const { grid } = this.map;
    canvas = document.createElement("canvas");
    canvas.width = CHUNK * TILE;
    canvas.height = CHUNK * TILE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < CHUNK; ty += 1) {
      for (let tx = 0; tx < CHUNK; tx += 1) {
        const x = cx * CHUNK + tx;
        const y = cy * CHUNK + ty;
        if (x >= grid.w || y >= grid.h) continue;
        const zone = (x >= grid.w / 2 ? 1 : 0) + (y >= grid.h / 2 ? 2 : 0);
        const sx = tx * TILE;
        const sy = ty * TILE;
        if (grid.cells[y * grid.w + x] === 0) {
          ctx.fillStyle = FLOOR[zone];
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = "rgba(255,255,255,.035)";
          ctx.fillRect(sx + 2, sy + 2, TILE - 4, 1);
          if ((x + y) % 4 === 0) { ctx.fillStyle = "rgba(98,229,195,.06)"; ctx.fillRect(sx + TILE - 7, sy + TILE - 7, 3, 3); }
        } else {
          ctx.fillStyle = WALL[zone];
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.fillStyle = "#294b64";
          ctx.fillRect(sx + 2, sy + 2, TILE - 4, 5);
          ctx.fillStyle = "rgba(0,0,0,.28)";
          ctx.fillRect(sx + 5, sy + TILE - 6, TILE - 5, 6);
          ctx.strokeStyle = "rgba(91,179,205,.12)";
          ctx.strokeRect(sx + 1.5, sy + 1.5, TILE - 3, TILE - 3);
        }
      }
    }
    if (this.props) {
      for (const d of this.map.decorations) {
        if (Math.floor(d.x / CHUNK) !== cx || Math.floor(d.y / CHUNK) !== cy) continue;
        this.atlas(ctx, this.props, d.prop, (d.x - cx * CHUNK) * TILE + 3, (d.y - cy * CHUNK) * TILE + 3, TILE - 6, TILE - 6);
      }
    }
    this.chunks.set(key, canvas);
    return canvas;
  }

  draw(view) {
    if (!this.map) return;
    const ctx = this.ctx;
    const { grid } = this.map;
    const worldW = grid.w * TILE;
    const worldH = grid.h * TILE;
    this.camera.x = worldW <= this.width ? (worldW - this.width) / 2 : clamp(view.camera.x - this.width / 2, 0, worldW - this.width);
    this.camera.y = worldH <= this.height ? (worldH - this.height) / 2 : clamp(view.camera.y - this.height / 2, 0, worldH - this.height);
    const cam = { x: Math.round(this.camera.x), y: Math.round(this.camera.y) };
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#07131f";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    const size = CHUNK * TILE;
    for (let cy = Math.max(0, Math.floor(cam.y / size)); cy <= Math.floor((cam.y + this.height) / size); cy += 1) {
      for (let cx = Math.max(0, Math.floor(cam.x / size)); cx <= Math.floor((cam.x + this.width) / size); cx += 1) {
        if (cx * CHUNK >= grid.w || cy * CHUNK >= grid.h) continue;
        ctx.drawImage(this.chunk(cx, cy), cx * size, cy * size);
      }
    }
    const t = view.time;
    this.drawWalls(ctx, view.walls);
    this.drawPhantoms(ctx, view.phantoms);
    this.drawSeer(ctx, view.seerPath);
    this.drawMeteors(ctx, view.meteors, view.serverTime, t);
    this.drawChests(ctx, view.chests, t);
    this.drawBits(ctx, view.bits, t);
    if (view.teamStart) this.drawMarker(ctx, view.teamStart, 14, "ENTRADA", "#62e5c3", t);
    this.drawMarker(ctx, this.map.exit, 13, "SAÍDA", "#ffb84d", t);
    if (view.fakeExit) this.drawMarker(ctx, view.fakeExit, 13, "SAÍDA", "#ffb84d", t);
    const visible = view.actors.filter((a) => Math.abs(a.x - cam.x - this.width / 2) < this.width / 2 + 90 && Math.abs(a.y - cam.y - this.height / 2) < this.height / 2 + 100);
    visible.sort((a, b) => a.y - b.y);
    for (const actor of visible) this.drawActor(ctx, actor, t);
    ctx.restore();
    if (view.compass) this.drawCompass(ctx, view.me, t);
    if (view.wave) this.drawWave(ctx, view.wave);
    if (view.blackout) this.drawBlackout(ctx, view.me, cam, t);
    this.drawVignette(ctx);
  }

  drawWalls(ctx, walls = []) {
    for (const w of walls) {
      const x = w.x * TILE;
      const y = w.y * TILE;
      ctx.fillStyle = "#3b1d4f";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#c37dff";
      ctx.fillRect(x + 2, y + 2, TILE - 4, 5);
      ctx.strokeStyle = "rgba(206,125,255,.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    }
  }

  drawPhantoms(ctx, phantoms = []) {
    for (const wall of phantoms) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#19384e";
      ctx.fillRect(wall.x * TILE, wall.y * TILE, TILE, TILE);
      ctx.fillStyle = "#47728c";
      ctx.fillRect(wall.x * TILE + 2, wall.y * TILE + 2, TILE - 4, 5);
      ctx.restore();
    }
  }

  drawSeer(ctx, path = []) {
    if (!path?.length) return;
    ctx.save();
    ctx.strokeStyle = "rgba(92,255,151,.88)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#58ff9c";
    ctx.shadowBlur = 13;
    ctx.setLineDash([10, 9]);
    ctx.beginPath();
    path.forEach((c, i) => { const x = (c.x + 0.5) * TILE; const y = (c.y + 0.5) * TILE; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.restore();
  }

  drawChests(ctx, chests = [], t) {
    for (const chest of chests) {
      const x = (chest.x + 0.5) * TILE;
      const y = (chest.y + 0.5) * TILE;
      const bob = this.reducedMotion ? 0 : Math.sin(t / 250 + chest.x) * 3;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#52d9e7";
      ctx.beginPath();
      ctx.arc(x, y, 29 + Math.sin(t / 180) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.atlas(ctx, this.virus, 5, x - 25, y - 23 + bob, 50, 42, 5, 4);
      const by = y - 47 + bob;
      ctx.save();
      ctx.fillStyle = "#f5ffff";
      ctx.strokeStyle = "#19aeb2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 29, by - 12, 58, 22, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#07515e";
      ctx.font = "800 9px 'Atkinson Hyperlegible', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PODERES", x, by + 3);
      ctx.restore();
    }
  }

  drawBits(ctx, bits = [], t) {
    for (const bit of bits) {
      const x = (bit.x + 0.5) * TILE;
      const y = (bit.y + 0.5) * TILE;
      const bob = this.reducedMotion ? 0 : Math.sin(t / 170 + bit.x) * 4;
      ctx.fillStyle = "rgba(92,239,255,.2)";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      this.atlas(ctx, this.luck, 4, x - 20, y - 20 + bob, 40, 40, 5, 2);
    }
  }

  drawMeteors(ctx, meteors = [], serverTime, t) {
    for (const meteor of meteors) {
      const x = (meteor.x + 0.5) * TILE;
      const y = (meteor.y + 0.5) * TILE;
      if (serverTime < meteor.hitAt) {
        const pulse = this.reducedMotion ? 0.72 : 0.55 + Math.sin(t / 90) * 0.2;
        ctx.save();
        ctx.strokeStyle = `rgba(255,121,55,${pulse})`;
        ctx.fillStyle = "rgba(255,65,45,.16)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        const fall = 1 - Math.max(0, (meteor.hitAt - serverTime) / 1200);
        this.atlas(ctx, this.meteor, fall < 0.55 ? 0 : 1, x - 34, y - 60 + fall * 20, 68, 68, 4, 1);
      } else {
        this.atlas(ctx, this.meteor, serverTime - meteor.hitAt < 200 ? 2 : 3, x - 35, y - 35, 70, 70, 4, 1);
      }
    }
  }

  drawMarker(ctx, cell, prop, label, color, t) {
    const x = (cell.x + 0.5) * TILE;
    const y = (cell.y + 0.5) * TILE;
    const pulse = 0.85 + Math.sin(t / 260) * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, TILE * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.atlas(ctx, this.props, prop, x - 27, y - 31, 54, 54);
    ctx.font = "700 10px 'Atkinson Hyperlegible', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, y + 26);
  }

  drawActor(ctx, a, t) {
    const frameMove = a.moving ? 1 + Math.floor(t / 135) % 3 : 0;
    ctx.save();
    if (a.npc) {
      const size = a.sprinting ? 64 : 56;
      if (a.frozen) { ctx.globalAlpha = 0.72; ctx.filter = "hue-rotate(130deg) brightness(1.45)"; }
      ctx.shadowColor = a.sprinting ? "#ff32d2" : "#3fdbe8";
      ctx.shadowBlur = a.sprinting ? 18 : 8;
      this.atlas(ctx, this.virus, Math.floor(t / 115) % 4, a.x - size / 2, a.y - size / 2, size, size, 5, 4);
      ctx.restore();
      if (a.sprinting && !a.frozen && !a.temporary) {
        ctx.fillStyle = "#ff84e7";
        ctx.font = "800 10px 'Atkinson Hyperlegible', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VÍRUS!", a.x, a.y - 34);
      }
      return;
    }
    const team = TEAMS.find((x) => x.id === a.team);
    if (a.protected) ctx.globalAlpha = 0.7;
    if (a.offline) ctx.globalAlpha = 0.45;
    if (a.infected) {
      if (a.frozen) ctx.filter = "hue-rotate(130deg) brightness(1.35)";
      this.atlas(ctx, this.infected, a.moving ? Math.floor(t / 135) % 4 : 0, a.x - 28, a.y - 39, 56, 56, 4, 1);
      ctx.filter = "none";
    } else if (this.player) {
      const sw = this.player.naturalWidth / 4;
      const sh = this.player.naturalHeight / 4;
      ctx.drawImage(this.player, frameMove * sw, (ROW[a.dir] ?? 0) * sh, sw, sh, Math.round(a.x - 32.5), Math.round(a.y - 43.5), 65, 65);
    }
    if (!a.infected && this.flags && team) this.atlas(ctx, this.flags, TEAMS.indexOf(team), a.x + 12, a.y - 59, 32, 32, 4, 1);
    if (a.shielded) {
      ctx.strokeStyle = "rgba(99,240,255,.9)";
      ctx.fillStyle = "rgba(76,223,238,.12)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#52d9e7";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(a.x, a.y - 5, 25 + Math.sin(t / 180) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (a.local) {
      ctx.strokeStyle = team?.color || "#62e5c3";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 9, 19, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (a.name) {
      const label = `${a.local ? "VOCÊ • " : ""}${a.name.length > 14 ? `${a.name.slice(0, 13)}…` : a.name}`;
      ctx.font = `${a.local ? 700 : 400} 12px 'Atkinson Hyperlegible', sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#07131f";
      ctx.strokeText(label, a.x, a.y - 61);
      ctx.fillStyle = a.local ? "#fff" : team?.color || "#fff";
      ctx.fillText(label, a.x, a.y - 61);
    }
    if (a.justInfected) {
      ctx.strokeStyle = "#ce7dff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(a.x, a.y - 10, 20 + a.justInfected * 25, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCompass(ctx, me, t) {
    const exitX = (this.map.exit.x + 0.5) * TILE;
    const exitY = (this.map.exit.y + 0.5) * TILE;
    const angle = Math.atan2(exitY - me.y, exitX - me.x);
    ctx.save();
    ctx.translate(this.width - 64, 72);
    ctx.fillStyle = "rgba(7,28,42,.86)";
    ctx.strokeStyle = "#62e5c3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34 + Math.sin(t / 220) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = "#ffb14f";
    ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawWave(ctx, progress) {
    if (progress >= 1) return;
    ctx.save();
    ctx.strokeStyle = `rgba(92,244,255,${0.85 - progress * 0.65})`;
    ctx.lineWidth = 8;
    ctx.shadowColor = "#54eaff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, 30 + progress * Math.max(this.width, this.height), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawBlackout(ctx, me, cam, t) {
    const x = me.x - cam.x;
    const y = me.y - cam.y;
    const radius = TILE * 4.5 + (this.reducedMotion ? 0 : Math.sin(t / 83) * 5);
    const gradient = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
    gradient.addColorStop(0, "rgba(0,3,10,0)");
    gradient.addColorStop(0.55, "rgba(0,3,10,.12)");
    gradient.addColorStop(1, "rgba(0,3,10,.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawVignette(ctx) {
    if (!this.vignette || this.vignetteSize !== `${this.width}x${this.height}`) {
      this.vignetteSize = `${this.width}x${this.height}`;
      this.vignette = ctx.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.22, this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.72);
      this.vignette.addColorStop(0, "rgba(0,0,0,0)");
      this.vignette.addColorStop(1, "rgba(0,6,14,.42)");
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}

// Minimapa do professor (toda a arena, ótimo para projetar na TV).
export class Minimap {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.base = null; }
  setMap(map) {
    this.map = map;
    const { grid } = map;
    const base = document.createElement("canvas");
    base.width = grid.w;
    base.height = grid.h;
    const ctx = base.getContext("2d");
    const image = ctx.createImageData(grid.w, grid.h);
    for (let i = 0; i < grid.cells.length; i += 1) {
      const wall = grid.cells[i] === 1;
      image.data.set(wall ? [11, 27, 43, 255] : [37, 70, 94, 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);
    this.base = base;
  }
  draw(actors, names, t) {
    if (!this.base) return;
    const box = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(box.width * ratio)) { this.canvas.width = Math.round(box.width * ratio); this.canvas.height = Math.round(box.height * ratio); }
    const ctx = this.ctx;
    const { grid, exit, starts } = this.map;
    const scale = Math.min(this.canvas.width / grid.w, this.canvas.height / grid.h);
    const ox = (this.canvas.width - grid.w * scale) / 2;
    const oy = (this.canvas.height - grid.h * scale) / 2;
    ctx.fillStyle = "#07131f";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, ox, oy, grid.w * scale, grid.h * scale);
    const dot = (cx, cy, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ox + cx * scale, oy + cy * scale, r, 0, Math.PI * 2); ctx.fill(); };
    starts.forEach((s, i) => dot(s.x + 0.5, s.y + 0.5, `${TEAMS[i].color}66`, scale * 2.2));
    dot(exit.x + 0.5, exit.y + 0.5, "#ffb84d", scale * (1.6 + Math.sin(t / 250) * 0.3));
    for (const a of actors) {
      const x = a.x / TILE;
      const y = a.y / TILE;
      if (a.npc || a.infected) { dot(x, y, "#ff4fd8", Math.max(3, scale * 0.9)); continue; }
      const team = TEAMS.find((tm) => tm.id === names.get(a.id)?.team);
      dot(x, y, team?.color || "#fff", Math.max(3.5, scale * 0.95));
      if (scale > 5) {
        ctx.font = `700 ${Math.round(10 * ratio)}px 'Atkinson Hyperlegible', sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(names.get(a.id)?.name?.split(" ")[0] || "", ox + x * scale, oy + y * scale - scale * 1.4);
      }
    }
  }
}
