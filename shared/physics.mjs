// Física determinística do labirinto.
// Colisão "encostando na parede": o resultado praticamente não depende do tamanho do passo,
// então servidor, o próprio aluno e os colegas calculam a mesma trajetória.
import { TILE, PLAYER_RADIUS, SIM_STEP } from "./constants.mjs";

const EPS = 1e-6;

export const cellIndex = (grid, x, y) => y * grid.w + x;

export function isWall(grid, tx, ty, extra = null) {
  if (tx < 0 || ty < 0 || tx >= grid.w || ty >= grid.h) return true;
  const index = ty * grid.w + tx;
  return grid.cells[index] === 1 || (extra !== null && extra.has(index));
}

export const toCell = (x, y) => ({ x: Math.floor(x / TILE), y: Math.floor(y / TILE) });
export const cellCenter = (cx, cy) => ({ x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE });

export function canOccupy(grid, x, y, radius = PLAYER_RADIUS, extra = null) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius - EPS) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius - EPS) / TILE);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) if (isWall(grid, tx, ty, extra)) return false;
  }
  return true;
}

function moveX(grid, x, y, dx, r, extra) {
  if (dx === 0) return x;
  const top = Math.floor((y - r) / TILE);
  const bottom = Math.floor((y + r - EPS) / TILE);
  const nx = x + dx;
  if (dx > 0) {
    const edge = Math.floor((nx + r - EPS) / TILE);
    for (let ty = top; ty <= bottom; ty += 1) {
      if (isWall(grid, edge, ty, extra)) return Math.max(x, Math.min(nx, edge * TILE - r));
    }
    return nx;
  }
  const edge = Math.floor((nx - r) / TILE);
  for (let ty = top; ty <= bottom; ty += 1) {
    if (isWall(grid, edge, ty, extra)) return Math.min(x, Math.max(nx, (edge + 1) * TILE + r));
  }
  return nx;
}

function moveY(grid, x, y, dy, r, extra) {
  if (dy === 0) return y;
  const left = Math.floor((x - r) / TILE);
  const right = Math.floor((x + r - EPS) / TILE);
  const ny = y + dy;
  if (dy > 0) {
    const edge = Math.floor((ny + r - EPS) / TILE);
    for (let tx = left; tx <= right; tx += 1) {
      if (isWall(grid, tx, edge, extra)) return Math.max(y, Math.min(ny, edge * TILE - r));
    }
    return ny;
  }
  const edge = Math.floor((ny - r) / TILE);
  for (let tx = left; tx <= right; tx += 1) {
    if (isWall(grid, tx, edge, extra)) return Math.min(y, Math.max(ny, (edge + 1) * TILE + r));
  }
  return ny;
}

// Um passo de movimento. Inclui a "quina assistida": se o aluno pede para virar e só
// falta alinhar alguns pixels com a abertura, o personagem desliza para o centro do corredor.
function step(grid, body, ix, iy, speed, dt, r, extra) {
  const distance = speed * dt;
  let x = body.x;
  let y = body.y;
  let dx = ix * distance;
  let dy = iy * distance;
  if (dx !== 0 && dy !== 0) {
    const freeX = moveX(grid, x, y, dx, r, extra) !== x;
    const freeY = moveY(grid, x, y, dy, r, extra) !== y;
    if (freeX && freeY) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  }
  const startX = x;
  const startY = y;
  x = moveX(grid, x, y, dx, r, extra);
  y = moveY(grid, x, y, dy, r, extra);

  if (iy !== 0 && y === startY) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const center = (tx + 0.5) * TILE;
    if (!isWall(grid, tx, ty + iy, extra) && Math.abs(x - center) > EPS && ix === 0) {
      const shift = Math.min(Math.abs(center - x), distance);
      x = moveX(grid, x, y, Math.sign(center - x) * shift, r, extra);
    }
  }
  if (ix !== 0 && x === startX) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const center = (ty + 0.5) * TILE;
    if (!isWall(grid, tx + ix, ty, extra) && Math.abs(y - center) > EPS && iy === 0) {
      const shift = Math.min(Math.abs(center - y), distance);
      y = moveY(grid, x, y, Math.sign(center - y) * shift, r, extra);
    }
  }
  // Centralização suave em corredores estreitos: o personagem anda no meio do caminho.
  if (ix === 0 && iy !== 0 && y !== startY) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const center = (tx + 0.5) * TILE;
    if (Math.abs(x - center) > EPS && isWall(grid, tx - 1, ty, extra) && isWall(grid, tx + 1, ty, extra)) {
      x = moveX(grid, x, y, Math.sign(center - x) * Math.min(Math.abs(center - x), distance * 0.5), r, extra);
    }
  } else if (iy === 0 && ix !== 0 && x !== startX) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const center = (ty + 0.5) * TILE;
    if (Math.abs(y - center) > EPS && isWall(grid, tx, ty - 1, extra) && isWall(grid, tx, ty + 1, extra)) {
      y = moveY(grid, x, y, Math.sign(center - y) * Math.min(Math.abs(center - y), distance * 0.5), r, extra);
    }
  }
  body.x = x;
  body.y = y;
}

export function directionFor(ix, iy, fallback = "down") {
  if (ix === 0 && iy === 0) return fallback;
  if (Math.abs(ix) >= Math.abs(iy) && ix !== 0) return ix > 0 ? "right" : "left";
  return iy > 0 ? "down" : "up";
}

/**
 * Avança um corpo {x, y, dir} por `seconds` com entrada constante.
 * Subdivide em passos de no máximo 1/60 s. Retorna true se mudou de lugar.
 */
export function advance(grid, body, ix, iy, speed, seconds, radius = PLAYER_RADIUS, extra = null) {
  if (seconds <= 0 || speed <= 0 || (ix === 0 && iy === 0)) return false;
  const beforeX = body.x;
  const beforeY = body.y;
  let remaining = Math.min(seconds, 2);
  while (remaining > EPS) {
    const dt = Math.min(SIM_STEP, remaining);
    step(grid, body, ix, iy, speed, dt, radius, extra);
    remaining -= dt;
  }
  body.dir = directionFor(ix, iy, body.dir);
  return body.x !== beforeX || body.y !== beforeY;
}

// Campo de distâncias (BFS em células) a partir de uma origem; -1 = inalcançável.
export function distanceField(grid, ox, oy, extra = null) {
  const total = grid.w * grid.h;
  const dist = new Int32Array(total).fill(-1);
  if (isWall(grid, ox, oy, extra)) return dist;
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const origin = oy * grid.w + ox;
  dist[origin] = 0;
  queue[tail++] = origin;
  const w = grid.w;
  while (head < tail) {
    const index = queue[head++];
    const d = dist[index] + 1;
    const x = index % w;
    const y = (index - x) / w;
    if (!isWall(grid, x + 1, y, extra) && dist[index + 1] === -1) { dist[index + 1] = d; queue[tail++] = index + 1; }
    if (!isWall(grid, x - 1, y, extra) && dist[index - 1] === -1) { dist[index - 1] = d; queue[tail++] = index - 1; }
    if (!isWall(grid, x, y + 1, extra) && dist[index + w] === -1) { dist[index + w] = d; queue[tail++] = index + w; }
    if (!isWall(grid, x, y - 1, extra) && dist[index - w] === -1) { dist[index - w] = d; queue[tail++] = index - w; }
  }
  return dist;
}

// Caminho de células da origem ao destino seguindo um campo de distâncias até o destino.
export function pathFromField(grid, field, fromX, fromY, maxSteps = 4000) {
  const path = [];
  let x = fromX;
  let y = fromY;
  let d = field[y * grid.w + x];
  if (d < 0) return path;
  while (d > 0 && path.length < maxSteps) {
    let moved = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
      const nd = field[ny * grid.w + nx];
      if (nd >= 0 && nd < d) { x = nx; y = ny; d = nd; path.push({ x, y }); moved = true; break; }
    }
    if (!moved) break;
  }
  return path;
}

export function shortestPath(grid, from, to, extra = null) {
  const field = distanceField(grid, to.x, to.y, extra);
  return pathFromField(grid, field, from.x, from.y);
}

export function gridFromString(w, h, text) {
  const cells = new Uint8Array(w * h);
  for (let i = 0; i < cells.length; i += 1) cells[i] = text.charCodeAt(i) === 49 ? 1 : 0;
  return { w, h, cells };
}

export function gridToString(grid) {
  let text = "";
  for (let i = 0; i < grid.cells.length; i += 1) text += grid.cells[i] ? "1" : "0";
  return text;
}
