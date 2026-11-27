// Constantes compartilhadas entre servidor e navegador.
// Qualquer valor usado na física precisa ser idêntico nos dois lados.
export const TILE = 36;
export const PLAYER_RADIUS = 10;
export const VIRUS_RADIUS = 9;
export const PLAYER_SPEED = 148;
export const NPC_VIRUS_SPEED = 165;
export const INFECTED_SPEED = 148;
export const MIN_VIRUS_SPEED = 72;
export const SIM_STEP = 1 / 60;

export const INITIAL_FREE_TIME = 20;
export const STREAK_BONUS = 10;
export const QUESTION_PROTECTION_MS = 90_000;
export const OSLAB_PROTECTION_MS = 150_000;
export const SUCCESS_RESUME_MS = 700;
export const POWER_CHOICE_MS = 15_000;
export const PERSONAL_CHESTS = 16;
export const EVENT_INTERVAL_MS = 60_000;
export const DISCONNECT_BUDGET_MS = 120_000;
export const INFECTION_RADIUS = 23;
export const INFECTION_GRACE_MS = 1_000;
export const RELEASE_SECONDS = 30;

// Área de interesse: só recebe atualizações de quem pode aparecer na tela.
export const VIEW_HALF_WIDTH = 820;
export const VIEW_HALF_HEIGHT = 600;

export const freeTimeForStreak = (streak) => INITIAL_FREE_TIME + (Math.max(1, streak) - 1) * STREAK_BONUS;

export const formatClock = (totalSeconds) => {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};
