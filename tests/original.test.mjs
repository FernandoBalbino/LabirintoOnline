import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { challengeTemplateCounts, mazeChallenges, mazeEvents, mazePowers } from "../server/challenges.mjs";
import { ChallengeManager } from "../client/js/maze-game-challenges.mjs";
import {
  BASE_CHEST_COUNT,
  DEFAULT_BRAID_CHANCE,
  EVENT_INTERVAL_SECONDS,
  INITIAL_FREE_TIME,
  MAZE_HEIGHT,
  MAZE_TILE_SIZE,
  MAZE_WIDTH,
  advanceEventClock,
  advanceTimer,
  applyMeteorPenalty,
  analyzeMaze,
  applyCorrectAnswer,
  applyWrongAnswer,
  canOccupy,
  completeMaze,
  countDeadEnds,
  createChallengeDeck,
  createGameState,
  createPlayerPosition,
  createPowerChests,
  createPrizeTrail,
  createSeededRandom,
  createVirusClones,
  createVirusState,
  findShortestPath,
  freeTimeForStreak,
  generateMaze,
  movePlayer,
  pickRandomEvent,
  pickPowerChoices,
  positionToCell,
  reachedExit,
  resumeAfterChallenge,
  slowVirusAfterCatch,
  takeNextChallenge,
  teleportPlayer,
  validateChallengeResponse
} from "../shared/maze-core.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("catálogo contém exatamente 36 variações nos nove grupos planejados", async () => {
  assert.equal(mazeChallenges.length, 36);
  assert.deepEqual(challengeTemplateCounts, {
    "file-single": 6,
    "file-multi": 3,
    hardware: 4,
    "hardware-software": 4,
    "software-scenario": 4,
    "peripheral-sort": 2,
    "peripheral-select": 2,
    "windows-sim": 4,
    "rename-file": 2,
    "support-sim": 5
  });
  assert.equal(new Set(mazeChallenges.map((challenge) => challenge.id)).size, 36);
  mazeChallenges.forEach((challenge) => {
    assert.ok(challenge.theme);
    assert.ok(challenge.template);
    assert.ok(challenge.instruction);
    assert.ok(challenge.payload);
    assert.notEqual(challenge.solution, undefined);
    assert.doesNotMatch(`${challenge.theme} ${challenge.instruction}`.toLocaleLowerCase("pt-BR"), /\brede\b|\broteador\b|\bendereço ip\b|\bvírus\b|\bphishing\b|segurança digital/);
  });
  await access(resolve(projectRoot, "client/assets/maze-game/player-sprites.png"));
  await access(resolve(projectRoot, "client/assets/maze-game/lab-props.png"));
  await access(resolve(projectRoot, "client/assets/maze-game/virus-power-atlas.png"));
  await access(resolve(projectRoot, "client/assets/maze-game/maze-luck-event-atlas.png"));
  await access(resolve(projectRoot, "client/assets/maze-game/maze-meteor-sprites.png"));
  const serviceWorker = await readFile(resolve(projectRoot, "client/precache.json"), "utf8");
  const challengeIcons = new Set(mazeChallenges.flatMap((challenge) => [
    ...(challenge.payload.items || []),
    ...(challenge.payload.options || []),
    ...(challenge.payload.targets || [])
  ]).map((item) => item.icon).filter(Boolean));
  challengeIcons.forEach((icon) => assert.ok(serviceWorker.includes(icon.replace(/^\.\//, "")), `recurso offline ausente: ${icon}`));
  assert.match(serviceWorker, /assets\/maze-game\/virus-power-atlas\.png/);
});

test("quinze poderes possuem ícones, textos curtos e escolhas de quatro itens", () => {
  assert.equal(mazePowers.length, 15);
  assert.equal(new Set(mazePowers.map((power) => power.id)).size, 15);
  assert.equal(mazePowers.filter((power) => power.lucky).length, 5);
  mazePowers.forEach((power) => {
    assert.ok(power.name);
    assert.ok(power.description.length >= 20 && power.description.length <= 90);
    assert.ok(Number.isInteger(power.icon.index));
    assert.ok(["base", "luck-event"].includes(power.icon.sheet));
    assert.ok(power.icon.columns > 0 && power.icon.rows > 0);
  });
  const random = createSeededRandom("poderes");
  for (let index = 0; index < 30; index += 1) {
    const choices = pickPowerChoices(mazePowers, random, 4);
    assert.equal(choices.length, 4);
    assert.equal(new Set(choices.map((choice) => choice.id)).size, 4);
  }
});

test("cinco eventos equilibram três ameaças, duas ajudas e não repetem imediatamente", () => {
  assert.equal(mazeEvents.length, 5);
  assert.equal(new Set(mazeEvents.map((event) => event.id)).size, 5);
  assert.equal(mazeEvents.filter((event) => event.kind === "threat").length, 3);
  assert.equal(mazeEvents.filter((event) => event.kind === "help").length, 2);
  mazeEvents.forEach((event) => {
    assert.ok(event.name && event.description);
    assert.equal(event.icon.sheet, "luck-event");
  });
  const random = createSeededRandom("eventos-sem-repeticao");
  let lastEventId = null;
  for (let index = 0; index < 50; index += 1) {
    const event = pickRandomEvent(mazeEvents, lastEventId, random);
    assert.notEqual(event.id, lastEventId);
    lastEventId = event.id;
  }
});

test("labirintos gerados são conectados, extensos e possuem saída distante", () => {
  for (let index = 0; index < 20; index += 1) {
    const maze = generateMaze({ seed: `teste-${index}` });
    const analysis = analyzeMaze(maze);
    const openTiles = maze.grid.flat().filter((tile) => tile === 0).length;
    assert.equal(maze.width, MAZE_WIDTH);
    assert.equal(maze.height, MAZE_HEIGHT);
    assert.equal(analysis.reachableCount, openTiles);
    assert.deepEqual(maze.exit, { x: analysis.farthest.x, y: analysis.farthest.y });
    assert.equal(DEFAULT_BRAID_CHANCE, 0.15);
    assert.ok(maze.pathDistance >= 200, `saída pouco distante na semente ${index}`);
    assert.ok(maze.extraOpenings >= 100, `poucas ramificações extras na semente ${index}`);
    assert.ok(countDeadEnds(maze) >= 160, `poucos becos na semente ${index}`);
    assert.equal(maze.grid[maze.start.y][maze.start.x], 0);
    assert.equal(maze.grid[maze.exit.y][maze.exit.x], 0);
  }
});

test("caminho final, baús e teleporte permanecem em células alcançáveis", () => {
  const maze = generateMaze({ seed: "poderes-no-labirinto" });
  const random = createSeededRandom("eventos-do-labirinto");
  const path = findShortestPath(maze, maze.start);
  const chests = createPowerChests(maze, { random });
  const teleported = teleportPlayer(maze, random, [maze.start]);
  assert.equal(path.length, maze.pathDistance + 1);
  assert.deepEqual(path.at(-1), maze.exit);
  assert.equal(chests.length, BASE_CHEST_COUNT);
  assert.equal(new Set(chests.map((chest) => `${chest.x}:${chest.y}`)).size, BASE_CHEST_COUNT);
  chests.forEach((chest) => assert.equal(maze.grid[chest.y][chest.x], 0));
  const teleportedCell = positionToCell(teleported);
  assert.equal(maze.grid[teleportedCell.y][teleportedCell.x], 0);
});

test("vírus nasce distante e fica mais lento a cada captura", () => {
  const maze = generateMaze({ seed: "virus" });
  const random = createSeededRandom("virus-eventos");
  let virus = createVirusState(maze, { random, now: 100 });
  const startSpeed = virus.speed;
  assert.equal(maze.grid[positionToCell(virus).y][positionToCell(virus).x], 0);
  virus = slowVirusAfterCatch(virus);
  assert.equal(virus.caughtCount, 1);
  assert.ok(virus.speed < startSpeed);
  const secondSpeed = virus.speed;
  virus = slowVirusAfterCatch(virus);
  assert.equal(virus.caughtCount, 2);
  assert.ok(virus.speed < secondSpeed);
});

test("evento de multiplicação cria três clones extras em células alcançáveis", () => {
  const maze = generateMaze({ seed: "virus-clones" });
  const random = createSeededRandom("virus-clones-evento");
  const playerPosition = createPlayerPosition(maze);
  const mainVirus = createVirusState(maze, { random, playerPosition, now: 100 });
  const clones = createVirusClones(maze, { count: 3, random, playerPosition, now: 100, existingViruses: [mainVirus] });
  assert.equal(clones.length, 3);
  assert.equal(new Set(clones.map((virus) => `${positionToCell(virus).x}:${positionToCell(virus).y}`)).size, 3);
  clones.forEach((virus) => {
    const cell = positionToCell(virus);
    assert.equal(maze.grid[cell.y][cell.x], 0);
    assert.equal(virus.temporary, true);
    assert.equal(virus.speed, 124);
  });
});

test("movimento avança no corredor e bloqueia paredes", () => {
  const grid = Array.from({ length: 7 }, () => Array(7).fill(1));
  grid[3][2] = 0;
  grid[3][3] = 0;
  grid[3][4] = 0;
  const maze = { grid, width: 7, height: 7, start: { x: 2, y: 3 }, exit: { x: 4, y: 3 } };
  const start = createPlayerPosition(maze);
  const moved = movePlayer({ maze, position: start, input: { x: 1, y: 0 }, deltaSeconds: 0.05 });
  assert.ok(moved.x > start.x);
  assert.equal(moved.direction, "right");
  assert.equal(moved.moving, true);
  let blocked = start;
  for (let index = 0; index < 20; index += 1) blocked = movePlayer({ maze, position: blocked, input: { x: 0, y: -1 }, deltaSeconds: 0.05 });
  assert.ok(blocked.y >= MAZE_TILE_SIZE * 3 + 10);
  assert.equal(canOccupy(grid, start.x, start.y), true);
  assert.equal(canOccupy(grid, MAZE_TILE_SIZE * 1.5, MAZE_TILE_SIZE * 1.5), false);
});

test("cronômetro pausa exatamente ao zerar e não avança durante desafio", () => {
  const maze = generateMaze({ seed: "timer" });
  let state = createGameState({ maze, now: 100 });
  state = advanceTimer(state, 19.5);
  assert.equal(state.gamePaused, false);
  assert.ok(state.remainingTime > 0);
  state = advanceTimer(state, 1);
  assert.equal(state.remainingTime, 0);
  assert.equal(state.gamePaused, true);
  assert.equal(state.phase, "challenge");
  assert.equal(advanceTimer(state, 30), state);
});

test("relógio de eventos dispara a cada 60 segundos ativos e pausa nos modais", () => {
  const maze = generateMaze({ seed: "event-clock" });
  let state = createGameState({ maze, now: 0 });
  let result = advanceEventClock(state, EVENT_INTERVAL_SECONDS - 0.25);
  assert.equal(result.due, false);
  result = advanceEventClock(result.state, 0.25);
  assert.equal(result.due, true);
  assert.equal(result.state.eventElapsed, 0);
  state = { ...result.state, gamePaused: true, phase: "power-choice" };
  assert.equal(advanceEventClock(state, 120).state, state);
});

test("meteoro desconta três segundos e abre desafio ao zerar", () => {
  const maze = generateMaze({ seed: "meteor" });
  let state = { ...createGameState({ maze, now: 0 }), remainingTime: 10 };
  state = applyMeteorPenalty(state);
  assert.equal(state.remainingTime, 7);
  state = { ...state, remainingTime: 2 };
  state = applyMeteorPenalty(state);
  assert.equal(state.remainingTime, 0);
  assert.equal(state.phase, "challenge");
  assert.equal(state.gamePaused, true);
});

test("trilha premiada cria até cinco bits distintos no caminho da saída", () => {
  const maze = generateMaze({ seed: "trilha-premiada" });
  const bits = createPrizeTrail(maze, createPlayerPosition(maze), { count: 5 });
  assert.equal(bits.length, 5);
  assert.equal(new Set(bits.map((bit) => `${bit.x}:${bit.y}`)).size, 5);
  bits.forEach((bit) => assert.equal(maze.grid[bit.y][bit.x], 0));
});

test("desafio correto é processado uma única vez mesmo com vários envios", async () => {
  let correctCalls = 0;
  const challenge = mazeChallenges.find((candidate) => candidate.id === "arquivo-curriculo");
  const manager = new ChallengeManager({ submitResponse: async () => ({correct:true,message:"Tempo liberado"}), onCorrect: () => { correctCalls += 1; return "Tempo liberado"; } });
  manager.show(challenge);
  manager.submit({ ...challenge.solution });
  manager.submit({ ...challenge.solution });
  manager.submit({ ...challenge.solution });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(correctCalls, 1);
  assert.equal(manager.resolved, true);
  assert.equal(manager.feedback.type, "success");
});

test("sequência concede 20, 30, 40 e reinicia após erro", () => {
  const maze = generateMaze({ seed: "streak" });
  let state = createGameState({ maze, now: 0 });
  assert.equal(state.currentFreeTime, INITIAL_FREE_TIME);
  state = applyCorrectAnswer(state);
  assert.equal(state.correctStreak, 1);
  assert.equal(state.remainingTime, 20);
  state = applyCorrectAnswer(state);
  assert.equal(state.correctStreak, 2);
  assert.equal(state.remainingTime, 30);
  state = applyCorrectAnswer(state);
  assert.equal(state.correctStreak, 3);
  assert.equal(state.remainingTime, 40);
  assert.equal(state.highestStreak, 3);
  state = applyWrongAnswer(state);
  assert.equal(state.correctStreak, 0);
  assert.equal(state.remainingTime, 0);
  assert.equal(state.wrongAnswers, 1);
  state = applyCorrectAnswer(state);
  assert.equal(state.correctStreak, 1);
  assert.equal(state.remainingTime, 20);
  assert.equal(state.highestStreak, 3);
  assert.equal(state.questionsAnswered, 5);
  assert.equal(freeTimeForStreak(4), 50);
  state = resumeAfterChallenge(state, 30);
  assert.equal(state.remainingTime, 30);
  assert.equal(state.currentFreeTime, 30);
  assert.equal(state.correctStreak, 0);
  assert.equal(state.gamePaused, false);
  assert.equal(state.phase, "playing");
});

test("baralho não repete o último desafio ao iniciar ou renovar", () => {
  const sample = mazeChallenges.slice(0, 5);
  const deck = createChallengeDeck(sample, sample[0].id, () => 0);
  assert.notEqual(deck[0], sample[0].id);
  const first = takeNextChallenge({ deck: [], challenges: sample, lastChallengeId: sample[0].id, random: () => 0 });
  assert.notEqual(first.challenge.id, sample[0].id);
  const second = takeNextChallenge({ deck: [first.challenge.id, sample[2].id], challenges: sample, lastChallengeId: first.challenge.id });
  assert.notEqual(second.challenge.id, first.challenge.id);
});

test("validadores cobrem seleção, organização e renomeação", () => {
  const single = mazeChallenges.find((challenge) => challenge.id === "arquivo-curriculo");
  const multi = mazeChallenges.find((challenge) => challenge.id === "arquivos-mistos-1");
  const rename = mazeChallenges.find((challenge) => challenge.id === "renomear-atividade");
  assert.equal(validateChallengeResponse(single, { "arquivo-curriculo": "documentos" }), true);
  assert.equal(validateChallengeResponse(single, { "arquivo-curriculo": "imagens" }), false);
  assert.equal(validateChallengeResponse(multi, { ...multi.solution }), true);
  assert.equal(validateChallengeResponse(multi, { ...multi.solution, "relatorio-pdf": "imagens" }), false);
  assert.equal(validateChallengeResponse(rename, " ATIVIDADE.TXT "), true);
  assert.equal(validateChallengeResponse(rename, "atividade.docx"), false);

  mazeChallenges.forEach((challenge) => {
    const validResponse = typeof challenge.solution === "object"
      ? { ...challenge.solution }
      : challenge.solution;
    const invalidResponse = typeof challenge.solution === "object"
      ? { ...challenge.solution, [Object.keys(challenge.solution)[0]]: "resposta-incorreta" }
      : `${challenge.solution}-incorreta`;
    assert.equal(validateChallengeResponse(challenge, validResponse), true, challenge.id);
    assert.equal(validateChallengeResponse(challenge, invalidResponse), false, challenge.id);
  });
});

test("saída é detectada e conclusão preserva estatísticas", () => {
  const maze = generateMaze({ seed: "victory" });
  let state = createGameState({ maze, now: 1000 });
  state = { ...state, questionsAnswered: 4, wrongAnswers: 1, highestStreak: 2 };
  const exitPosition = {
    x: (maze.exit.x + 0.5) * MAZE_TILE_SIZE,
    y: (maze.exit.y + 0.5) * MAZE_TILE_SIZE,
    direction: "down",
    moving: false
  };
  assert.equal(reachedExit(exitPosition, maze), true);
  state = completeMaze({ ...state, playerPosition: exitPosition }, 61000);
  assert.equal(state.mazeCompleted, true);
  assert.equal(state.gamePaused, true);
  assert.equal(state.phase, "victory");
  assert.equal(state.questionsAnswered, 4);
  assert.equal(state.wrongAnswers, 1);
  assert.equal(state.completedAt - state.startedAt, 60000);
});

