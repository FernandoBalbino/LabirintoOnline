// Sons originais sintetizados pela Web Audio API.
export class GameAudio {
 constructor(){this.soundEnabled=localStorage.getItem('labirinto.sound')!=='off';}
  ensureAudio() {
    if (!this.soundEnabled) return null;
    try {
      this.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === "suspended") this.audioContext.resume().catch(() => {});
      return this.audioContext;
    } catch {
      return null;
    }
  }

  playSound(kind) {
    if (!this.soundEnabled) return;
    const context = this.ensureAudio();
    if (!context) return;
    const presets = {
      step: [[120, 0.025]],
      challenge: [[280, 0.08], [390, 0.1]],
      correct: [[480, 0.08], [660, 0.1], [820, 0.12]],
      wrong: [[210, 0.12], [155, 0.16]],
      virus: [[180, 0.08], [240, 0.08], [180, 0.08]],
      caught: [[190, 0.13], [135, 0.2]],
      chest: [[410, 0.07], [560, 0.09], [720, 0.12]],
      power: [[520, 0.06], [700, 0.08], [930, 0.12]],
      "event-danger": [[170, 0.1], [240, 0.08], [170, 0.13], [310, 0.12]],
      "event-help": [[440, 0.07], [620, 0.09], [830, 0.14]],
      victory: [[392, 0.12], [523, 0.12], [659, 0.14], [784, 0.22]]
    };
    let offset = 0;
    (presets[kind] || []).forEach(([frequency, duration]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "step" ? "square" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(kind === "step" ? 0.018 : 0.055, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + duration);
      offset += duration * 0.78;
    });
  }


}
