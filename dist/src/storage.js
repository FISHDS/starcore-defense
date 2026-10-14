import { startRun, WAVES, UPGRADE_BY_ID } from './game.js';

const CHECKPOINT = 'starcore.checkpoint.v1';
const BEST = 'starcore.best.v1';
const PROFILE = 'starcore.profile.v1';
const RESEARCH = ['fire', 'guard', 'scavenge'];

export function readProfile(storage) {
  const empty = { dna: 0, fire: 0, guard: 0, scavenge: 0 };
  try {
    const raw = JSON.parse(storage.getItem(PROFILE) || 'null');
    if (!raw || typeof raw !== 'object') return empty;
    const result = { ...empty };
    result.dna = Number.isInteger(raw.dna) ? Math.max(0, Math.min(999999, raw.dna)) : 0;
    for (const id of RESEARCH) {
      result[id] = Number.isInteger(raw[id]) ? Math.max(0, Math.min(4, raw[id])) : 0;
    }
    return result;
  } catch { return empty; }
}

function writeProfile(storage, profile) {
  try { storage.setItem(PROFILE, JSON.stringify(profile)); } catch { /* 停用儲存時仍可遊玩 */ }
}

export function researchCost(level) {
  return 45 + level * 40;
}

export function buyResearch(storage, id) {
  const profile = readProfile(storage);
  if (!RESEARCH.includes(id) || profile[id] >= 4 || profile.dna < researchCost(profile[id])) {
    return { success: false, profile };
  }
  profile.dna -= researchCost(profile[id]);
  profile[id]++;
  writeProfile(storage, profile);
  return { success: true, profile };
}

export function awardRun(storage, game) {
  const profile = readProfile(storage);
  const gained = 25 + game.wave * 9 + Math.floor(game.score / 100)
    + (game.bonusDNA || 0);
  profile.dna += gained;
  writeProfile(storage, profile);
  return { gained, profile };
}

export function saveCheckpoint(storage, game) {
  if (!['playing', 'route'].includes(game.phase)) return;
  const data = {
    version: 1,
    seed: game.seed,
    wave: game.wave,
    core: game.core,
    score: game.score,
    upgrades: game.upgrades,
    profileLevels: game.profileLevels,
    phase: game.phase,
    routeId: game.routeId,
    bonusDNA: game.bonusDNA,
  };
  try { storage.setItem(CHECKPOINT, JSON.stringify(data)); } catch { /* 瀏覽器停用儲存時仍可遊玩 */ }
}

export function loadCheckpoint(storage) {
  try {
    const data = JSON.parse(storage.getItem(CHECKPOINT) || 'null');
    if (!data || data.version !== 1 || !Number.isInteger(data.wave)
      || data.wave < 1 || data.wave > WAVES.length || !Number.isFinite(data.core)
      || data.core <= 0 || !Number.isFinite(data.score)) return null;
    const game = startRun(data.seed, data.profileLevels || readProfile(storage));
    if (data.core > game.maxCore) return null;
    game.wave = data.wave;
    game.core = data.core;
    game.score = Math.max(0, data.score);
    game.upgrades = Object.fromEntries(Object.entries(data.upgrades || {})
      .filter(([id, level]) => UPGRADE_BY_ID[id] && Number.isInteger(level)
        && level >= 1 && level <= UPGRADE_BY_ID[id].max));
    game.routeId = data.routeId === 'volatile' ? 'volatile' : 'stable';
    game.bonusDNA = Number.isInteger(data.bonusDNA) ? Math.max(0, data.bonusDNA) : 0;
    if (data.phase === 'route') {
      game.phase = 'route';
      game.routeChoices = ['stable', 'volatile'];
    }
    return game;
  } catch { return null; }
}

export function clearCheckpoint(storage) {
  try { storage.removeItem(CHECKPOINT); } catch { /* 忽略不可寫入的瀏覽器儲存空間 */ }
}

export function readBest(storage) {
  try { return Math.max(0, Number(storage.getItem(BEST)) || 0); } catch { return 0; }
}

export function updateBest(storage, score) {
  const best = Math.max(readBest(storage), Math.max(0, score));
  try { storage.setItem(BEST, String(best)); } catch { /* 成績可在當局繼續顯示 */ }
  return best;
}
