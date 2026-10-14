import { startRun, WAVES, UPGRADE_BY_ID } from './game.js';

const CHECKPOINT = 'starcore.checkpoint.v1';
const BEST = 'starcore.best.v1';

export function saveCheckpoint(storage, game) {
  if (game.phase !== 'playing') return;
  const data = {
    version: 1,
    seed: game.seed,
    wave: game.wave,
    core: game.core,
    score: game.score,
    upgrades: game.upgrades,
  };
  try { storage.setItem(CHECKPOINT, JSON.stringify(data)); } catch { /* 瀏覽器停用儲存時仍可遊玩 */ }
}

export function loadCheckpoint(storage) {
  try {
    const data = JSON.parse(storage.getItem(CHECKPOINT) || 'null');
    if (!data || data.version !== 1 || !Number.isInteger(data.wave)
      || data.wave < 1 || data.wave > WAVES.length || !Number.isFinite(data.core)
      || data.core <= 0 || data.core > 100 || !Number.isFinite(data.score)) return null;
    const game = startRun(data.seed);
    game.wave = data.wave;
    game.core = data.core;
    game.score = Math.max(0, data.score);
    game.upgrades = Object.fromEntries(Object.entries(data.upgrades || {})
      .filter(([id, level]) => UPGRADE_BY_ID[id] && Number.isInteger(level)
        && level >= 1 && level <= UPGRADE_BY_ID[id].max));
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
