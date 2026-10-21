import { startRun, WAVES, CHAPTERS, UPGRADE_BY_ID } from './game.js?v=20261021-starcore-22';
import { META_BY_ID, MILESTONE_REWARDS, ORGANS, WEAPONS } from './meta.js?v=20261021-starcore-22';
import { createBossRig } from './boss-rig.js?v=20261021-starcore-22';
import { bossProfileFor } from './boss-profiles.js?v=20261021-starcore-22';

const CHECKPOINT = 'starcore.checkpoint.v5';
const BEST = 'starcore.best.v1';
const PROFILE = 'starcore.profile.v2';
const LEGACY_PROFILE = 'starcore.profile.v1';
const RESEARCH = ['fire', 'precision', 'scavenge', 'tactics', 'collector',
  'thermal', 'momentum', 'ricochet'];
const MAX_BOSS_SEGMENTS = Math.max(...CHAPTERS.map(stage => stage.bossSegments));

export function readProfile(storage) {
  const empty = {
    dna: 0, fire: 0, precision: 0, scavenge: 0, tactics: 0, collector: 0,
    thermal: 0, momentum: 0, ricochet: 0,
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
      const savedLevel = id === 'precision' ? raw.precision ?? raw.guard : raw[id];
      result[id] = Number.isInteger(savedLevel) ? Math.max(0, Math.min(4, savedLevel)) : 0;
    }
    result.unlockedStage = Number.isInteger(raw.unlockedStage)
      ? Math.max(1, Math.min(25, raw.unlockedStage)) : 1;
    result.cleared = Array.isArray(raw.cleared) ? [...new Set(raw.cleared.filter(id =>
      Number.isInteger(id) && id >= 1 && id <= 25))] : [];
    result.endlessUnlocked = raw.endlessUnlocked === true || result.cleared.includes(25);
    result.weapons = Array.isArray(raw.weapons)
      ? [...new Set(['capsule', ...raw.weapons.filter(id => WEAPONS.some(item => item.id === id))])]
      : ['capsule'];
    const legacyOrgans = Array.isArray(raw.organs)
      ? raw.organs.map(id => id === 'guard-membrane' ? 'focus-lens' : id) : [];
    result.organs = [...new Set(legacyOrgans.filter(id => ORGANS.some(item => item.id === id)))];
    result.equippedWeapon = result.weapons.includes(raw.equippedWeapon)
      ? raw.equippedWeapon : 'capsule';
    const equippedOrgans = Array.isArray(raw.equippedOrgans)
      ? raw.equippedOrgans.map(id => id === 'guard-membrane' ? 'focus-lens' : id) : [];
    result.equippedOrgans = [...new Set(equippedOrgans
      .filter(id => result.organs.includes(id)))].slice(0, 2);
    result.bestEndless = Number.isInteger(raw.bestEndless)
      ? Math.max(0, raw.bestEndless) : 0;
    return result;
  } catch { return empty; }
}

function writeProfile(storage, profile) {
  try { storage.setItem(PROFILE, JSON.stringify(profile)); } catch { /* 停用儲存時仍可遊玩 */ }
}

export function researchCost(level) {
  return 45 + level * 65 + level * level * 10;
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
  profile.dna += gained;
  writeProfile(storage, profile);
  return { gained, profile, firstClear };
}

export function saveCheckpoint(storage, game) {
  if (game.preview) return;
  if (game.phase !== 'playing' && game.phase !== 'upgrade') return;
  const data = {
    version: 5,
    routeRevision: 2,
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
    normalShotTimer: game.normalShotTimer,
    chains: game.chains,
    bullets: game.bullets,
    chargeFor: game.chargeFor,
    comboCount: game.comboCount,
    comboTimer: game.comboTimer,
    playerAimAngle: game.player.aimAngle,
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
      || data.wave < 1 || data.wave > WAVES.length || !Number.isFinite(data.score)
      || !Number.isFinite(data.runTime) || data.runTime < 0 || data.runTime > 3600
      || !['playing', 'upgrade'].includes(data.phase)
      || !['normal', 'boss'].includes(data.encounter)
      || !Number.isInteger(data.normalDestroyed) || data.normalDestroyed < 0
      || data.normalDestroyed > WAVES[0].segments - 1
      || !Array.isArray(data.chains) || data.chains.length > 2
      || data.chains.some(chain => !Array.isArray(chain.segments)
        || chain.segments.length > MAX_BOSS_SEGMENTS
        || !Number.isFinite(chain.travel))
      || (data.encounter === 'boss' && data.chains.some(chain => chain.boss)
        && data.routeRevision !== 2)) return null;
    const game = startRun(data.seed, {
      ...(data.profileLevels || readProfile(storage)),
      equippedWeapon: data.equippedWeapon,
      equippedOrgans: data.equippedOrgans,
    }, data.chapter);
    const migrateNormalRun = data.encounter !== 'boss';
    game.wave = migrateNormalRun ? WAVES.length : data.wave;
    game.endlessTier = Number.isInteger(data.endlessTier)
      ? Math.max(1, Math.min(999, data.endlessTier)) : 1;
    game.shotCount = Number.isInteger(data.shotCount) ? Math.max(0, data.shotCount) : 0;
    game.phase = data.phase;
    game.runTime = data.runTime;
    game.waveTime = Number.isFinite(data.waveTime) ? data.waveTime : 0;
    game.encounter = 'boss';
    game.normalDestroyed = 0;
    game.bossDestroyed = !migrateNormalRun && Number.isInteger(data.bossDestroyed)
      ? Math.max(0, Math.min(2 * (MAX_BOSS_SEGMENTS - 1), data.bossDestroyed)) : 0;
    game.spawnCount = migrateNormalRun ? 0
      : Number.isInteger(data.spawnCount) ? data.spawnCount : 0;
    game.nextId = Number.isInteger(data.nextId) ? data.nextId : 1;
    game.fireTimer = Number.isFinite(data.fireTimer) ? data.fireTimer : 0;
    game.specialTimers = data.specialTimers && typeof data.specialTimers === 'object'
      ? data.specialTimers : {};
    game.normalShotTimer = Number.isFinite(data.normalShotTimer)
      ? data.normalShotTimer : 0;
    game.chains = migrateNormalRun ? [] : data.chains.filter(chain => chain.boss);
    for (const chain of game.chains.filter(item => item.boss)) {
      chain.originalBodyCount ||= WAVES.at(-1).segments - 1;
      chain.rig ||= createBossRig(bossProfileFor(game.chapter, chain.lane).id);
      const groups = new Map();
      for (const piece of chain.segments) {
        if (!piece.healthGroupId) continue;
        const group = groups.get(piece.healthGroupId) || {
          id: piece.healthGroupId, hp: piece.hp, maxHp: piece.maxHp, members: [],
        };
        group.members.push(piece);
        group.hp = Math.min(group.hp, piece.hp);
        groups.set(group.id, group);
      }
      chain.healthGroups = [...groups.values()];
    }
    game.bullets = Array.isArray(data.bullets) ? data.bullets.slice(0, 150).map(bullet => ({
      ...bullet,
      vx: Number.isFinite(bullet.vx) ? bullet.vx : 0,
      vy: Number.isFinite(bullet.vy) ? bullet.vy : -1250,
    })) : [];
    game.pickups = [];
    game.chargeFor = Number.isFinite(data.chargeFor)
      ? Math.max(0, Math.min(5, data.chargeFor)) : 0;
    game.comboCount = Number.isInteger(data.comboCount)
      ? Math.max(0, Math.min(99, data.comboCount)) : 0;
    game.comboTimer = Number.isFinite(data.comboTimer)
      ? Math.max(0, Math.min(2.5, data.comboTimer)) : 0;
    game.player.aimAngle = Number.isFinite(data.playerAimAngle)
      ? data.playerAimAngle : -Math.PI / 2;
    game.bosses = game.chains.filter(chain => chain.boss);
    game.boss = game.bosses[0] || null;
    game.score = Math.max(0, data.score);
    game.upgrades = Object.fromEntries(Object.entries(data.upgrades || {})
      .filter(([id, level]) => UPGRADE_BY_ID[id] && Number.isInteger(level)
        && level >= 1 && level <= UPGRADE_BY_ID[id].max));
    if (data.phase === 'upgrade') {
      if (!Array.isArray(data.choices) || data.choices.length !== 3) return null;
      const legacyUpgrade = { shield: 'frost', fury: 'power' };
      const choices = [...new Set(data.choices.map(id =>
        UPGRADE_BY_ID[id] ? id : legacyUpgrade[id]).filter(Boolean))];
      for (const upgrade of Object.keys(UPGRADE_BY_ID)) {
        if (choices.length === 3) break;
        if (!choices.includes(upgrade)) choices.push(upgrade);
      }
      game.choices = choices;
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
