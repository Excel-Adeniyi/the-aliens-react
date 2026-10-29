// Tiny WebAudio helper — procedural bleeps, no assets needed.
let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function blip(
  freq: number,
  dur = 0.12,
  type: OscillatorType = "sine",
  gain = 0.12,
  slideTo?: number,
): void {
  try {
    const a = ac();
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, a.currentTime);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
    }
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    osc.connect(g).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + dur);
  } catch {
    // Audio is best-effort.
  }
}

export const sfx = {
  pickup: () => blip(520, 0.14, "triangle", 0.14, 760),
  deliver: () => {
    blip(660, 0.14, "sine", 0.14);
    setTimeout(() => blip(880, 0.2, "sine", 0.14), 120);
  },
  pulse: () => blip(900, 0.5, "sawtooth", 0.1, 120),
  spotted: () => blip(320, 0.3, "square", 0.08, 210),
  caught: () => {
    blip(300, 0.5, "sawtooth", 0.16, 60);
    setTimeout(() => blip(200, 0.7, "sawtooth", 0.16, 40), 250);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => blip(f, 0.25, "triangle", 0.14), i * 160),
    );
  },
  disguise: () => blip(440, 0.16, "triangle", 0.1, 560),
};

/** Looping Halloween background track (bundled from public/sounds). */
const musicEl = new Audio("/sounds/halloween.mp3");
musicEl.loop = true;
musicEl.volume = 0.3;

export const music = {
  /** Call from a user gesture (the PLAY button) so the browser allows it. */
  start(): void {
    musicEl.volume = 0.3;
    void musicEl.play().catch(() => {
      // Best-effort — some browsers block until interaction.
    });
  },
  stop(): void {
    musicEl.pause();
  },
  setVolume(v: number): void {
    musicEl.volume = v;
  },
};
