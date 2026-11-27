// Sons sintetizados (Web Audio), os mesmos do jogo original.
const PRESETS = {
  step: [[120, 0.025]],
  challenge: [[280, 0.08], [390, 0.1]],
  correct: [[480, 0.08], [660, 0.1], [820, 0.12]],
  wrong: [[210, 0.12], [155, 0.16]],
  caught: [[190, 0.13], [135, 0.2]],
  chest: [[410, 0.07], [560, 0.09], [720, 0.12]],
  power: [[520, 0.06], [700, 0.08], [930, 0.12]],
  "event-danger": [[170, 0.1], [240, 0.08], [170, 0.13], [310, 0.12]],
  "event-help": [[440, 0.07], [620, 0.09], [830, 0.14]],
  victory: [[392, 0.12], [523, 0.12], [659, 0.14], [784, 0.22]],
};

export class GameAudio {
  constructor() { this.enabled = localStorage.getItem("labirinto.sound") !== "off"; this.context = null; }
  unlock() {
    if (!this.enabled) return null;
    try {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
    } catch { this.context = null; }
    return this.context;
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("labirinto.sound", this.enabled ? "on" : "off");
    if (this.enabled) this.unlock();
    return this.enabled;
  }
  play(kind) {
    if (!this.enabled || !this.context || this.context.state !== "running") return;
    const ctx = this.context;
    let offset = 0;
    for (const [frequency, duration] of PRESETS[kind] || []) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = kind === "step" ? "square" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(kind === "step" ? 0.018 : 0.055, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(ctx.currentTime + offset);
      oscillator.stop(ctx.currentTime + offset + duration);
      offset += duration * 0.78;
    }
  }
}
