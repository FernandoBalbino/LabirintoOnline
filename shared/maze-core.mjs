export const MAZE_WIDTH = 69;
export const MAZE_HEIGHT = 51;
export const MAZE_TILE_SIZE = 36;
export const PLAYER_SPEED = 148;
export const PLAYER_RADIUS = 10;
export const INITIAL_FREE_TIME = 20;
export const BASE_CHEST_COUNT = 16;
export const EVENT_INTERVAL_SECONDS = 60;
export const METEOR_PENALTY_SECONDS = 3;
export const DEFAULT_BRAID_CHANCE = 0.15;

const CARDINAL_DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

const hashSeed = (seed) => {
  const value = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
};

export const createSeededRandom = (seed) => {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffleValues = (values, random = Math.random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const cellKey = (x, y) => `${x}:${y}`;

const validCell = (x, y, width, height) => (
  x > 0 && y > 0 && x < width - 1 && y < height - 1
);

const walkableNeighbors = (grid, x, y) => CARDINAL_DIRECTIONS
  .map((direction) => ({ x: x + direction.x, y: y + direction.y }))
  .filter((point) => grid[point.y]?.[point.x] === 0);

export const analyzeMaze = (maze, origin = maze.start) => {
  const queue = [{ ...origin }];
  const distances = new Map([[cellKey(origin.x, origin.y), 0]]);
  let farthest = { ...origin, distance: 0 };
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor];
    const distance = distances.get(cellKey(point.x, point.y));
    if (distance > farthest.distance) farthest = { ...point, distance };
    for (const neighbor of walkableNeighbors(maze.grid, point.x, point.y)) {
      const key = cellKey(neighbor.x, neighbor.y);
      if (distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push(neighbor);
    }
  }
  return { reachableCount: distances.size, distances, farthest };
};

export const countDeadEnds = (maze) => {
  let count = 0;
  for (let y = 1; y < maze.height - 1; y += 1) {
    for (let x = 1; x < maze.width - 1; x += 1) {
      if (maze.grid[y][x] === 0 && walkableNeighbors(maze.grid, x, y).length === 1) count += 1;
    }
  }
  return count;
};

export const getWalkableCells = (maze) => {
  const cells = [];
  for (let y = 0; y < maze.height; y += 1) {
    for (let x = 0; x < maze.width; x += 1) {
      if (maze.grid[y][x] === 0) cells.push({ x, y });
    }
  }
  return cells;
};

export const positionToCell = (position, tileSize = MAZE_TILE_SIZE) => ({
  x: Math.max(0, Math.floor(position.x / tileSize)),
  y: Math.max(0, Math.floor(position.y / tileSize))
});

export const findShortestPath = (maze, origin, destination = maze.exit) => {
  const start = { x: Math.floor(origin.x), y: Math.floor(origin.y) };
  const goal = { x: destination.x, y: destination.y };
  if (maze.grid[start.y]?.[start.x] !== 0 || maze.grid[goal.y]?.[goal.x] !== 0) return [];
  const queue = [start];
  const parents = new Map([[cellKey(start.x, start.y), null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor];
    if (point.x === goal.x && point.y === goal.y) break;
    for (const neighbor of walkableNeighbors(maze.grid, point.x, point.y)) {
      const key = cellKey(neighbor.x, neighbor.y);
      if (parents.has(key)) continue;
      parents.set(key, point);
      queue.push(neighbor);
    }
  }
  if (!parents.has(cellKey(goal.x, goal.y))) return [];
  const path = [];
  for (let point = goal; point; point = parents.get(cellKey(point.x, point.y))) path.push(point);
  return path.reverse();
};

const cellDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const pickWalkableCell = (maze, {
  random = Math.random,
  avoid = [],
  minDistance = 0
} = {}) => {
  const candidates = getWalkableCells(maze).filter((cell) => (
    avoid.every((point) => cellDistance(cell, point) >= minDistance)
    && !(cell.x === maze.exit.x && cell.y === maze.exit.y)
  ));
  const pool = candidates.length ? candidates : getWalkableCells(maze);
  return { ...pool[Math.floor(random() * pool.length)] };
};

export const createPowerChests = (maze, {
  count = BASE_CHEST_COUNT,
  random = Math.random,
  existing = []
} = {}) => {
  const candidates = shuffleValues(getWalkableCells(maze).filter((cell) => (
    cellDistance(cell, maze.start) >= 8 && cellDistance(cell, maze.exit) >= 5
    && !existing.some((other) => other.x === cell.x && other.y === cell.y)
  )), random);
  const selected = [];
  for (const cell of candidates) {
    if (
      selected.every((other) => cellDistance(cell, other) >= 7)
      && existing.every((other) => cellDistance(cell, other) >= 5)
    ) selected.push(cell);
    if (selected.length === count) break;
  }
  for (const cell of candidates) {
    if (selected.length === count) break;
    if (!selected.some((other) => other.x === cell.x && other.y === cell.y)) selected.push(cell);
  }
  return selected.map((cell, index) => ({ id: `bau-${existing.length + index + 1}`, ...cell, opened: false }));
};

export const createVirusState = (maze, {
  random = Math.random,
  playerPosition = createPlayerPosition(maze),
  now = 0,
  avoid = [],
  minDistance = 18
} = {}) => {
  const playerCell = positionToCell(playerPosition);
  const spawn = pickWalkableCell(maze, { random, avoid: [playerCell, maze.start, ...avoid], minDistance });
  return {
    x: (spawn.x + 0.5) * MAZE_TILE_SIZE,
    y: (spawn.y + 0.5) * MAZE_TILE_SIZE,
    direction: "left",
    moving: false,
    caughtCount: 0,
    speed: 165,
    sprinting: false,
    nextSprintAt: now + 5500 + random() * 6500,
    sprintEndsAt: 0,
    respawnAt: 0,
    path: [],
    pathRefreshAt: 0
  };
};

export const createVirusClones = (maze, {
  count = 3,
  random = Math.random,
  playerPosition = createPlayerPosition(maze),
  now = 0,
  existingViruses = []
} = {}) => {
  const occupied = existingViruses.map(positionToCell);
  const clones = [];
  for (let index = 0; index < count; index += 1) {
    const clone = createVirusState(maze, {
      random,
      playerPosition,
      now,
      avoid: [...occupied, ...clones.map(positionToCell)],
      minDistance: 12
    });
    clones.push({
      ...clone,
      id: `virus-evento-${index + 1}`,
      speed: Math.round(clone.speed * 0.75),
      sprinting: true,
      temporary: true,
      nextSprintAt: now,
      sprintEndsAt: Number.POSITIVE_INFINITY
    });
  }
  return clones;
};

export const slowVirusAfterCatch = (virus) => ({
  ...virus,
  caughtCount: virus.caughtCount + 1,
  speed: Math.max(72, virus.speed * 0.84)
});

export const teleportPlayer = (maze, random = Math.random, avoid = []) => {
  const destination = pickWalkableCell(maze, { random, avoid: [maze.start, maze.exit, ...avoid], minDistance: 7 });
  return {
    x: (destination.x + 0.5) * MAZE_TILE_SIZE,
    y: (destination.y + 0.5) * MAZE_TILE_SIZE,
    direction: "down",
    moving: false
  };
};

export const pickPowerChoices = (powers, random = Math.random, count = 2) => (
  shuffleValues(powers, random).slice(0, Math.min(count, powers.length))
);

export const pickRandomEvent = (events, lastEventId = null, random = Math.random) => {
  const eligible = events.filter((event) => event.id !== lastEventId);
  const pool = eligible.length ? eligible : events;
  return pool[Math.floor(random() * pool.length)] || null;
};

export const advanceEventClock = (state, elapsedSeconds) => {
  if (state.gamePaused || state.mazeCompleted || state.phase !== "playing") {
    return { state, due: false };
  }
  const elapsed = (state.eventElapsed || 0) + Math.max(0, elapsedSeconds);
  if (elapsed < EVENT_INTERVAL_SECONDS) {
    return { state: { ...state, eventElapsed: elapsed }, due: false };
  }
  return {
    state: { ...state, eventElapsed: elapsed - EVENT_INTERVAL_SECONDS },
    due: true
  };
};

export const applyMeteorPenalty = (state, seconds = METEOR_PENALTY_SECONDS) => {
  if (state.gamePaused || state.phase !== "playing") return state;
  const remainingTime = Math.max(0, state.remainingTime - Math.max(0, seconds));
  return {
    ...state,
    remainingTime,
    gamePaused: remainingTime === 0,
    phase: remainingTime === 0 ? "challenge" : state.phase
  };
};

export const createPrizeTrail = (maze, origin, { count = 5 } = {}) => {
  const path = findShortestPath(maze, positionToCell(origin));
  const usable = path.slice(3, Math.max(3, path.length - 1));
  if (!usable.length) return [];
  const step = Math.max(1, Math.floor(usable.length / count));
  const selected = [];
  for (let index = 0; index < usable.length && selected.length < count; index += step) {
    const cell = usable[Math.min(usable.length - 1, index)];
    if (!selected.some((other) => other.x === cell.x && other.y === cell.y)) selected.push(cell);
  }
  return selected.slice(0, count).map((cell, index) => ({ id: `bit-${index + 1}`, ...cell, collected: false }));
};

const buildDecorations = (grid, width, height, random) => {
  const propIndexes = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 15];
  const decorations = [];
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      if (grid[y][x] !== 1 || random() > 0.055) continue;
      const besidePath = CARDINAL_DIRECTIONS.some(({ x: dx, y: dy }) => grid[y + dy]?.[x + dx] === 0);
      if (!besidePath) continue;
      decorations.push({ x, y, prop: propIndexes[Math.floor(random() * propIndexes.length)] });
    }
  }
  return decorations;
};

const carveSideBranches = (grid, width, height, random) => {
  const targetOpenings = Math.round(width * height * 0.032);
  const candidates = shuffleValues(Array.from({ length: height - 4 }, (_, row) => row + 2)
    .flatMap((y) => Array.from({ length: width - 4 }, (_, column) => ({ x: column + 2, y })))
    .filter(({ x, y }) => grid[y][x] === 1 && walkableNeighbors(grid, x, y).length === 1), random);
  let carved = 0;
  for (const cell of candidates) {
    if (carved >= targetOpenings) break;
    if (grid[cell.y][cell.x] !== 1 || walkableNeighbors(grid, cell.x, cell.y).length !== 1) continue;
    grid[cell.y][cell.x] = 0;
    carved += 1;
    if (random() > 0.48) continue;
    const previous = walkableNeighbors(grid, cell.x, cell.y)[0];
    const next = { x: cell.x + (cell.x - previous.x), y: cell.y + (cell.y - previous.y) };
    if (!validCell(next.x, next.y, width, height) || grid[next.y][next.x] !== 1) continue;
    if (walkableNeighbors(grid, next.x, next.y).length !== 1) continue;
    grid[next.y][next.x] = 0;
    carved += 1;
  }
  return carved;
};

export const generateMaze = ({
  width = MAZE_WIDTH,
  height = MAZE_HEIGHT,
  seed = Date.now(),
  braidChance = DEFAULT_BRAID_CHANCE
} = {}) => {
  const safeWidth = Math.max(15, width % 2 === 0 ? width + 1 : width);
  const safeHeight = Math.max(15, height % 2 === 0 ? height + 1 : height);
  const random = createSeededRandom(seed);
  const grid = Array.from({ length: safeHeight }, () => Array(safeWidth).fill(1));
  const start = { x: 1, y: 1 };
  const stack = [start];
  const visited = new Set([cellKey(start.x, start.y)]);
  grid[start.y][start.x] = 0;

  while (stack.length) {
    const current = stack[stack.length - 1];
    const candidates = shuffleValues(CARDINAL_DIRECTIONS, random)
      .map((direction) => ({
        x: current.x + direction.x * 2,
        y: current.y + direction.y * 2,
        wallX: current.x + direction.x,
        wallY: current.y + direction.y
      }))
      .filter((point) => validCell(point.x, point.y, safeWidth, safeHeight) && !visited.has(cellKey(point.x, point.y)));
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    const next = candidates[0];
    visited.add(cellKey(next.x, next.y));
    grid[next.wallY][next.wallX] = 0;
    grid[next.y][next.x] = 0;
    stack.push({ x: next.x, y: next.y });
  }

  for (let y = 1; y < safeHeight - 1; y += 2) {
    for (let x = 1; x < safeWidth - 1; x += 2) {
      if (walkableNeighbors(grid, x, y).length !== 1 || random() > braidChance) continue;
      const closedDirections = shuffleValues(CARDINAL_DIRECTIONS, random).filter(({ x: dx, y: dy }) => (
        validCell(x + dx * 2, y + dy * 2, safeWidth, safeHeight)
        && grid[y + dy][x + dx] === 1
        && grid[y + dy * 2][x + dx * 2] === 0
      ));
      const direction = closedDirections[0];
      if (direction) grid[y + direction.y][x + direction.x] = 0;
    }
  }

  const extraOpenings = carveSideBranches(grid, safeWidth, safeHeight, random);
  grid[1][0] = 0;
  const partialMaze = { grid, width: safeWidth, height: safeHeight, start };
  const analysis = analyzeMaze(partialMaze, start);
  const exit = { x: analysis.farthest.x, y: analysis.farthest.y };
  return {
    ...partialMaze,
    exit,
    seed,
    pathDistance: analysis.farthest.distance,
    extraOpenings,
    decorations: buildDecorations(grid, safeWidth, safeHeight, random)
  };
};

export const createPlayerPosition = (maze, tileSize = MAZE_TILE_SIZE) => ({
  x: (maze.start.x + 0.5) * tileSize,
  y: (maze.start.y + 0.5) * tileSize,
  direction: "down",
  moving: false
});

export const canOccupy = (grid, x, y, radius = PLAYER_RADIUS, tileSize = MAZE_TILE_SIZE) => {
  const points = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius]
  ];
  return points.every(([pointX, pointY]) => {
    const tileX = Math.floor(pointX / tileSize);
    const tileY = Math.floor(pointY / tileSize);
    return grid[tileY]?.[tileX] === 0;
  });
};

export const movePlayer = ({
  maze,
  position,
  input,
  deltaSeconds,
  speed = PLAYER_SPEED,
  radius = PLAYER_RADIUS,
  tileSize = MAZE_TILE_SIZE
}) => {
  let horizontal = Math.max(-1, Math.min(1, Number(input.x) || 0));
  let vertical = Math.max(-1, Math.min(1, Number(input.y) || 0));
  const magnitude = Math.hypot(horizontal, vertical);
  if (magnitude > 1) {
    horizontal /= magnitude;
    vertical /= magnitude;
  }
  const distance = Math.min(deltaSeconds, 0.05) * speed;
  let x = position.x;
  let y = position.y;
  const nextX = x + horizontal * distance;
  if (canOccupy(maze.grid, nextX, y, radius, tileSize)) x = nextX;
  const nextY = y + vertical * distance;
  if (canOccupy(maze.grid, x, nextY, radius, tileSize)) y = nextY;
  let direction = position.direction;
  if (Math.abs(horizontal) > Math.abs(vertical) && horizontal) direction = horizontal > 0 ? "right" : "left";
  else if (vertical) direction = vertical > 0 ? "down" : "up";
  return { x, y, direction, moving: x !== position.x || y !== position.y };
};

export const reachedExit = (position, maze, tileSize = MAZE_TILE_SIZE) => {
  const exitX = (maze.exit.x + 0.5) * tileSize;
  const exitY = (maze.exit.y + 0.5) * tileSize;
  return Math.hypot(position.x - exitX, position.y - exitY) <= tileSize * 0.48;
};

export const freeTimeForStreak = (correctStreak) => (
  INITIAL_FREE_TIME + (Math.max(1, correctStreak) - 1) * 10
);

export const createGameState = ({ maze, now = 0, random = Math.random } = {}) => ({
  currentFreeTime: INITIAL_FREE_TIME,
  remainingTime: INITIAL_FREE_TIME,
  correctStreak: 0,
  highestStreak: 0,
  questionsAnswered: 0,
  wrongAnswers: 0,
  gamePaused: false,
  playerPosition: createPlayerPosition(maze),
  mazeCompleted: false,
  mazeSeed: maze.seed,
  lastChallengeId: null,
  phase: "playing",
  startedAt: now,
  completedAt: null,
  chests: createPowerChests(maze, { random }),
  virus: createVirusState(maze, { random, now }),
  eventViruses: [],
  meteors: [],
  prizeBits: [],
  prizeTrailRemaining: 0,
  eventElapsed: 0,
  lastEventId: null,
  activeEvent: null,
  collisionImmuneUntil: 0,
  activeEffects: {
    speedUntil: 0,
    shieldCharges: 0,
    seerUntil: 0,
    frozenUntil: 0,
    invisibleUntil: 0,
    compassUntil: 0
  }
});

export const advanceTimer = (state, elapsedSeconds) => {
  if (state.gamePaused || state.mazeCompleted || state.phase !== "playing") return state;
  const remainingTime = Math.max(0, state.remainingTime - Math.max(0, elapsedSeconds));
  return {
    ...state,
    remainingTime,
    gamePaused: remainingTime === 0,
    phase: remainingTime === 0 ? "challenge" : state.phase
  };
};

export const applyCorrectAnswer = (state) => {
  const correctStreak = state.correctStreak + 1;
  const currentFreeTime = freeTimeForStreak(correctStreak);
  return {
    ...state,
    currentFreeTime,
    remainingTime: currentFreeTime,
    correctStreak,
    highestStreak: Math.max(state.highestStreak, correctStreak),
    questionsAnswered: state.questionsAnswered + 1,
    gamePaused: true,
    phase: "challenge-success"
  };
};

export const applyWrongAnswer = (state) => ({
  ...state,
  correctStreak: 0,
  questionsAnswered: state.questionsAnswered + 1,
  wrongAnswers: state.wrongAnswers + 1,
  remainingTime: 0,
  gamePaused: true,
  phase: "challenge"
});

export const resumeAfterChallenge = (state, seconds = 30) => ({
  ...state,
  currentFreeTime: seconds,
  remainingTime: seconds,
  correctStreak: 0,
  gamePaused: false,
  phase: "playing"
});


export const completeMaze = (state, now) => ({
  ...state,
  mazeCompleted: true,
  gamePaused: true,
  remainingTime: Math.max(0, state.remainingTime),
  phase: "victory",
  completedAt: now
});

export const createChallengeDeck = (challenges, lastChallengeId = null, random = Math.random) => {
  const ids = shuffleValues(challenges.map((challenge) => challenge.id), random);
  if (ids.length > 1 && ids[0] === lastChallengeId) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
};

export const takeNextChallenge = ({ deck, challenges, lastChallengeId = null, random = Math.random }) => {
  const nextDeck = deck.length ? [...deck] : createChallengeDeck(challenges, lastChallengeId, random);
  if (nextDeck.length > 1 && nextDeck[0] === lastChallengeId) {
    const replacementIndex = nextDeck.findIndex((id) => id !== lastChallengeId);
    [nextDeck[0], nextDeck[replacementIndex]] = [nextDeck[replacementIndex], nextDeck[0]];
  }
  const id = nextDeck.shift();
  return { challenge: challenges.find((challenge) => challenge.id === id), deck: nextDeck };
};

const sameMapping = (expected, actual) => {
  const expectedEntries = Object.entries(expected || {});
  if (expectedEntries.length !== Object.keys(actual || {}).length) return false;
  return expectedEntries.every(([key, value]) => actual?.[key] === value);
};

export const validateChallengeResponse = (challenge, response) => {
  if (!challenge) return false;
  if (challenge.template === "rename-file") {
    return String(response || "").trim().toLocaleLowerCase("pt-BR")
      === String(challenge.solution).trim().toLocaleLowerCase("pt-BR");
  }
  if (challenge.solution && typeof challenge.solution === "object" && !Array.isArray(challenge.solution)) {
    return sameMapping(challenge.solution, response);
  }
  return response === challenge.solution;
};

export const formatClock = (totalSeconds) => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
