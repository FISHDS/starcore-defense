import { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID } from './content.js?v=20261017-starcore-7';
import { routePosition } from './routes.js?v=20261017-starcore-7';
import { assignTraits, chainSpeed, chestGuarded, steerBullet,
  updateBossShields, updateHazards, updateWeakpoints } from './mechanics.js';
import { createBossRig, updateBossRig } from './boss-rig.js';
import { bossProfileFor, bossRosterIndexFor } from './boss-profiles.js?v=20261017-starcore-7';
import { bossVolleyFor } from './boss-attacks.js';
import { knifeShieldDamageMultiplier, knifeShieldSlash } from './knife-shield.js';

export { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID };
export const WIDTH = 390;
export const HEIGHT = 844;
const RAIL_Y = 744;

function playerPosition(chapter) {
  const stage = CHAPTERS.find(item => item.id === chapter) || CHAPTERS[0];
  return { x: WIDTH / 2, y: stage.positionMode === 'center' ? HEIGHT / 2 : RAIL_Y };
}

function activeStage(game) {
  return CHAPTERS[game.chapter === 26
    ? 20 + ((game.endlessTier - 1) % 5) : game.chapter - 1];
}

export function startRun(seed = Date.now(), profile = {}, chapter = 1) {
  const profileLevels = {
    fire: Math.max(0, Math.min(4, profile.fire || 0)),
    guard: Math.max(0, Math.min(4, profile.guard || 0)),
    scavenge: Math.max(0, Math.min(4, profile.scavenge || 0)),
    tactics: Math.max(0, Math.min(4, profile.tactics || 0)),
    collector: Math.max(0, Math.min(4, profile.collector || 0)),
  };
  const organs = Array.isArray(profile.equippedOrgans) ? profile.equippedOrgans : [];
  const weapon = ['capsule', 'scatter', 'rail', 'prism'].includes(profile.equippedWeapon)
    ? profile.equippedWeapon : 'capsule';
  const maxCore = 120 + profileLevels.guard * 15 + (organs.includes('guard-membrane') ? 20 : 0);
  return {
    phase: 'playing', seed: seed >>> 0,
    chapter: chapter === 26 || CHAPTERS.some(item => item.id === chapter) ? chapter : 1,
    endlessTier: 1, equippedWeapon: weapon, equippedOrgans: organs.slice(0, 2), shotCount: 0,
    wave: 1, waveTime: 0, runTime: 0,
    encounter: 'normal', normalTotal: WAVES[0].segments - 1,
    normalDestroyed: 0, bossDestroyed: 0,
    spawnCount: 0, bossAttackCount: 0, nextId: 1,
    fireTimer: 0, specialTimers: {}, bossShotTimer: 0, normalShotTimer: 0,
    regenTimer: 0,
    hazardTimer: 0, hazards: [],
    maxCore, core: maxCore, baseDamage: 40 + profileLevels.fire * 5,
    chestMaxHp: 100 - profileLevels.scavenge * 8 - (organs.includes('salvage') ? 15 : 0),
    profileLevels, score: 0, player: { ...playerPosition(chapter), aimAngle: -Math.PI / 2 },
    chains: [], chest: null, bullets: [], enemyBullets: [], effects: [], popups: [],
    pickups: [], chargeFor: 0, comboCount: 0, comboTimer: 0,
    audioCues: [],
    boss: null, bosses: [], invulnerable: 0, upgrades: {}, choices: [],
    rerollsLeft: 0, upgradeSource: null,
  };
}

function random(game) {
  game.seed = (1664525 * game.seed + 1013904223) >>> 0;
  return game.seed / 4294967296;
}

export function getShotDamage(game) {
  const depth = Math.max(0, game.normalDestroyed);
  const chapterScale = 1 + Math.max(0, game.chapter - 5) * 0.035;
  const natural = game.baseDamage * (1 + depth / 30) ** 1.45 * chapterScale;
  const upgrades = 1 + (game.upgrades.power || 0) * 0.35
    + (game.upgrades.needle || 0) * 0.14 + (game.upgrades.rail || 0) * 0.13;
  const danger = 1 + (game.upgrades.fury || 0) * 0.5 * (1 - game.core / game.maxCore);
  const chain = 1 + Math.min(10, game.comboCount || 0) * (game.upgrades.combo || 0) * 0.015;
  const charge = game.chargeFor > 0 ? 1.25 : 1;
  return Math.round(natural * upgrades * danger * chain * charge
    * (game.equippedWeapon === 'rail' ? 1.2 : 1));
}

export function getRunProgress(game) {
  if (game.phase === 'victory') return 1;
  if (game.preview) return Math.min(1, game.bossDestroyed / game.previewBodyTotal);
  const normal = Math.min(1, game.normalDestroyed / game.normalTotal);
  const stage = activeStage(game);
  const bossBodyLength = stage.bossSegments - 1;
  const bossTotal = Math.max(stage.bossCount,
    game.encounter === 'boss' ? game.spawnCount : 0) * bossBodyLength;
  const boss = Math.min(1, game.bossDestroyed / bossTotal);
  return normal * 0.8 + boss * 0.2;
}

export function createBossShowcase(seed = Date.now(), chapter = 1) {
  const showcaseChapter = CHAPTERS.some(stage => stage.id === chapter) ? chapter : 1;
  const game = startRun(seed, {}, showcaseChapter);
  game.preview = true;
  game.encounter = 'boss';
  game.wave = WAVES.length;
  // 體驗局只縮短身體與調整試打火力；頭目招式沿用正式戰鬥。
  game.normalDestroyed = 105;
  game.upgrades = { power: 1, rapid: 1 };
  advance(game, 0.01);
  const boss = game.bosses[0];
  boss.segments = boss.segments.slice(0, 24);
  boss.originalBodyCount = boss.segments.length - 1;
  boss.speed = 35;
  for (const piece of boss.segments) {
    if (piece.index === 0) continue;
    piece.maxHp = Math.round((piece.chest ? 800 : 1550) * (1 + piece.index * 0.045));
    piece.hp = piece.maxHp;
    piece.armorHp = 0;
  }
  game.previewBodyTotal = boss.originalBodyCount;
  return game;
}

function configuredWave(game, index) {
  const source = WAVES[index];
  const chapter = activeStage(game);
  const bossRoute = source.boss ? `boss-route-${bossRosterIndexFor(game.chapter)}` : null;
  const path = source.boss
    ? chapter.positionMode === 'center' ? `center-${bossRoute}` : bossRoute
    : game.chapter !== 26 && chapter.positionMode === 'center'
      ? `center-${chapter.paths[index]}` : chapter.paths[index];
  return {
    ...source,
    path,
    tint: chapter.tints[index],
    segments: source.boss ? chapter.bossSegments : source.segments,
    hp: Math.round(source.hp * chapter.hpScale * (game.chapter === 26
      ? 1 + (game.endlessTier - 1) * 0.18 : 1)
      * (source.boss ? chapter.bossHpScale : 1)),
    speed: source.speed * chapter.speedScale * (game.chapter === 26
      ? 1 + (game.endlessTier - 1) * 0.04 : 1),
  };
}

function initialTravel(path, boss) {
  if (path.startsWith('center-')) return boss ? 1020 : 1020;
  if (boss) return 500;
  if (path === 'tide') return 760;
  if (path === 'fork' || path === 'fork-right' || path === 'narrow') return 950;
  if (path === 'weave') return 1200;
  return 1700;
}

function reposition(chain, dt = 0) {
  for (let index = 0; index < chain.segments.length; index++) {
    const segment = chain.segments[index];
    segment.index = index;
    const target = chain.travel - index * chain.spacing;
    if (!Number.isFinite(segment.routeDistance)) segment.routeDistance = target;
    if (dt > 0) {
      const desiredStep = (target - segment.routeDistance)
        * (1 - Math.exp(-dt * (index === 0 ? 24 : 10)));
      const maxStep = dt * (index === 0 ? 380 : 400);
      segment.routeDistance += Math.max(-maxStep, Math.min(maxStep, desiredStep));
    }
    const position = routePosition(chain.path, chain.boss, chain.lane,
      segment.routeDistance);
    segment.x = position.x;
    segment.y = position.y;
    segment.transitShield = chain.path === 'tide' && segment.index > 0
      && segment.x > 130 && segment.x < 260;
  }
}

function spawnChain(game, wave, lane = game.spawnCount) {
  const stage = activeStage(game);
  const boss = !!wave.boss;
  const count = wave.segments;
  const chain = {
    id: game.nextId++, boss, dead: false, path: wave.path, lane, stage: game.wave,
    tint: wave.tint, travel: initialTravel(wave.path, boss),
    spacing: boss ? 31 : 29, speed: wave.speed, actualSpeed: wave.speed,
    feedSpeed: 0,
    slowFor: 0, recoil: 0, segments: [],
    originalBodyCount: boss ? count - 1 : 0,
    rig: boss ? createBossRig(bossProfileFor(game.chapter, lane).id) : null,
  };
  if (chain.rig) {
    chain.rig.attackPattern = stage.bossMode;
    chain.rig.attackStyle = bossProfileFor(game.chapter, lane).attackStyle;
  }
  const chestIndices = boss ? [5, 15, 26, 38]
    : [5, 18, 36, 60, 84, 110, 138, 168, 198];
  for (let index = 0; index < count; index++) {
    const head = index === 0;
    const chest = chestIndices.includes(index);
    const depthHp = boss ? wave.hp * (1 + index / count)
      : wave.hp * (1 + (index / 25) ** 3);
    const hp = head ? 1 : Math.round(depthHp * (chest
      ? Math.max(0.35, game.chestMaxHp / 200)
        * (stage.mechanics.includes('focus') ? 0.72 : 1) : 1));
    const piece = {
      id: game.nextId++, index, depth: index, x: 0, y: 0, hp, maxHp: hp,
      armorHp: 0,
      radius: head ? (boss ? 27 : 23) : chest ? 23 : boss ? 20 : 18,
      chest, gold: chest && (boss || index === 60 || index === 138 || index === 198
        || (stage.mechanics.includes('goldRush') && [18, 84, 168].includes(index))),
      poisonFor: 0, burnFor: 0, mark: 0,
    };
    assignTraits(piece, stage, boss, chestIndices);
    chain.segments.push(piece);
  }
  if (chain.rig?.profileId === 'meme-seen-zone-admin') {
    const phone = chain.segments[3];
    if (phone) {
      phone.weakpoint = true;
      phone.weakOpen = false;
      chain.rig.weakpointId = phone.id;
    }
  }
  if (chain.rig?.profileId === 'meme-last-shift-coffin-leader') {
    const loadBearingHand = chain.segments[2];
    if (loadBearingHand) {
      loadBearingHand.weakpoint = true;
      loadBearingHand.weakOpen = false;
      chain.rig.weakpointId = loadBearingHand.id;
    }
  }
  if (chain.rig?.profileId === 'meme-loading-99') {
    const errorNode = chain.segments[4];
    if (errorNode) {
      errorNode.weakpoint = true;
      errorNode.loadingGlitch = true;
      errorNode.weakOpen = false;
      chain.rig.weakpointId = errorNode.id;
    }
  }
  chain.actualSpeed = chainSpeed(chain);
  reposition(chain);
  game.chains.push(chain);
  if (boss) {
    game.bosses.push(chain);
    game.boss ||= chain;
  }
  return chain;
}

function addPopup(game, x, y, value, weak = false) {
  game.popups.push({ x, y, value: Math.round(value), life: 0.63, weak });
  if (game.popups.length > 65) game.popups.shift();
}

export function hitSegment(game, chain, segment, amount, options = {}) {
  if (game.phase !== 'playing' || chain.dead || !chain.segments.includes(segment)
    || segment.index === 0 || segment.hp <= 0
    || (segment.transitShield && (options.projectile || options.special || options.dot))
    || (segment.chest && (options.special || options.dot))) return false;
  const bossGuarded = chain.boss && game.bosses.some(other => other !== chain && !other.dead
    && other.segments.some(piece => piece.index > 0 && piece.y > segment.y
      && piece.y < segment.y + 76 && Math.abs(piece.x - segment.x) < 48));
  const supplyGuarded = chestGuarded(chain, segment);
  const critical = !options.dot && random(game) < (game.upgrades.crit || 0) * 0.1;
  const weakpoint = segment.weakpoint && segment.weakOpen;
  const damage = Math.max(1, Math.round(amount * (critical ? 2 : 1)
    * (weakpoint ? 1 + game.profileLevels.collector * 0.12 : 1)
    * (1 + segment.mark) * (bossGuarded ? 0.66 : 1)
    * (chain.shielded ? 0.25 : 1)
    * knifeShieldDamageMultiplier(chain, segment)
    * (supplyGuarded ? 0.35 : 1)
    * (segment.weakpoint ? (segment.weakOpen ? 1.6 : 0.28) : 1)));
  const armor = Math.min(segment.armorHp || 0, damage);
  if (armor > 0) segment.armorHp -= armor;
  segment.hp -= damage - armor;
  addPopup(game, segment.x, segment.y - 12, damage, critical || segment.chest);
  game.effects.push({ kind: 'hit', x: segment.x, y: segment.y, life: 0.2, maxLife: 0.2 });
  if (chain.boss && chain.rig && !options.dot) chain.rig.hurtFor = 0.14;
  if (!options.dot) {
    if (game.upgrades.frost) chain.slowFor = Math.max(chain.slowFor, 0.8 + game.upgrades.frost * 0.5);
    if (game.upgrades.poison) segment.poisonFor = 4 + game.upgrades.poison * 1.5;
    if (game.upgrades.burn) segment.burnFor = 2 + game.upgrades.burn;
    if (game.upgrades.mark) segment.mark = Math.max(segment.mark, game.upgrades.mark * 0.11);
  }
  if (game.upgrades.detonation && !options.dot && segment.poisonFor > 0
    && segment.burnFor > 0 && (segment.detonationCooldown || 0) <= 0) {
    segment.detonationCooldown = 1.2;
    game.effects.push({ kind: 'blast', x: segment.x, y: segment.y,
      life: 0.35, maxLife: 0.35 });
    const blastIndex = chain.segments.indexOf(segment);
    for (const near of [chain.segments[blastIndex - 1], chain.segments[blastIndex + 1]]) {
      if (near?.index > 0 && !near.chest) hitSegment(game, chain, near,
        getShotDamage(game) * 0.28, { dot: true });
    }
  }
  if (segment.hp > 0) return true;
  if (['meme-seen-zone-admin', 'meme-last-shift-coffin-leader', 'meme-loading-99']
    .includes(chain.rig?.profileId)
    && segment.id === chain.rig.weakpointId && chain.rig.telegraphFor > 0) {
    chain.rig.telegraphFor = 0;
    chain.rig.attackCancelled = true;
    chain.rig.hurtFor = Math.max(chain.rig.hurtFor || 0, 0.4);
    chain.recoil = Math.max(chain.recoil || 0, 0.35);
    game.audioCues.push('break');
  }
  const position = chain.segments.indexOf(segment);
  const neighbors = [chain.segments[position - 1], chain.segments[position + 1]];
  chain.segments.splice(position, 1);
  chain.actualSpeed = chainSpeed(chain);
  chain.segments.forEach((piece, index) => { piece.index = index; });
  // 收掉一節時把鏈頭的目標位置退一節；後段的路線位置因此保持不變。
  chain.travel -= chain.spacing;
  chain.recoil = Math.max(chain.recoil || 0,
    0.18 + (game.upgrades.anchor || 0) * 0.04
      + (game.equippedOrgans.includes('anchor-organ') ? 0.05 : 0));
  if (!chain.boss) {
    game.normalDestroyed++;
    const nextWave = Math.min(5, 1 + Math.floor(game.normalDestroyed
      / (game.normalTotal / 5)));
    if (game.wave !== nextWave) { game.wave = nextWave; game.waveTime = 0; }
  } else game.bossDestroyed++;
  game.score += chain.boss ? 30 : 12;
  game.comboCount = game.comboTimer > 0 ? Math.min(99, game.comboCount + 1) : 1;
  game.comboTimer = 2.5;
  if (!segment.chest && !options.dot && (game.upgrades.shatter || 0) > 0) {
    for (const neighbor of neighbors) {
      if (neighbor?.index > 0 && chain.segments.includes(neighbor)) {
        hitSegment(game, chain, neighbor, getShotDamage(game)
          * (0.12 + game.upgrades.shatter * 0.12), { dot: true });
      }
    }
  }
  game.effects.push({ kind: 'burst', x: segment.x, y: segment.y, life: 0.43, maxLife: 0.43 });
  if (chain.segments.length === 1) {
    chain.dead = true;
    if (chain.rig) {
      chain.rig.dyingFor = 0.8;
      game.effects.push({ kind: 'bossDeath', x: chain.segments[0].x,
        y: chain.segments[0].y, profileId: chain.rig.profileId,
        life: 0.8, maxLife: 0.8 });
    }
    if (!chain.boss) {
      game.encounter = 'boss'; game.wave = WAVES.length;
      game.spawnCount = 0; game.waveTime = 0;
    }
    game.score += chain.boss ? 450 : 90;
    game.effects.push({ kind: 'burst', x: chain.segments[0].x,
      y: chain.segments[0].y, life: 0.8, maxLife: 0.8 });
  }
  if (segment.chest) presentUpgrades(game, segment.gold ? 'gold' : 'chest');
  if (game.upgrades.rebound && !options.dot && !chain.dead && game.phase === 'playing') {
    for (const neighbor of neighbors) {
      if (neighbor && neighbor.index > 0 && chain.segments.includes(neighbor)) {
        hitSegment(game, chain, neighbor, getShotDamage(game) * game.upgrades.rebound * 0.18,
          { dot: true });
      }
    }
  }
  return true;
}

function updateChains(game, dt) {
  for (let index = game.chains.length - 1; index >= 0; index--) {
    const chain = game.chains[index];
    if (chain.dead) { game.chains.splice(index, 1); continue; }
    updateBossRig(chain, dt);
    chain.recoil = Math.max(0, chain.recoil - dt);
    const visible = chain.segments.filter(piece => piece.index > 0
      && piece.y > 40 && piece.y < 730 && piece.x > -20 && piece.x < 410).length;
    const sparseFeed = !chain.boss && chain.segments.length > 30
      && chain.segments[0].y < 500
      ? visible < 8 ? 165 : visible < 14 ? 75 : 0 : 0;
    const tailPressure = !chain.boss && chain.speed > 0 && chain.segments.length > 30
      ? Math.min(95, Math.max(0, (390 - chain.segments[0].y) * 0.5)) : 0;
    const feedTarget = Math.max(sparseFeed, tailPressure);
    chain.feedSpeed = (chain.feedSpeed || 0)
      + (feedTarget - (chain.feedSpeed || 0)) * Math.min(1, dt * 2);
    chain.actualSpeed = chainSpeed(chain) + chain.feedSpeed;
    chain.travel += chain.actualSpeed * (chain.slowFor > 0 ? 0.58 : 1) * dt;
    chain.slowFor = Math.max(0, chain.slowFor - dt);
    reposition(chain, dt);
    const head = chain.segments[0];
    const atCore = game.player.y < 600
      ? Math.hypot(head.x - game.player.x, head.y - game.player.y) < 36
      : head.y >= RAIL_Y - 8;
    if (atCore) {
      game.effects.push({ kind: 'breach', x: head.x,
        y: game.player.y, life: 0.55, maxLife: 0.55 });
      game.phase = 'defeat';
      return;
    }
  }
}

function fireCapsules(game, dt) {
  game.fireTimer += dt;
  const interval = 0.19 / (1 + (game.upgrades.rapid || 0) * 0.18)
    * (game.equippedOrgans.includes('tempo') ? 0.9 : 1);
  while (game.fireTimer >= interval) {
    game.fireTimer -= interval;
    game.shotCount++;
    const count = 1 + (game.upgrades.multi || 0)
      + (game.equippedWeapon === 'scatter' ? 1 : 0);
    const extra = random(game) < (game.upgrades.echo || 0) * 0.22 ? 1 : 0;
    for (let shot = 0; shot < count + extra; shot++) {
      const angle = game.player.aimAngle
        + (shot - (count + extra - 1) / 2) * (0.035 + (game.upgrades.scatter || 0) * 0.025);
      const velocity = 520 + (game.upgrades.needle || 0) * 70;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      game.bullets.push({
        x: game.player.x + Math.cos(angle) * 24,
        y: game.player.y + Math.sin(angle) * 24,
        vx, vy, damage: getShotDamage(game),
        speed: velocity,
        bounces: game.upgrades.bounce || 0,
        volley: !!game.upgrades.volley && game.shotCount % 4 === 0,
        pierce: (game.upgrades.pierce || 0)
          + (game.equippedWeapon === 'prism' && game.shotCount % 3 === 0 ? 1 : 0), hit: [],
        seeking: random(game) < (game.upgrades.magnet || 0) * 0.22,
        width: 4 + (game.upgrades.rail || 0) * 5
          + (game.upgrades.volley && game.shotCount % 4 === 0 ? 8 : 0),
      });
      const projectile = game.bullets.at(-1);
      if (projectile.volley) projectile.damage = Math.round(projectile.damage
        * (1.7 + game.upgrades.volley * 0.2));
    }
  }
}

function activeBodies(game) {
  return game.chains.flatMap(chain => chain.segments.slice(1)
    .filter(segment => segment.hp > 0 && segment.y > 45 && segment.y < RAIL_Y
      && segment.x > -segment.radius && segment.x < WIDTH + segment.radius)
    .map(segment => ({ chain, segment })));
}

function inAimSector(game, segment, reach, halfAngle) {
  const dx = segment.x - game.player.x;
  const dy = segment.y - game.player.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const difference = Math.atan2(Math.sin(angle - game.player.aimAngle),
    Math.cos(angle - game.player.aimAngle));
  return distance <= reach && Math.abs(difference) <= halfAngle;
}

function specialTimer(game, id, dt, interval) {
  game.specialTimers[id] = (game.specialTimers[id] || 0) + dt;
  if (game.specialTimers[id] < interval) return false;
  game.specialTimers[id] -= interval;
  return true;
}

function fireSpecials(game, dt) {
  const power = getShotDamage(game);
  if (game.upgrades.orbit && specialTimer(game, 'orbit', dt,
    Math.max(0.7, 1.6 - game.upgrades.orbit * 0.18))) {
    game.effects.push({
      kind: 'orbit', x: game.player.x, y: game.player.y,
      radius: 210 + game.upgrades.orbit * 18, damage: power * 0.48,
      angle: game.player.aimAngle, halfAngle: 0.72,
      hit: [], life: 2.1, maxLife: 2.1,
    });
  }
  if (game.upgrades.arc && specialTimer(game, 'arc', dt,
    Math.max(0.55, 1.7 - game.upgrades.arc * 0.2))) {
    const targets = activeBodies(game).filter(({ segment }) =>
      inAimSector(game, segment, 560, 0.62)).sort((a, b) =>
      Math.hypot(a.segment.x - game.player.x, a.segment.y - game.player.y)
      - Math.hypot(b.segment.x - game.player.x, b.segment.y - game.player.y))
      .slice(0, 2 + game.upgrades.arc + (game.upgrades.superconductor ? 2 : 0));
    let from = { x: game.player.x + Math.cos(game.player.aimAngle) * 22,
      y: game.player.y + Math.sin(game.player.aimAngle) * 22 };
    for (const target of targets) {
      game.effects.push({ kind: 'arc', x: from.x, y: from.y,
        x2: target.segment.x, y2: target.segment.y, life: 0.24, maxLife: 0.24 });
      hitSegment(game, target.chain, target.segment,
        power * (game.upgrades.superconductor ? 0.8 : 0.58), { special: true });
      if (game.upgrades.superconductor) target.chain.slowFor = Math.max(target.chain.slowFor, 1.6);
      from = target.segment;
      if (game.phase !== 'playing') return;
    }
  }
  if (game.upgrades.drone && specialTimer(game, 'drone', dt,
    Math.max(0.45, 1.25 - game.upgrades.drone * 0.19))) {
    const target = activeBodies(game).filter(({ segment }) =>
      inAimSector(game, segment, 560, 0.48)).sort((a, b) =>
      Math.hypot(a.segment.x - game.player.x, a.segment.y - game.player.y)
      - Math.hypot(b.segment.x - game.player.x, b.segment.y - game.player.y))[0];
    if (target) {
      game.effects.push({ kind: 'arc',
        x: game.player.x + Math.cos(game.player.aimAngle) * 24,
        y: game.player.y + Math.sin(game.player.aimAngle) * 24,
        x2: target.segment.x, y2: target.segment.y, life: 0.26, maxLife: 0.26 });
      hitSegment(game, target.chain, target.segment,
        power * (0.5 + game.upgrades.drone * 0.25), { special: true });
    }
  }
  if (game.upgrades.saw && specialTimer(game, 'saw', dt, 2.3)) {
    const targets = activeBodies(game).filter(({ segment }) =>
      inAimSector(game, segment, 520, 0.78)).sort((a, b) =>
      Math.hypot(a.segment.x - game.player.x, a.segment.y - game.player.y)
      - Math.hypot(b.segment.x - game.player.x, b.segment.y - game.player.y))
      .slice(0, 4 + game.upgrades.saw * 2);
    for (const target of targets) {
      hitSegment(game, target.chain, target.segment,
        power * 0.34 * game.upgrades.saw, { special: true });
      if (game.phase !== 'playing') return;
    }
    game.effects.push({ kind: 'blast', x: game.player.x, y: game.player.y,
      life: 0.45, maxLife: 0.45 });
  }
  if (game.upgrades.pulse && specialTimer(game, 'pulse', dt, 4.5)) {
    for (const target of activeBodies(game).filter(item =>
      inAimSector(game, item.segment, 360, 0.82))) {
      hitSegment(game, target.chain, target.segment,
        power * 0.13 * game.upgrades.pulse, { special: true });
      if (game.phase !== 'playing') return;
    }
    game.effects.push({ kind: 'orbit', x: game.player.x, y: game.player.y,
      radius: 225, damage: 0, hit: [], life: 0.45, maxLife: 0.45 });
  }
}

function pointSegmentProgress(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy)
    / (dx * dx + dy * dy || 1)));
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const t = pointSegmentProgress(px, py, x1, y1, x2, y2);
  return Math.hypot(px - (x1 + (x2 - x1) * t), py - (y1 + (y2 - y1) * t));
}

export function canInterceptProjectile(player, projectile, aimAngle,
  tolerance = 0.3) {
  const incomingAngle = Math.atan2(projectile.y - player.y,
    projectile.x - player.x);
  const difference = Math.atan2(Math.sin(incomingAngle - aimAngle),
    Math.cos(incomingAngle - aimAngle));
  return Math.abs(difference) <= tolerance;
}

function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    steerBullet(game, bullet, dt);
    if (bullet.seeking) {
      const chest = activeBodies(game).filter(item => item.segment.chest)
        .sort((a, b) => b.segment.y - a.segment.y)[0]?.segment;
      if (chest && chest.y < bullet.y) bullet.x += Math.max(-240 * dt,
        Math.min(240 * dt, chest.x - bullet.x));
    }
    const previousX = bullet.x;
    const previousY = bullet.y;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    const crossed = activeBodies(game)
      .filter(({ segment }) => !bullet.hit.includes(segment.id)
        && pointSegmentDistance(segment.x, segment.y, previousX, previousY,
          bullet.x, bullet.y) <= segment.radius + bullet.width)
      .sort((a, b) => pointSegmentProgress(b.segment.x, b.segment.y,
        previousX, previousY, bullet.x, bullet.y)
        - pointSegmentProgress(a.segment.x, a.segment.y,
          previousX, previousY, bullet.x, bullet.y));
    let consumed = false;
    for (let shotIndex = game.enemyBullets.length - 1; shotIndex >= 0; shotIndex--) {
      const hostile = game.enemyBullets[shotIndex];
      if (!canInterceptProjectile(game.player, hostile, game.player.aimAngle)) continue;
      if (pointSegmentDistance(hostile.x, hostile.y, previousX, previousY,
        bullet.x, bullet.y) > bullet.width + hostile.radius) continue;
      game.enemyBullets.splice(shotIndex, 1);
      game.score += 4;
      game.effects.push({ kind: 'arc', x: hostile.x, y: hostile.y,
        x2: hostile.x + hostile.vx * 0.06,
        y2: hostile.y + hostile.vy * 0.06, life: 0.2, maxLife: 0.2 });
      if (bullet.pierce > 0) bullet.pierce--;
      else { consumed = true; break; }
    }
    if (consumed) { game.bullets.splice(i, 1); continue; }
    for (const { chain, segment } of crossed) {
      const oldX = segment.x;
      const oldY = segment.y;
      if (!hitSegment(game, chain, segment, bullet.damage, { projectile: true })) continue;
      bullet.hit.push(segment.id);
      if (game.phase !== 'playing') { consumed = true; break; }
      if (bullet.bounces > 0) {
        const next = activeBodies(game).filter(item => !bullet.hit.includes(item.segment.id)
          && Math.hypot(item.segment.x - oldX, item.segment.y - oldY) < 180)
          .sort((a, b) => Math.hypot(a.segment.x - oldX, a.segment.y - oldY)
            - Math.hypot(b.segment.x - oldX, b.segment.y - oldY))[0];
        if (next) {
          const dx = next.segment.x - oldX;
          const dy = next.segment.y - oldY;
          const length = Math.hypot(dx, dy) || 1;
          bullet.x = oldX; bullet.y = oldY;
          bullet.vx = dx / length * bullet.speed;
          bullet.vy = dy / length * bullet.speed;
          bullet.bounces--;
          game.effects.push({ kind: 'arc', x: oldX, y: oldY,
            x2: next.segment.x, y2: next.segment.y, life: 0.2, maxLife: 0.2 });
          consumed = false;
          break;
        }
      }
      if (game.upgrades.blast) {
        for (const nearby of chain.segments.slice(1)) {
          if (nearby === segment || nearby.hp <= 0) continue;
          if (Math.hypot(nearby.x - oldX, nearby.y - oldY)
            < 40 + game.upgrades.blast * 11) {
            hitSegment(game, chain, nearby, bullet.damage * 0.24 * game.upgrades.blast,
              { dot: true });
            if (game.phase !== 'playing') break;
          }
        }
        game.effects.push({ kind: 'blast', x: oldX, y: oldY, life: 0.28, maxLife: 0.28 });
      }
      if (game.upgrades.bankshot && game.phase === 'playing') {
        const next = activeBodies(game).filter(item => !item.segment.chest
          && item.segment.id !== segment.id
          && Math.hypot(item.segment.x - oldX, item.segment.y - oldY) < 115)
          .sort((a, b) => Math.hypot(a.segment.x - oldX, a.segment.y - oldY)
            - Math.hypot(b.segment.x - oldX, b.segment.y - oldY))[0];
        if (next) {
          game.effects.push({ kind: 'arc', x: oldX, y: oldY,
            x2: next.segment.x, y2: next.segment.y, life: 0.17, maxLife: 0.17 });
          hitSegment(game, next.chain, next.segment,
            bullet.damage * (0.2 + game.upgrades.bankshot * 0.1), { special: true });
        }
      }
      if (bullet.pierce > 0) bullet.pierce--;
      else { consumed = true; break; }
    }
    if (consumed || bullet.x < -30 || bullet.x > WIDTH + 30
      || bullet.y < -30 || bullet.y > HEIGHT + 30) game.bullets.splice(i, 1);
  }
}

function updateEffects(game, dt) {
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const effect = game.effects[i];
    if (effect.kind === 'orbit' && effect.damage > 0) {
      for (const { chain, segment } of activeBodies(game)) {
        if (effect.hit.includes(segment.id)) continue;
        const angle = Math.atan2(segment.y - effect.y, segment.x - effect.x);
        const difference = Math.atan2(Math.sin(angle - effect.angle),
          Math.cos(angle - effect.angle));
        if (Math.hypot(segment.x - effect.x, segment.y - effect.y) < effect.radius
          && Math.abs(difference) <= effect.halfAngle) {
          effect.hit.push(segment.id);
          hitSegment(game, chain, segment, effect.damage, { special: true });
          if (game.phase !== 'playing') break;
        }
      }
    }
    effect.life -= dt;
    if (effect.life <= 0) game.effects.splice(i, 1);
  }
  for (let i = game.popups.length - 1; i >= 0; i--) {
    game.popups[i].life -= dt;
    game.popups[i].y -= 25 * dt;
    if (game.popups[i].life <= 0) game.popups.splice(i, 1);
  }
}

function updateStatuses(game, dt) {
  for (const { chain, segment } of activeBodies(game)) {
    segment.detonationCooldown = Math.max(0, (segment.detonationCooldown || 0) - dt);
    if (segment.poisonFor > 0) {
      segment.poisonFor -= dt;
      hitSegment(game, chain, segment, getShotDamage(game)
        * (0.16 + 0.07 * ((game.upgrades.poison || 1) - 1)) * dt, { dot: true });
    }
    if (segment.burnFor > 0 && game.phase === 'playing') {
      segment.burnFor -= dt;
      hitSegment(game, chain, segment, getShotDamage(game)
        * 0.18 * (game.upgrades.burn || 0) * dt, { dot: true });
    }
    if (game.phase !== 'playing') return;
  }
}

function updateCombatTimers(game, dt) {
  game.chargeFor = Math.max(0, game.chargeFor - dt);
  game.comboTimer = Math.max(0, game.comboTimer - dt);
  if (game.comboTimer === 0) game.comboCount = 0;
}

function updateBossShots(game, dt) {
  for (const boss of game.bosses) {
    const followup = boss.rig?.loadingFollowup;
    if (!followup) continue;
    if (boss.dead) {
      boss.rig.loadingFollowup = null;
      continue;
    }
    followup.time -= dt;
    if (followup.time > 0) continue;
    const head = boss.segments[0];
    game.enemyBullets.push({ kind: 'loadingScan', x: head.x, y: head.y + 18,
      vx: Math.cos(followup.angle) * followup.speed,
      vy: Math.sin(followup.angle) * followup.speed,
      radius: 10, damage: 12 });
    boss.rig.loadingFollowup = null;
    boss.rig.loadingFollowupCount = (boss.rig.loadingFollowupCount || 0) + 1;
    game.audioCues.push('warning');
  }
  const normal = game.chains.find(chain => !chain.boss && !chain.dead);
  if (normal) {
    game.normalShotTimer += dt;
    const interval = game.chapter <= 5 ? 7.5 : 11;
    if (game.normalShotTimer >= interval) {
      game.normalShotTimer -= interval;
      const source = normal.segments.filter(piece => piece.index > 0
        && piece.y > 150 && piece.y < 550).sort((a, b) => b.y - a.y)[0];
      if (source) {
        const vy = 210;
        const flight = Math.max(0.7, (game.player.y - source.y) / vy);
        const dx = game.player.x - source.x;
        const dy = game.player.y - source.y;
        const length = Math.hypot(dx, dy) || 1;
        game.enemyBullets.push({ kind: 'spore', x: source.x, y: source.y + 15,
          vx: dx / length * vy, vy: dy / length * vy, radius: 6, damage: 7 });
      }
    }
  }
  if (!game.bosses.some(boss => !boss.dead)) return;
  const pattern = activeStage(game).bossMode;
  game.bossShotTimer += dt;
  const phaseTwo = game.bosses.some(boss => !boss.dead && boss.rig?.phase === 2);
  const bossInterval = (game.chapter <= 5 ? 3.1
    : game.chapter <= 10 ? 2.7 : 2.2)
    * (phaseTwo ? (game.chapter <= 5 ? 0.94 : 0.82) : 1)
    * (pattern === 'speed' ? 0.88 : 1);
  const isKnifeShield = game.bosses.some(boss => !boss.dead
    && boss.rig?.profileId === 'meme-knife-shield');
  const isScreechCat = game.bosses.some(boss => !boss.dead
    && boss.rig?.profileId === 'meme-screech-cat');
  const isGroupAdmin = game.bosses.some(boss => !boss.dead
    && boss.rig?.profileId === 'meme-seen-zone-admin');
  const isCoffinLeader = game.bosses.some(boss => !boss.dead
    && boss.rig?.profileId === 'meme-last-shift-coffin-leader');
  const isLoading99 = game.bosses.some(boss => !boss.dead
    && boss.rig?.profileId === 'meme-loading-99');
  const interval = isScreechCat ? (phaseTwo ? 2.4 : 3.1)
    : isGroupAdmin ? (phaseTwo ? 2.35 : 3.1)
      : isCoffinLeader ? (phaseTwo ? 2.55 : 3.1)
        : isLoading99 ? (phaseTwo ? 2.45 : 3.05) : bossInterval;
  const warningTime = isKnifeShield ? 0.85 : isScreechCat ? 0.9
    : isGroupAdmin ? 1.1 : isCoffinLeader ? 0.85 : isLoading99 ? 0.9
    : pattern === 'armor' ? 0.72 : pattern === 'speed' ? 0.72 : 0.55;
  const liveBosses = game.bosses.filter(boss => !boss.dead);
  const attackBosses = pattern === 'alternating' && liveBosses.length > 1
    ? [liveBosses[(game.bossAttackCount || 0) % liveBosses.length]] : liveBosses;
  if (game.bossShotTimer >= interval - warningTime) {
    for (const boss of attackBosses) {
      if (boss.dead || boss.segments[0].y < 120 || !boss.rig) continue;
      if (!boss.rig.telegraphLocked) {
        boss.rig.targetX = game.player.x;
        boss.rig.targetY = game.player.y;
        const aimAngle = Math.atan2(game.player.y - boss.segments[0].y,
          game.player.x - boss.segments[0].x);
        if (boss.rig.profileId === 'meme-last-shift-coffin-leader') {
          boss.rig.attackDirection = (boss.rig.attackCount || 0) % 2 ? 1 : -1;
          boss.rig.targetAngle = aimAngle + boss.rig.attackDirection * 0.48;
        } else boss.rig.targetAngle = aimAngle;
        boss.rig.telegraphLocked = true;
        if (boss.rig.profileId === 'meme-seen-zone-admin') {
          boss.rig.attackCancelled = false;
          const phone = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
          if (phone) phone.weakOpen = true;
        }
        if (boss.rig.profileId === 'meme-last-shift-coffin-leader') {
          boss.rig.attackCancelled = false;
          const hand = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
          if (hand) hand.weakOpen = true;
        }
        if (boss.rig.profileId === 'meme-loading-99') {
          boss.rig.attackCancelled = false;
          const glitch = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
          if (glitch) glitch.weakOpen = true;
        }
        if (boss.rig.profileId === 'meme-knife-shield') game.audioCues.push('guard');
        if (boss.rig.profileId === 'meme-screech-cat') {
          game.audioCues.push('inhale');
        }
      }
      boss.rig.telegraphFor = Math.max(0, interval - game.bossShotTimer);
    }
  }
  while (game.bossShotTimer >= interval) {
    game.bossShotTimer -= interval;
    for (const boss of attackBosses) {
      if (boss.dead || boss.segments[0].y < 120) continue;
      const head = boss.segments[0];
      if (boss.rig) {
        boss.rig.telegraphFor = 0;
        boss.rig.telegraphLocked = false;
        boss.rig.strikeFor = boss.rig.profileId === 'meme-knife-shield' ? 0.65 : 0.32;
      }
      if (boss.rig?.profileId === 'meme-seen-zone-admin') {
        const phone = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
        if (phone) phone.weakOpen = false;
        if (boss.rig.attackCancelled) {
          boss.rig.attackCancelled = false;
          continue;
        }
        const angle = boss.rig.targetAngle ?? Math.atan2(game.player.y - head.y,
          game.player.x - head.x);
        const spreads = phaseTwo ? [-0.24, -0.12, 0, 0.12, 0.24] : [-0.16, 0, 0.16];
        const speed = phaseTwo ? 255 : 215;
        for (const spread of spreads) {
          game.enemyBullets.push({ kind: 'notification', x: head.x, y: head.y + 25,
            vx: Math.cos(angle + spread) * speed,
            vy: Math.sin(angle + spread) * speed, radius: 8,
            damage: phaseTwo ? 28 : 20 });
        }
        boss.rig.attackCount = (boss.rig.attackCount || 0) + 1;
        game.audioCues.push('warning');
        continue;
      }
      if (boss.rig?.profileId === 'meme-last-shift-coffin-leader') {
        const hand = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
        if (hand) hand.weakOpen = false;
        if (boss.rig.attackCancelled) {
          boss.rig.attackCancelled = false;
          continue;
        }
        const angle = boss.rig.targetAngle ?? Math.atan2(game.player.y - head.y,
          game.player.x - head.x);
        const spreads = [0];
        const speed = phaseTwo ? 250 : 215;
        for (const spread of spreads) {
          game.enemyBullets.push({ kind: 'coffin-card', x: head.x, y: head.y + 24,
            vx: Math.cos(angle + spread) * speed,
            vy: Math.sin(angle + spread) * speed,
            radius: phaseTwo ? 12 : 10, damage: phaseTwo ? 22 : 17 });
        }
        boss.rig.attackCount = (boss.rig.attackCount || 0) + 1;
        game.audioCues.push('warning');
        continue;
      }
      if (boss.rig?.profileId === 'meme-loading-99') {
        const glitch = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
        if (glitch) glitch.weakOpen = false;
        if (boss.rig.attackCancelled) {
          boss.rig.attackCancelled = false;
          continue;
        }
        const angle = boss.rig.targetAngle ?? Math.atan2(game.player.y - head.y,
          game.player.x - head.x);
        const spread = phaseTwo ? 0.2 : 0.13;
        const speed = phaseTwo ? 245 : 205;
        for (const offset of [-spread, 0, spread]) {
          game.enemyBullets.push({ kind: 'loadingScan', x: head.x, y: head.y + 18,
            vx: Math.cos(angle + offset) * speed,
            vy: Math.sin(angle + offset) * speed,
            radius: phaseTwo ? 10 : 9, damage: phaseTwo ? 15 : 11 });
        }
        if (phaseTwo) {
          const direction = (boss.rig.attackCount || 0) % 2 ? 1 : -1;
          boss.rig.loadingFollowup = { time: 0.44,
            angle: angle + direction * 0.42, speed: 225 };
        }
        boss.rig.attackCount = (boss.rig.attackCount || 0) + 1;
        game.audioCues.push('warning');
        continue;
      }
      if (boss.rig?.profileId === 'meme-knife-shield') {
        game.enemyBullets.push(knifeShieldSlash(head, game.player, boss.rig.phase));
        game.audioCues.push('slash');
        continue;
      }
      if (boss.rig?.profileId === 'meme-screech-cat') {
        const angle = boss.rig.targetAngle ?? Math.atan2(game.player.y - head.y,
          game.player.x - head.x);
        const speed = phaseTwo ? 285 : 245;
        for (const spread of [-0.18, 0, 0.18]) {
          game.enemyBullets.push({ kind: 'sonicWave', x: head.x, y: head.y + 22,
            vx: Math.cos(angle + spread) * speed,
            vy: Math.sin(angle + spread) * speed, radius: 16,
            damage: phaseTwo ? 32 : 24 });
        }
        boss.rig.attackCount = (boss.rig.attackCount || 0) + 1;
        game.audioCues.push('screech');
        continue;
      }
      if (pattern === 'alternating' && liveBosses.length > 1) game.bossAttackCount++;
      const aimAngle = boss.rig?.targetAngle ?? Math.atan2(
        game.player.y - head.y, game.player.x - head.x);
      const style = boss.rig?.attackStyle || 'spore-bloom';
      game.enemyBullets.push(...bossVolleyFor(style,
        { x: head.x, y: head.y + 25 }, aimAngle,
        boss.rig?.phase || (phaseTwo ? 2 : 1), boss.rig?.attackCount || 0));
      if (boss.rig) boss.rig.attackCount = (boss.rig.attackCount || 0) + 1;
    }
  }
}

function updateEnemyBullets(game, dt) {
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const shot = game.enemyBullets[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if ((shot.ricochets || 0) > 0 && (shot.x < shot.radius || shot.x > WIDTH - shot.radius)) {
      shot.x = Math.max(shot.radius, Math.min(WIDTH - shot.radius, shot.x));
      shot.vx *= -1;
      shot.ricochets--;
    }
    if (Math.abs(shot.x - game.player.x) < shot.radius + 15
      && Math.abs(shot.y - game.player.y) < shot.radius + 15 && game.invulnerable === 0) {
      game.enemyBullets.splice(i, 1);
      game.core = Math.max(0, game.core - Math.max(2,
        (shot.damage || 9) - (game.upgrades.shield || 0) * 2));
      game.invulnerable = 0.7;
      if (game.core <= 0) game.phase = 'defeat';
    } else if (shot.y > HEIGHT + 20 || shot.x < -30 || shot.x > WIDTH + 30) {
      game.enemyBullets.splice(i, 1);
    }
  }
}

function drawUpgradeChoices(game, previous = []) {
  const evolved = UPGRADES.filter(item => item.rarity === 'evolution'
    && !game.upgrades[item.id]
    && item.requires.every(id => (game.upgrades[id] || 0) >= 2));
  const available = UPGRADES.filter(item => item.rarity !== 'evolution'
    && (game.upgrades[item.id] || 0) < item.max);
  const fresh = available.filter(item => !previous.includes(item.id));
  const pool = [...(fresh.length >= 3 ? fresh : available)];
  const weight = game.upgradeSource === 'gold'
    ? { common: 2, rare: 5, epic: 3 } : { common: 5, rare: 3, epic: 1 };
  const choices = evolved.map(item => item.id).slice(0, 2);
  while (choices.length < 3 && pool.length) {
    let roll = random(game) * pool.reduce((sum, item) => sum + weight[item.rarity], 0);
    let index = 0;
    while (index < pool.length - 1 && roll >= weight[pool[index].rarity]) {
      roll -= weight[pool[index].rarity]; index++;
    }
    choices.push(pool.splice(index, 1)[0].id);
  }
  return choices;
}

function presentUpgrades(game, source) {
  game.phase = 'upgrade';
  game.upgradeSource = source;
  game.rerollsLeft = 1 + game.profileLevels.tactics;
  game.choices = drawUpgradeChoices(game);
}

export function rerollUpgrades(game) {
  if (game.phase !== 'upgrade' || game.rerollsLeft <= 0) return false;
  game.choices = drawUpgradeChoices(game, game.choices);
  game.rerollsLeft--;
  return true;
}

export function advance(game, dt, control = { aimAngle: game.player.aimAngle }) {
  if (game.phase !== 'playing') return;
  game.audioCues = [];
  dt = Math.max(0, Math.min(0.1, dt));
  if (typeof control === 'number') {
    const targetX = Math.max(24, Math.min(WIDTH - 24, control));
    game.player.aimAngle = Math.atan2(-200, targetX - game.player.x);
  } else if (Number.isFinite(control?.aimAngle)) {
    game.player.aimAngle = control.aimAngle;
  }
  updateCombatTimers(game, dt);
  game.runTime += dt;
  game.waveTime += dt;
  if (game.encounter === 'boss') {
    if (game.spawnCount === 0) {
      const wave = configuredWave(game, WAVES.length - 1);
      const bossCount = activeStage(game).bossCount;
      for (let lane = 0; lane < bossCount; lane++) spawnChain(game, wave, lane);
      game.spawnCount = bossCount;
    }
  } else if (game.spawnCount === 0) {
    spawnChain(game, configuredWave(game, 0), 0);
    game.spawnCount = 1;
  }
  updateChains(game, dt);
  if (game.phase !== 'playing') return;
  updateWeakpoints(game);
  updateBossShields(game, activeStage(game).bossMode);
  updateHazards(game, dt, activeStage(game).mechanics.includes('hazard')
    || (game.encounter === 'boss' && ['hazard', 'final'].includes(activeStage(game).bossMode)));
  if (game.phase !== 'playing') return;
  fireCapsules(game, dt);
  fireSpecials(game, dt);
  if (game.phase !== 'playing') return;
  updateBullets(game, dt);
  if (game.phase !== 'playing') return;
  updateStatuses(game, dt);
  if (game.phase !== 'playing') return;
  updateEffects(game, dt);
  if (game.phase !== 'playing') return;
  updateBossShots(game, dt);
  updateEnemyBullets(game, dt);
  if (game.phase === 'playing' && game.encounter === 'boss'
    && game.spawnCount >= activeStage(game).bossCount && game.bosses.length > 0
    && game.bosses.every(boss => boss.dead)) {
    if (game.chapter === 26) {
      game.endlessTier++;
      game.encounter = 'normal';
      game.normalDestroyed = 0;
      game.bossDestroyed = 0;
      game.spawnCount = 0;
      game.wave = 1;
      game.waveTime = 0;
      game.chains = [];
      game.bosses = [];
      game.boss = null;
      game.hazards = [];
      game.hazardTimer = 0;
    } else game.phase = 'victory';
  }
}

export function chooseUpgrade(game, id) {
  if (game.phase !== 'upgrade' || !game.choices.includes(id)) return false;
  game.upgrades[id] = (game.upgrades[id] || 0) + 1;
  game.upgradeSource = null;
  game.choices = [];
  game.bullets = [];
  game.phase = 'playing';
  return true;
}
