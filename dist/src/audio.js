// 原創程序合成配樂與音效；不下載或播放第三方音訊素材。
const SETTINGS_KEY = 'starcore-audio-v1';
const ZONE_ROOTS = [50, 48, 53, 45, 55];
const ZONE_MOTIFS = [
  [0, 3, 7, 10, 7, 3, 5, 3],
  [0, 5, 7, 12, 10, 7, 5, 3],
  [0, 3, 8, 10, 8, 5, 3, 5],
  [0, 2, 7, 9, 7, 2, 5, 2],
  [0, 5, 8, 12, 10, 8, 5, 3],
];

function hertz(midi) { return 440 * 2 ** ((midi - 69) / 12); }

export function musicThemeForChapter(chapter) {
  return Number(chapter) === 5 ? 'coffin-dance' : 'standard';
}

export function musicEventsForStep(scene, zone, step, theme = 'standard') {
  if (!['menu', 'battle', 'boss', 'upgrade'].includes(scene)) return [];
  const index = Math.max(0, Math.min(4, Math.floor(zone || 1) - 1));
  const phraseStep = ((step % 64) + 64) % 64;
  const root = ZONE_ROOTS[index] + [0, -4, 3, -2][Math.floor(phraseStep / 16)];
  const beat = phraseStep % 16;
  const motif = ZONE_MOTIFS[index];
  const events = [];
  if (theme === 'coffin-dance') {
    const danceRoot = 45 + [0, -2, 5, 3][Math.floor(phraseStep / 16)];
    const danceMotif = [7, 10, 14, 12, 7, 10, 15, 14];
    if (scene === 'upgrade') {
      if (beat === 0 || beat === 8) events.push({ role: 'pad',
        frequency: hertz(danceRoot + 12), duration: 0.75,
        volume: 0.08, type: 'triangle' });
      if (beat === 4 || beat === 12) events.push({ role: 'spark',
        frequency: hertz(danceRoot + danceMotif[beat / 2]), duration: 0.2,
        volume: 0.05, type: 'sine' });
      return events;
    }
    if (beat % 4 === 0) events.push({ role: 'kick',
      frequency: hertz(danceRoot), duration: 0.14,
      volume: 0.25, type: 'sine', glide: hertz(danceRoot - 12) });
    if (beat === 4 || beat === 12) events.push({ role: 'clap',
      frequency: hertz(danceRoot + 24), duration: 0.07,
      volume: 0.055, type: 'sawtooth', glide: hertz(danceRoot + 18) });
    if (beat % 2 === 0) events.push({ role: 'lead',
      frequency: hertz(danceRoot + 12 + danceMotif[(beat / 2) % 8]),
      duration: scene === 'boss' ? 0.15 : 0.12,
      volume: scene === 'boss' ? 0.13 : 0.1,
      type: 'triangle' });
    if (scene === 'boss' && beat % 2 === 1) events.push({ role: 'spark',
      frequency: hertz(danceRoot + 24 + danceMotif[((beat - 1) / 2) % 8]),
      duration: 0.055, volume: 0.06, type: 'square' });
    if (beat === 0 || beat === 8) events.push({ role: 'bass',
      frequency: hertz(danceRoot - 12), duration: 0.28,
      volume: 0.16, type: 'triangle' });
    return events;
  }
  if (scene === 'menu' || scene === 'upgrade') {
    if (beat % 8 === 0) {
      events.push({ role: 'pad', frequency: hertz(root + 12), duration: 1.35,
        volume: scene === 'menu' ? 0.16 : 0.11, type: 'sine' });
      events.push({ role: 'pad', frequency: hertz(root + 19), duration: 1.2,
        volume: 0.075, type: 'triangle' });
    }
    if (beat === 4 || beat === 12) events.push({ role: 'spark',
      frequency: hertz(root + 24 + motif[beat / 4]), duration: 0.3,
      volume: 0.07, type: 'sine' });
    return events;
  }
  if (beat % (scene === 'boss' ? 2 : 4) === 0) events.push({ role: 'bass',
    frequency: hertz(root - 12 + (beat >= 8 ? 5 : 0)), duration: scene === 'boss' ? 0.24 : 0.36,
    volume: scene === 'boss' ? 0.19 : 0.16, type: 'triangle' });
  if (beat % 2 === 0) events.push({ role: 'lead',
    frequency: hertz(root + 12 + motif[(beat / 2) % 8]), duration: 0.11,
    volume: scene === 'boss' ? 0.12 : 0.09, type: 'triangle' });
  if (beat === 4 || beat === 12) events.push({ role: 'pulse',
    frequency: hertz(root - 17), duration: 0.08, volume: 0.13, type: 'sawtooth' });
  if (scene === 'boss' && beat % 2 === 1) events.push({ role: 'spark',
    frequency: hertz(root + 31 + motif[(beat - 1) / 2]), duration: 0.055,
    volume: 0.055, type: 'square' });
  return events;
}

const SFX = {
  start: { cooldown: 0, notes: [[392, 0, .12, .19], [587, .1, .14, .2]] },
  click: { cooldown: .06, notes: [[660, 0, .055, .1]] },
  shot: { cooldown: .115, notes: [[760, 0, .055, .055, 390]] },
  hit: { cooldown: .075, notes: [[235, 0, .065, .075, 140]] },
  break: { cooldown: .1, notes: [[310, 0, .12, .18, 100], [930, .025, .06, .07]] },
  retreat: { cooldown: .25, notes: [[420, 0, .24, .13, 220]] },
  chest: { cooldown: 0, notes: [[523, 0, .11, .22], [659, .08, .12, .21], [784, .16, .22, .19]] },
  upgrade: { cooldown: 0, notes: [[587, 0, .12, .18], [880, .11, .24, .2]] },
  hurt: { cooldown: .25, notes: [[172, 0, .23, .23, 75]] },
  warning: { cooldown: .8, notes: [[440, 0, .12, .17], [415, .18, .15, .16]] },
  guard: { cooldown: .6, notes: [[172, 0, .19, .19, 125], [344, .06, .13, .12, 280]] },
  slash: { cooldown: .6, notes: [[850, 0, .12, .19, 250], [155, .05, .18, .16, 95]] },
  inhale: { cooldown: .6, notes: [[280, 0, .24, .14, 510], [430, .18, .25, .12, 700]] },
  screech: { cooldown: .5, notes: [[720, 0, .22, .2, 190], [420, .06, .27, .16, 125]] },
  boss: { cooldown: 0, notes: [[110, 0, .4, .23, 75], [165, .12, .43, .13]] },
  victory: { cooldown: 0, notes: [[523, 0, .18, .2], [659, .18, .18, .2],
    [784, .36, .19, .21], [1046, .55, .5, .22]] },
  defeat: { cooldown: 0, notes: [[330, 0, .28, .2, 220], [247, .23, .32, .17, 155],
    [165, .47, .52, .15, 95]] },
};
const PRIORITY_SFX = new Set(['chest', 'upgrade', 'hurt', 'warning', 'guard', 'slash', 'inhale', 'screech', 'boss',
  'victory', 'defeat']);

function loadSettings(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(SETTINGS_KEY) || 'null');
    return { musicMuted: saved?.musicMuted === true, effectsMuted: saved?.effectsMuted === true };
  } catch { return { musicMuted: false, effectsMuted: false }; }
}

export function createAudioEngine({
  AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext,
  storage = globalThis.localStorage,
} = {}) {
  let context = null;
  let musicBus = null;
  let effectsBus = null;
  let scene = 'silent';
  let zone = 1;
  let theme = 'standard';
  let step = 0;
  let nextStepTime = 0;
  let activeEffects = 0;
  const lastEffects = new Map();
  const settings = loadSettings(storage);

  function saveSettings() {
    try { storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* 私密模式仍可調整 */ }
  }

  function setBusGain(bus, value) {
    if (!bus || !context) return;
    bus.gain.setTargetAtTime(value, context.currentTime, .025);
  }

  function refreshBuses() {
    setBusGain(musicBus, settings.musicMuted || scene === 'paused' || scene === 'silent'
      || scene === 'result' ? 0 : .37);
    setBusGain(effectsBus, settings.effectsMuted || scene === 'paused' ? 0 : .5);
  }

  function tone(frequency, start, duration, volume, type, bus, glide = null, effect = false) {
    if (!context || !bus || !Number.isFinite(frequency)) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (glide) oscillator.frequency.exponentialRampToValueAtTime(glide, start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.linearRampToValueAtTime(Math.max(.001, volume), start + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    if (effect) {
      activeEffects++;
      oscillator.onended = () => {
        activeEffects = Math.max(0, activeEffects - 1);
        oscillator.disconnect();
        envelope.disconnect();
      };
    } else oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + .025);
  }

  return {
    getSettings: () => ({ ...settings }),
    unlockFromGesture() {
      if (!AudioContextClass) return false;
      try {
        if (!context) {
          context = new AudioContextClass();
          const master = context.createGain();
          musicBus = context.createGain();
          effectsBus = context.createGain();
          master.gain.value = .82;
          musicBus.connect(master);
          effectsBus.connect(master);
          master.connect(context.destination);
          nextStepTime = context.currentTime + .03;
          refreshBuses();
        }
        if (context.state === 'suspended') void context.resume().catch(() => {});
        return true;
      } catch { return false; }
    },
    setScene(nextScene, nextZone = zone, nextTheme = theme) {
      const safeScene = ['menu', 'battle', 'boss', 'upgrade', 'paused', 'result', 'silent']
        .includes(nextScene) ? nextScene : 'silent';
      const safeZone = Math.max(1, Math.min(5, Math.floor(nextZone) || 1));
      const safeTheme = nextTheme === 'coffin-dance' ? nextTheme : 'standard';
      if (scene !== safeScene || zone !== safeZone || theme !== safeTheme) {
        scene = safeScene;
        zone = safeZone;
        theme = safeTheme;
        step = 0;
        if (context) nextStepTime = context.currentTime + .03;
      }
      refreshBuses();
    },
    update() {
      if (!context || context.state !== 'running' || settings.musicMuted
        || scene === 'paused' || scene === 'result' || scene === 'silent') return;
      if (nextStepTime < context.currentTime - .25) nextStepTime = context.currentTime + .03;
      const tempo = theme === 'coffin-dance' ? 126
        : scene === 'boss' ? 132 : scene === 'battle' ? 108 : 76;
      const secondsPerStep = 60 / tempo / 4;
      let scheduled = 0;
      while (nextStepTime < context.currentTime + .2 && scheduled < 4) {
        for (const event of musicEventsForStep(scene, zone, step, theme)) {
          tone(event.frequency, nextStepTime, event.duration, event.volume,
            event.type, musicBus, event.glide || null);
        }
        step = (step + 1) % 64;
        nextStepTime += secondsPerStep;
        scheduled++;
      }
    },
    playSfx(name) {
      const effect = SFX[name];
      const voiceLimit = PRIORITY_SFX.has(name) ? 12 : 8;
      if (!effect || !context || context.state === 'closed'
        || settings.effectsMuted || scene === 'paused' || activeEffects >= voiceLimit) return false;
      const now = context.currentTime;
      if (now - (lastEffects.get(name) ?? -Infinity) < effect.cooldown) return false;
      lastEffects.set(name, now);
      for (const [frequency, delay, duration, volume, glide] of effect.notes) {
        if (activeEffects >= voiceLimit) break;
        tone(frequency, now + delay, duration, volume, 'triangle', effectsBus, glide, true);
      }
      return true;
    },
    setMusicMuted(muted) {
      settings.musicMuted = !!muted;
      if (!settings.musicMuted && context) nextStepTime = context.currentTime + .03;
      refreshBuses();
      saveSettings();
    },
    setEffectsMuted(muted) {
      settings.effectsMuted = !!muted;
      refreshBuses();
      saveSettings();
    },
  };
}
