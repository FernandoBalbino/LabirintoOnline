// Geração do labirinto da arena.
// 1) "Growing tree" (mistura de célula mais nova e aleatória): corredores longos e boas bifurcações.
// 2) Entrelaçamento: parte dos becos sem saída vira atalho, criando rotas de fuga dos vírus.
// 3) Saída perto do centro e entradas das equipes em cantos opostos com distâncias reais equilibradas.
import { createRandom } from "./rng.mjs";
import { distanceField, isWall } from "./physics.mjs";

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const PROP_INDEXES = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 15];

const odd = (value) => (value % 2 === 0 ? value + 1 : value);

function openNeighbors(grid, x, y) {
  let count = 0;
  for (const [dx, dy] of DIRS) if (!isWall(grid, x + dx, y + dy)) count += 1;
  return count;
}

export function generateMaze({ width = 69, height = 51, seed = "labirinto", braid = 0.35, newestBias = 0.55 } = {}) {
  const w = Math.max(21, odd(width));
  const h = Math.max(21, odd(height));
  const random = createRandom(`${seed}:maze`);
  const cells = new Uint8Array(w * h).fill(1);
  const grid = { w, h, cells };
  const startX = 1 + 2 * random.int((w - 1) / 2);
  const startY = 1 + 2 * random.int((h - 1) / 2);
  const active = [[startX, startY]];
  cells[startY * w + startX] = 0;

  while (active.length) {
    const index = random() < newestBias ? active.length - 1 : random.int(active.length);
    const [x, y] = active[index];
    const options = [];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx * 2;
      const ny = y + dy * 2;
      if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && cells[ny * w + nx] === 1) options.push([dx, dy]);
    }
    if (!options.length) { active.splice(index, 1); continue; }
    const [dx, dy] = random.pick(options);
    cells[(y + dy) * w + (x + dx)] = 0;
    cells[(y + dy * 2) * w + (x + dx * 2)] = 0;
    active.push([x + dx * 2, y + dy * 2]);
  }

  // Entrelaçamento: becos sem saída ganham uma segunda ligação.
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      if (openNeighbors(grid, x, y) !== 1 || random() > braid) continue;
      const choices = random.shuffle(DIRS).filter(([dx, dy]) => {
        const nx = x + dx * 2;
        const ny = y + dy * 2;
        return nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && cells[(y + dy) * w + (x + dx)] === 1;
      });
      // Prefere ligar a outro beco: elimina dois becos com uma abertura.
      choices.sort((a, b) => openNeighbors(grid, x + b[0] * 2, y + b[1] * 2) === 1 ? 1 : openNeighbors(grid, x + a[0] * 2, y + a[1] * 2) === 1 ? -1 : 0);
      const choice = choices[0];
      if (choice) cells[(y + choice[1]) * w + (x + choice[0])] = 0;
    }
  }

  const decorations = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      if (cells[y * w + x] !== 1 || random() > 0.06) continue;
      if (openNeighbors(grid, x, y) === 0) continue;
      decorations.push({ x, y, prop: random.pick(PROP_INDEXES) });
    }
  }
  return { ...grid, decorations };
}

function sectorsFor(teamCount, w, h) {
  const left = (c) => c.x < w * 0.3;
  const right = (c) => c.x > w * 0.7;
  const top = (c) => c.y < h * 0.3;
  const bottom = (c) => c.y > h * 0.7;
  const middleX = (c) => c.x > w * 0.3 && c.x < w * 0.7;
  if (teamCount === 2) return [(c) => left(c) && top(c), (c) => right(c) && bottom(c)];
  if (teamCount === 3) return [(c) => left(c) && top(c), (c) => right(c) && top(c), (c) => bottom(c) && middleX(c)];
  return [(c) => left(c) && top(c), (c) => right(c) && top(c), (c) => right(c) && bottom(c), (c) => left(c) && bottom(c)];
}

/**
 * Cria uma arena equilibrada. Retorna o labirinto, a saída, as entradas das equipes
 * e o campo de distâncias até a saída (usado em teleportes punitivos e baús).
 */
export function generateArena({ teamCount = 2, players = 2, mapSize = "auto", width = 69, height = 51, seed = "arena" } = {}) {
  const w = mapSize === "custom" ? width : players > 12 ? 101 : 69;
  const h = mapSize === "custom" ? height : players > 12 ? 75 : 51;
  let best = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const maze = generateMaze({ width: w, height: h, seed: `${seed}:${attempt}` });
    const random = createRandom(`${seed}:exit:${attempt}`);
    const floor = [];
    for (let y = 1; y < maze.h - 1; y += 1) for (let x = 1; x < maze.w - 1; x += 1) if (maze.cells[y * maze.w + x] === 0) floor.push({ x, y });
    const central = floor.filter((c) => Math.abs(c.x - maze.w / 2) < maze.w * 0.12 && Math.abs(c.y - maze.h / 2) < maze.h * 0.12);
    for (let trial = 0; trial < 10; trial += 1) {
      const exit = random.pick(central);
      const field = distanceField(maze, exit.x, exit.y);
      let maximum = 0;
      for (const value of field) if (value > maximum) maximum = value;
      const groups = sectorsFor(teamCount, maze.w, maze.h).map((inside) => floor.filter(inside));
      if (groups.some((group) => !group.length)) continue;
      const farthestPerGroup = groups.map((group) => Math.max(...group.map((c) => field[c.y * maze.w + c.x])));
      const target = Math.min(...farthestPerGroup);
      if (target < Math.max(30, maximum * 0.45)) continue;
      const starts = groups.map((group) => group.reduce((chosen, c) => {
        const delta = Math.abs(field[c.y * maze.w + c.x] - target);
        const chosenDelta = Math.abs(field[chosen.y * maze.w + chosen.x] - target);
        return delta < chosenDelta ? c : chosen;
      }));
      const lengths = starts.map((c) => field[c.y * maze.w + c.x]);
      const ratio = Math.max(...lengths) / Math.min(...lengths);
      if (!best || ratio < best.ratio) best = { ratio, maze, exit, starts, field, maximum };
      if (ratio <= 1.04) break;
    }
    if (best && best.ratio <= 1.04) break;
  }
  if (!best || best.ratio > 1.12) throw new Error("Não foi possível criar um mapa equilibrado. Tente outra configuração.");
  return { maze: best.maze, exit: best.exit, teamStarts: best.starts, exitField: best.field, maxDistance: best.maximum, balance: best.ratio };
}

// Células livres mais próximas (por caminho real) de uma âncora, sem repetir.
export function spawnCells(grid, anchor, count, used = new Set()) {
  const field = distanceField(grid, anchor.x, anchor.y);
  const cells = [];
  for (let i = 0; i < field.length; i += 1) if (field[i] >= 0 && !used.has(i)) cells.push(i);
  cells.sort((a, b) => field[a] - field[b]);
  return cells.slice(0, count).map((index) => ({ x: index % grid.w, y: Math.floor(index / grid.w) }));
}
