import { startRun, WAVES, UPGRADE_BY_ID } from './game.js?v=20261016-shiba-fix-1';
import { META_BY_ID, MILESTONE_REWARDS, ORGANS, WEAPONS } from './meta.js';
import { createBossRig } from './boss-rig.js';
import { bossProfileFor } from './boss-profiles.js?v=20261016-shiba-fix-1';

const CHECKPOINT = 'starcore.checkpoint.v5';
const BEST = 'starcore.best.v1';
const PROFILE = 'starcore.profile.v2';
const LEGACY_PROFILE = 'starcore.profile.v1';
const RESEARCH = ['fire', 'guard', 'scavenge', 'tactics', 'collector'];

export function readProfile(storage) {
  const empty = {
    dna: 0, fire: 0, guard: 0, scavenge: 0, tactics: 0, collector: 0,
    unlockedStage: 1, cleared: [], endlessUnlocked: false,
    weapons: ['capsule'], organs: [], equippedWeapon: 'capsule',
    equippedOrgans: [], bestEndless: 0,
  };
  try {
    const raw = JSON.parse(storage.getItem(PROFILE)
      || storage.getItem(LEGACY_PROFILE) || 'null');
    if (!raw || typeof raw !== 'object') return empty;
    const result = { ...empty };
    result.dna = Number.isInteger(raw.dna) ? Math.max(0, Math.min(999999, raw.dna)) : 0;
    for (const id of RESEARCH) {
      result[id] = Number.isInteger(raw[id]) ? Math.max(0, Math.min(4, raw[id])) : 0;
    }
    result.unlockedStage = Number.isInteger(raw.unlockedStage)
      ? Math.max(1, Math.min(25, raw.unlockedStage)) : 1;
    result.cleared = Array.isArray(raw.cleared) ? [...new Set(raw.cleared.filter(id =>
      Number.isInteger(id) && id >= 1 && id <= 25))] : [];
    result.endlessUnlocked = raw.endlessUnlocked === true || result.cleared.includes(25);
    result.weapons = Array.isArray(raw.weapons)
      ? [...new Set(['capsule', ...raw.weapons.filter(id => WEAPONS.some(item => item.id === id))])]
      : ['capsule'];
    result.organs = Array.isArray(raw.organs)
      ? [...new Set(raw.organs.filter(id => ORGANS.some(item => item.id === id)))] : [];
    result.equippedWeapon = result.weapons.includes(raw.equippedWeapon)
      ? raw.equippedWeapon : 'capsule';
    result.equippedOrgans = Array.isArray(raw.equippedOrgans)
      ? [...new Set(raw.equippedOrgans.filter(id => result.organs.includes(id)))].slice(0, 2) : [];
    result.bestEndless = Number.isInteger(raw.bestEndless)
      ? Math.max(0, raw.bestEndless) : 0;
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

export function buyItem(storage, id) {
  const profile = readProfile(storage);
  const item = META_BY_ID[id];
  if (!item || id === 'capsule' || profile.weapons.includes(id)
    || profile.organs.includes(id) || profile.dna < item.cost) {
    return { success: false, profile };
  }
  profile.dna -= item.cost;
  (WEAPONS.includes(item) ? profile.weapons : profile.organs).push(id);
  writeProfile(storage, profile);
  return { success: true, profile };
}

export function equipItem(storage, kind, id) {
  const profile = readProfile(storage);
  if (kind === 'weapon' && profile.weapons.includes(id)) {
    profile.equippedWeapon = id;
  } else if (kind === 'organ' && profile.organs.includes(id)) {
    profile.equippedOrgans = profile.equippedOrgans.includes(id)
      ? profile.equippedOrgans.filter(item => item !== id)
      : [...profile.equippedOrgans.slice(-1), id];
  } else return { success: false, profile };
  writeProfile(storage, profile);
  return { success: true, profile };
}

export function awardRun(storage, game) {
  if (game.preview) return { gained: 0, profile: readProfile(storage), firstClear: false };
  const profile = readProfile(storage);
  const gained = 25 + game.wave * 9 + Math.floor(game.score / 100);
  const firstClear = game.phase === 'victory' && game.chapter >= 1
    && game.chapter <= 25 && !profile.cleared.includes(game.chapter);
  if (firstClear) {
    profile.cleared.push(game.chapter);
    profile.unlockedStage = Math.max(profile.unlockedStage,
      Math.min(25, game.chapter + 1));
    if (game.chapter === 25) profile.endlessUnlocked = true;
    const reward = MILESTONE_REWARDS[game.chapter];
    if (reward) {
      const collection = reward.kind === 'weapon' ? profile.weapons : profile.organs;
      if (!collection.includes(reward.id)) collection.push(reward.id);
    }
  }
  if (game.chapter === 26) profile.bestEndless = Math.max(profile.bestEndless,
    game.endlessTier || 1);
  if (profile.equippedOrgans.includes('salvage')) profile.dna += Math.ceil(gained * 0.15);
  profile.dna += gained;
  writeProfile(storage, profile);
  return { gained, profile, firstClear };
}

export function saveCheckpoint(storage, game) {
  if (game.preview) return;
  if (game.phase !== 'playing' && game.phase !== 'upgrade') return;
  const data = {
    version: 5,
    seed: game.seed,
    chapter: game.chapter,
    endlessTier: game.endlessTier,
    equippedWeapon: game.equippedWeapon,
    equippedOrgans: game.equippedOrgans,
    shotCount: game.shotCount,
    phase: game.phase,
    wave: game.wave,
    waveTime: game.waveTime,
    runTime: game.runTime,
    encounter: game.encounter,
    normalTotal: game.normalTotal,
    normalDestroyed: game.normalDestroyed,
    bossDestroyed: game.bossDestroyed,
    spawnCount: game.spawnCount,
    nextId: game.nextId,
    fireTimer: game.fireTimer,
    specialTimers: game.specialTimers,
    bossShotTimer: game.bossShotTimer,
    normalShotTimer: game.normalShotTimer,
    hazardTimer: game.hazardTimer,
    hazards: game.hazards,
    chains: game.chains,
    bullets: game.bullets,
    enemyBullets: game.enemyBullets,
    pickups: game.pickups,
    chargeFor: game.chargeFor,
    comboCount: game.comboCount,
    comboTimer: game.comboTimer,
    playerX: game.player.x,
    core: game.core,
    score: game.score,
    upgrades: game.upgrades,
    choices: game.choices,
    rerollsLeft: game.rerollsLeft,
    upgradeSource: game.upgradeSource,
    profileLevels: game.profileLevels,
  };
  try { storage.setItem(CHECKPOINT, JSON.stringify(data)); } catch { /* 瀏覽器停用儲存時仍可遊玩 */ }
}

export function loadCheckpoint(storage) {
  try {
    const data = JSON.parse(storage.getItem(CHECKPOINT) || 'null');
    if (!data || data.version !== 5 || !Number.isInteger(data.wave)
      || data.wave < 1 || data.wave > WAVES.length || !Number.isFinite(data.core)
      || data.core <= 0 || !Number.isFinite(data.score)
      || !Number.isFinite(data.runTime) || data.runTime < 0 || data.runTime > 3600
      || !['playing', 'upgrade'].includes(data.phase)
      || !['normal', 'boss'].includes(data.encounter)
      || !Number.isInteger(data.normalDestroyed) || data.normalDestroyed < 0
      || data.normalDestroyed > WAVES[0].segments - 1
      || !Array.isArray(data.chains) || data.chains.length > 2
      || data.chains.some(chain => !Array.isArray(chain.segments)
        || chain.segments.length > WAVES[0].segments
        || !Number.isFinite(chain.travel))) return null;
    const game = startRun(data.seed, {
      ...(data.profileLevels || readProfile(storage)),
      equippedWeapon: data.equippedWeapon,
      equippedOrgans: data.equippedOrgans,
    }, data.chapter);
    if (data.core > game.maxCore) return null;
    game.wave = data.wave;
    game.endlessTier = Number.isInteger(data.endlessTier)
      ? Math.max(1, Math.min(999, data.endlessTier)) : 1;
    game.shotCount = Number.isInteger(data.shotCount) ? Math.max(0, data.shotCount) : 0;
    game.phase = data.phase;
    game.runTime = data.runTime;
    game.waveTime = Number.isFinite(data.waveTime) ? data.waveTime : 0;
    game.encounter = data.encounter;
    game.normalDestroyed = data.normalDestroyed;
    game.bossDestroyed = Number.isInteger(data.bossDestroyed)
      ? Math.max(0, Math.min(2 * (WAVES.at(-1).segments - 1), data.bossDestroyed)) : 0;
    game.spawnCount = Number.isInteger(data.spawnCount) ? data.spawnCount : 0;
    game.nextId = Number.isInteger(data.nextId) ? data.nextId : 1;
    game.fireTimer = Number.isFinite(data.fireTimer) ? data.fireTimer : 0;
    game.specialTimers = data.specialTimers && typeof data.specialTimers === 'object'
      ? data.specialTimers : {};
    game.bossShotTimer = Number.isFinite(data.bossShotTimer) ? data.bossShotTimer : 0;
    game.normalShotTimer = Number.isFinite(data.normalShotTimer)
      ? data.normalShotTimer : 0;
    game.hazardTimer = Number.isFinite(data.hazardTimer) ? data.hazardTimer : 0;
    game.hazards = Array.isArray(data.hazards) ? data.hazards.slice(0, 8) : [];
    game.chains = data.chains;
    for (const chain of game.chains.filter(item => item.boss)) {
      chain.originalBodyCount ||= WAVES.at(-1).segments - 1;
      chain.rig ||= createBossRig(bossProfileFor(game.chapter, chain.lane).id);
    }
    game.bullets = Array.isArray(data.bullets) ? data.bullets.slice(0, 150) : [];
    game.enemyBullets = Array.isArray(data.enemyBullets)
      ? data.enemyBullets.slice(0, 100) : [];
    game.pickups = Array.isArray(data.pickups) ? data.pickups.filter(item =>
      Number.isFinite(item.x) && Number.isFinite(item.y)
      && ['shield', 'energy'].includes(item.kind)).slice(0, 24) : [];
    game.chargeFor = Number.isFinite(data.chargeFor)
      ? Math.max(0, Math.min(5, data.chargeFor)) : 0;
    game.comboCount = Number.isInteger(data.comboCount)
      ? Math.max(0, Math.min(99, data.comboCount)) : 0;
    game.comboTimer = Number.isFinite(data.comboTimer)
      ? Math.max(0, Math.min(2.5, data.comboTimer)) : 0;
    game.player.x = Number.isFinite(data.playerX)
      ? Math.max(24, Math.min(366, data.playerX)) : game.player.x;
    game.bosses = game.chains.filter(chain => chain.boss);
    game.boss = game.bosses[0] || null;
    game.core = data.core;
    game.score = Math.max(0, data.score);
    game.upgrades = Object.fromEntries(Object.entries(data.upgrades || {})
      .filter(([id, level]) => UPGRADE_BY_ID[id] && Number.isInteger(level)
        && level >= 1 && level <= UPGRADE_BY_ID[id].max));
    if (data.phase === 'upgrade') {
      if (!Array.isArray(data.choices) || data.choices.length !== 3
        || data.choices.some(id => !UPGRADE_BY_ID[id])) return null;
      game.choices = data.choices;
      game.rerollsLeft = Number.isInteger(data.rerollsLeft)
        ? Math.max(0, Math.min(5, data.rerollsLeft)) : 1;
      game.upgradeSource = data.upgradeSource === 'gold' ? 'gold' : 'chest';
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
