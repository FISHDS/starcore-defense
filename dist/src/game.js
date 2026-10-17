import { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID } from './content.js?v=20261018-starcore-17';
import { routeLength, routePosition } from './routes.js?v=20261018-starcore-17';
import { assignTraits, chainSpeed, chestGuarded, healthPoolKey,
  poisonDamageRatio, pulseDamageRatio, selectNextHealthPoolTarget,
  steerBullet, uniqueHealthTargets, updateWeakpoints }
  from './mechanics.js?v=20261018-starcore-17';
import { createBossRig, updateBossRig } from './boss-rig.js?v=20261018-starcore-17';
import { bossProfileFor, bossRosterIndexFor } from './boss-profiles.js?v=20261018-starcore-17';

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

function normalSegmentsForChapter(chapter) {
  return chapter === 26 ? WAVES[0].segments
    : Math.min(WAVES[0].segments, Math.round(90 + (chapter - 1) * 5.42));
}

export function startRun(seed = Date.now(), profile = {}, chapter = 1) {
  const profileLevels = {
    fire: Math.max(0, Math.min(4, profile.fire || 0)),
    precision: Math.max(0, Math.min(4, profile.precision ?? profile.guard ?? 0)),
    scavenge: Math.max(0, Math.min(4, profile.scavenge || 0)),
    tactics: Math.max(0, Math.min(4, profile.tactics || 0)),
    collector: Math.max(0, Math.min(4, profile.collector || 0)),
  };
  const organs = Array.isArray(profile.equippedOrgans) ? profile.equippedOrgans : [];
  const weapon = ['capsule', 'scatter', 'rail', 'prism'].includes(profile.equippedWeapon)
    ? profile.equippedWeapon : 'capsule';
  return {
    phase: 'playing', seed: seed >>> 0,
    chapter: chapter === 26 || CHAPTERS.some(item => item.id === chapter) ? chapter : 1,
    endlessTier: 1, equippedWeapon: weapon, equippedOrgans: organs.slice(0, 2), shotCount: 0,
    wave: 1, waveTime: 0, runTime: 0,
    encounter: 'normal', normalTotal: normalSegmentsForChapter(chapter) - 1,
    normalDestroyed: 0, bossDestroyed: 0,
    spawnCount: 0, nextId: 1,
    fireTimer: 0, specialTimers: {}, normalShotTimer: 0,
    baseDamage: 40 + profileLevels.fire * 5,
    chestMaxHp: 100 - profileLevels.scavenge * 8 - (organs.includes('salvage') ? 15 : 0),
    profileLevels, score: 0, player: { ...playerPosition(chapter), aimAngle: -Math.PI / 2 },
    chains: [], chest: null, bullets: [], effects: [], popups: [],
    pickups: [], chargeFor: 0, comboCount: 0, comboTimer: 0,
    audioCues: [],
    boss: null, bosses: [], upgrades: {}, choices: [],
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
  const chain = 1 + Math.min(10, game.comboCount || 0) * (game.upgrades.combo || 0) * 0.015;
  const charge = game.chargeFor > 0 ? 1.25 : 1;
  return Math.round(natural * upgrades * (1 + game.profileLevels.precision * 0.06)
    * chain * charge
    * (game.equippedWeapon === 'rail' ? 1.2 : 1));
}

export function addBlastEffect(game, x, y, rank = 1) {
  const radius = 40 + Math.max(1, rank) * 11;
  const nearby = game.effects.find(effect => effect.kind === 'blast'
    && Math.hypot(effect.x - x, effect.y - y) < radius * 0.55);
  if (nearby) {
    nearby.life = Math.max(nearby.life, 0.18);
    nearby.radius = Math.max(nearby.radius || 0, radius);
    return nearby;
  }
  const blasts = game.effects.filter(effect => effect.kind === 'blast');
  if (blasts.length >= 12) game.effects.splice(game.effects.indexOf(blasts[0]), 1);
  const effect = { kind: 'blast', x, y, radius, life: 0.22, maxLife: 0.22 };
  game.effects.push(effect);
  return effect;
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
  // 體驗局保留長鏈，但提高耐久，讓玩家必須持續轉向追擊才趕得上守點。
  game.normalDestroyed = 105;
  game.upgrades = { power: 1, rapid: 1 };
  advance(game, 0.01);
  const boss = game.bosses[0];
  boss.segments = boss.segments.slice(0, 22);
  boss.originalBodyCount = boss.segments.length - 1;
  boss.speed = 27;
  for (const piece of boss.segments) {
    if (piece.index === 0) continue;
    piece.maxHp = Math.round((piece.chest ? 4000 : 7750) * (1 + piece.index * 0.045));
    piece.hp = piece.maxHp;
    piece.armorHp = 0;
  }
  for (const group of boss.healthGroups) {
    group.maxHp = Math.round(group.members.reduce((total, piece) => total + piece.maxHp, 0)
      / group.members.length * 2);
    group.hp = group.maxHp;
    for (const piece of group.members) {
      piece.maxHp = group.maxHp;
      piece.hp = group.hp;
    }
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
    segments: source.boss ? chapter.bossSegments
      : source === WAVES[0] ? normalSegmentsForChapter(game.chapter) : source.segments,
    hp: Math.round(source.hp * chapter.hpScale * (game.chapter === 26
      ? 1 + (game.endlessTier - 1) * 0.18 : 1)
      * (source.boss ? chapter.bossHpScale : 1)),
    speed: source.speed * chapter.speedScale * (source.boss ? 0.75 : 1)
      * (game.chapter === 26 ? 1 + (game.endlessTier - 1) * 0.04 : 1),
  };
}

function initialTravel(path, boss, preview = false, lane = 0) {
  if (boss) return preview ? 500 : -500;
  // 每條路線由入口外開始，避免開始作戰時頭目或長鏈已經在戰場內。
  for (let distance = -60; distance >= -800; distance -= 10) {
    const point = routePosition(path, false, lane, distance);
    if (point.x < -24 || point.x > WIDTH + 24
      || point.y < -24 || point.y > HEIGHT + 24) return distance;
  }
  return -800;
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
    tint: wave.tint, travel: initialTravel(wave.path, boss, game.preview, lane),
    spacing: boss ? 31 : 29, speed: wave.speed, actualSpeed: wave.speed,
    feedSpeed: 0,
    slowFor: 0, recoil: 0, entryComplete: boss, segments: [],
    originalBodyCount: boss ? count - 1 : 0,
    rig: boss ? createBossRig(bossProfileFor(game.chapter, lane).id) : null,
  };
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
  if (boss) buildBossHealthGroups(chain);
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

function buildBossHealthGroups(chain) {
  const runs = [];
  let run = [];
  const flush = () => {
    while (run.length >= 3) {
      const remainder = run.length - 4;
      const size = remainder === 1 || remainder === 2 ? 3 : 4;
      runs.push(run.splice(0, size));
    }
    if (run.length) runs.push(run.splice(0));
  };
  for (const piece of chain.segments) {
    if (piece.index === 0 || piece.chest) flush();
    if (piece.index > 0 && !piece.chest) run.push(piece);
  }
  flush();
  chain.healthGroups = runs.filter(members => members.length >= 2).map((members, index) => {
    const hp = Math.round(members.reduce((total, piece) => total + piece.maxHp, 0)
      / members.length * 2);
    const group = { id: `${chain.id}-hp-${index}`, hp, maxHp: hp, members };
    for (const piece of members) {
      piece.healthGroupId = group.id;
      piece.healthGroupLeader = piece === members[Math.floor(members.length / 2)];
      piece.maxHp = hp;
      piece.hp = hp;
    }
    return group;
  });
}

function addPopup(game, x, y, value, weak = false) {
  game.popups.push({ x, y, value: Math.round(value), life: 0.63, weak });
  if (game.popups.length > 65) game.popups.shift();
}

export function hitSegment(game, chain, segment, amount, options = {}) {
  if (game.phase !== 'playing' || chain.dead || !chain.segments.includes(segment)
    || segment.index === 0 || segment.hp <= 0
    || (!chain.boss && segment.transitShield
      && (options.projectile || options.special || options.dot))
    || (segment.chest && (options.special || options.dot))) return false;
  const supplyGuarded = !chain.boss && chestGuarded(chain, segment);
  const critical = !options.dot && random(game) < (game.upgrades.crit || 0) * 0.1;
  const weakpoint = segment.weakpoint && segment.weakOpen;
  const damage = Math.max(1, Math.round(amount * (critical ? 2 : 1)
    * (weakpoint ? 1 + game.profileLevels.collector * 0.12
      + (game.equippedOrgans.includes('focus-lens') ? 0.2 : 0) : 1)
    * (1 + segment.mark)
    * (supplyGuarded ? 0.35 : 1)
    * (segment.weakpoint ? (segment.weakOpen ? 1.6 : chain.boss ? 1 : 0.28) : 1)));
  const healthGroup = chain.boss && segment.healthGroupId
    ? chain.healthGroups.find(group => group.id === segment.healthGroupId) : null;
  const armor = Math.min(segment.armorHp || 0, damage);
  if (armor > 0) segment.armorHp -= armor;
  if (healthGroup) {
    healthGroup.hp -= damage - armor;
    for (const member of healthGroup.members) member.hp = healthGroup.hp;
  } else segment.hp -= damage - armor;
  addPopup(game, segment.x, segment.y - 12, damage, critical || segment.chest);
  game.effects.push({ kind: 'hit', x: segment.x, y: segment.y, life: 0.2, maxLife: 0.2 });
  if (chain.boss && chain.rig && !options.dot) chain.rig.hurtFor = 0.14;
  if (!options.dot) {
    const affected = healthGroup?.members || [segment];
    if (game.upgrades.frost) chain.slowFor = Math.max(chain.slowFor,
      0.45 + game.upgrades.frost * 0.25);
    if (game.upgrades.poison) for (const member of affected) {
      member.poisonFor = Math.max(member.poisonFor, 4 + game.upgrades.poison * 1.5);
    }
    if (game.upgrades.burn) for (const member of affected) {
      member.burnFor = Math.max(member.burnFor, 2 + game.upgrades.burn);
    }
    if (game.upgrades.mark) for (const member of affected) {
      member.mark = Math.max(member.mark, game.upgrades.mark * 0.11);
    }
  }
  if (game.upgrades.detonation && !options.dot && segment.poisonFor > 0
    && segment.burnFor > 0 && (segment.detonationCooldown || 0) <= 0) {
    const affected = healthGroup?.members || [segment];
    for (const member of affected) member.detonationCooldown = 1.2;
    addBlastEffect(game, segment.x, segment.y, 1);
    const blastIndex = chain.segments.indexOf(segment);
    const neighbors = uniqueHealthTargets([chain.segments[blastIndex - 1],
      chain.segments[blastIndex + 1]].filter(near => near?.index > 0 && !near.chest)
      .map(near => ({ chain, segment: near })));
    for (const { segment: near } of neighbors) {
      hitSegment(game, chain, near, getShotDamage(game) * 0.28, { dot: true });
    }
  }
  if ((healthGroup?.hp ?? segment.hp) > 0) return true;
  const position = chain.segments.indexOf(segment);
  const defeatedSegments = healthGroup ? [...healthGroup.members] : [segment];
  const neighbors = [chain.segments[position - 1],
    chain.segments[position + defeatedSegments.length]];
  const positions = defeatedSegments.map(piece => ({ x: piece.x, y: piece.y }));
  const defeatedIds = new Set(defeatedSegments.map(piece => piece.id));
  chain.segments = chain.segments.filter(piece => !defeatedIds.has(piece.id));
  if (healthGroup) chain.healthGroups = chain.healthGroups.filter(group => group !== healthGroup);
  chain.actualSpeed = chainSpeed(chain);
  chain.segments.forEach((piece, index) => { piece.index = index; });
  // 身體變短的距離由頭部沿路收回，尾段因索引前移而留在原位。
  chain.travel -= chain.spacing * defeatedSegments.length;
  chain.recoil = Math.max(chain.recoil || 0, 0.18);
  const anchorDuration = (game.upgrades.anchor || 0) * 0.12
    + (game.equippedOrgans.includes('anchor-organ') ? 0.08 : 0);
  if (anchorDuration > 0) {
    chain.anchorFor = Math.max(chain.anchorFor || 0, anchorDuration);
  }
  if (!chain.boss) {
    game.normalDestroyed += defeatedSegments.length;
    const nextWave = Math.min(5, 1 + Math.floor(game.normalDestroyed
      / (game.normalTotal / 5)));
    if (game.wave !== nextWave) { game.wave = nextWave; game.waveTime = 0; }
  } else game.bossDestroyed += defeatedSegments.length;
  game.score += (chain.boss ? 30 : 12) * defeatedSegments.length;
  game.comboCount = game.comboTimer > 0 ? Math.min(99, game.comboCount + 1) : 1;
  game.comboTimer = 2.5;
  if (!segment.chest && !options.dot && (game.upgrades.shatter || 0) > 0) {
    const targets = uniqueHealthTargets(neighbors.filter(neighbor => neighbor?.index > 0
      && chain.segments.includes(neighbor)).map(segment => ({ chain, segment })));
    for (const { segment: neighbor } of targets) {
      hitSegment(game, chain, neighbor, getShotDamage(game)
        * (0.12 + game.upgrades.shatter * 0.12), { dot: true });
    }
  }
  for (const position of positions) game.effects.push({ kind: 'burst',
    x: position.x, y: position.y, life: 0.43, maxLife: 0.43 });
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
    const origin = positions.reduce((sum, point) => ({
      x: sum.x + point.x / positions.length,
      y: sum.y + point.y / positions.length,
    }), { x: 0, y: 0 });
    const target = selectNextHealthPoolTarget(activeBodies(game), origin, new Set(), 210);
    if (target) {
      hitSegment(game, target.chain, target.segment, getShotDamage(game)
        * (0.35 + (game.upgrades.rebound - 1) * 0.12), { dot: true });
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
    chain.anchorFor = Math.max(0, (chain.anchorFor || 0) - dt);
    const visible = chain.segments.filter(piece => piece.index > 0
      && piece.y > 40 && piece.y < 730 && piece.x > -20 && piece.x < 410).length;
    if (visible >= 8) chain.entryComplete = true;
    const sparseFeed = chain.entryComplete && !chain.boss && chain.segments.length > 30
      && chain.segments[0].y < 500
      ? visible < 8 ? 165 : visible < 14 ? 75 : 0 : 0;
    const tailPressure = chain.entryComplete && !chain.boss && chain.speed > 0 && chain.segments.length > 30
      ? Math.min(95, Math.max(0, (390 - chain.segments[0].y) * 0.5)) : 0;
    const feedTarget = Math.max(sparseFeed, tailPressure);
    chain.feedSpeed = (chain.feedSpeed || 0)
      + (feedTarget - (chain.feedSpeed || 0)) * Math.min(1, dt * 2);
    chain.actualSpeed = chainSpeed(chain) + chain.feedSpeed;
    const movementScale = chain.anchorFor > 0 ? 0
      : chain.slowFor > 0 ? 0.72 : 1;
    const nextTravel = chain.travel + chain.actualSpeed * movementScale * dt;
    chain.travel = Math.min(routeLength(chain.path, chain.boss, chain.lane), nextTravel);
    chain.slowFor = Math.max(0, chain.slowFor - dt);
    reposition(chain, dt);
    const head = chain.segments[0];
    const escaped = game.player.y < 600
      ? Math.hypot(head.x - game.player.x, head.y - game.player.y) < 80
      : head.y >= 680;
    if (escaped) {
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
    const multi = game.upgrades.multi || 0;
    const count = 1 + multi
      + (game.equippedWeapon === 'scatter' ? 1 : 0);
    const extra = random(game) < (game.upgrades.echo || 0) * 0.22 ? 1 : 0;
    for (let shot = 0; shot < count + extra; shot++) {
      const angle = game.player.aimAngle
        + (shot - (count + extra - 1) / 2) * 0.035;
      const velocity = 520 + (game.upgrades.needle || 0) * 70;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      game.bullets.push({
        x: game.player.x + Math.cos(angle) * 24,
        y: game.player.y + Math.sin(angle) * 24,
        vx, vy, damage: getShotDamage(game) * (1 + multi * 0.45) / (1 + multi),
        speed: velocity,
        bounces: game.upgrades.bounce || 0,
        bounceLevel: game.upgrades.bounce || 0,
        pierceLevel: game.upgrades.pierce || 0,
        extraHit: false,
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
      hitPools: [], life: 2.1, maxLife: 2.1,
    });
  }
  if (game.upgrades.arc && specialTimer(game, 'arc', dt,
    Math.max(0.55, 1.7 - game.upgrades.arc * 0.2))) {
    const targets = uniqueHealthTargets(activeBodies(game).filter(({ segment }) =>
      inAimSector(game, segment, 560, 0.62)).sort((a, b) =>
      Math.hypot(a.segment.x - game.player.x, a.segment.y - game.player.y)
      - Math.hypot(b.segment.x - game.player.x, b.segment.y - game.player.y))
    )
      .slice(0, 2 + game.upgrades.arc + (game.upgrades.superconductor ? 2 : 0));
    let from = { x: game.player.x + Math.cos(game.player.aimAngle) * 22,
      y: game.player.y + Math.sin(game.player.aimAngle) * 22 };
    for (const target of targets) {
      game.effects.push({ kind: 'arc', x: from.x, y: from.y,
        x2: target.segment.x, y2: target.segment.y, life: 0.24, maxLife: 0.24 });
      hitSegment(game, target.chain, target.segment,
        power * (game.upgrades.superconductor ? 0.72 : 0.5), { special: true });
      if (game.upgrades.superconductor) target.chain.slowFor = Math.max(target.chain.slowFor, 1.1);
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
    const targets = uniqueHealthTargets(activeBodies(game).filter(({ segment }) =>
      inAimSector(game, segment, 520, 0.78)).sort((a, b) =>
      Math.hypot(a.segment.x - game.player.x, a.segment.y - game.player.y)
      - Math.hypot(b.segment.x - game.player.x, b.segment.y - game.player.y))
    )
      .slice(0, 4 + game.upgrades.saw * 2);
    for (const target of targets) {
      hitSegment(game, target.chain, target.segment,
        power * (0.22 + (game.upgrades.saw - 1) * 0.08), { special: true });
      if (game.phase !== 'playing') return;
    }
    game.effects.push({ kind: 'blast', x: game.player.x, y: game.player.y,
      life: 0.45, maxLife: 0.45 });
  }
  if (game.upgrades.pulse && specialTimer(game, 'pulse', dt, 4.5)) {
    for (const target of uniqueHealthTargets(activeBodies(game).filter(item =>
      inAimSector(game, item.segment, 360, 0.82)))) {
      hitSegment(game, target.chain, target.segment,
        power * pulseDamageRatio(game.upgrades.pulse), { special: true });
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

function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    bullet.hit ||= [];
    bullet.hitPools ||= [];
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
      .filter(({ chain, segment }) => !bullet.hit.includes(segment.id)
        && !bullet.hitPools.includes(healthPoolKey(chain, segment))
        && pointSegmentDistance(segment.x, segment.y, previousX, previousY,
          bullet.x, bullet.y) <= segment.radius + bullet.width)
      .sort((a, b) => pointSegmentProgress(b.segment.x, b.segment.y,
        previousX, previousY, bullet.x, bullet.y)
        - pointSegmentProgress(a.segment.x, a.segment.y,
          previousX, previousY, bullet.x, bullet.y));
    let consumed = false;
    for (const { chain, segment } of crossed) {
      const pool = healthPoolKey(chain, segment);
      if (bullet.hitPools.includes(pool)) continue;
      const oldX = segment.x;
      const oldY = segment.y;
      const extraHitLevel = Math.max(bullet.bounceLevel || bullet.bounces || 0,
        bullet.pierceLevel || bullet.pierce || 0);
      const damage = bullet.extraHit
        ? bullet.damage * (0.42 + 0.05 * Math.max(1, extraHitLevel)) : bullet.damage;
      if (!hitSegment(game, chain, segment, damage, { projectile: true })) continue;
      bullet.hit.push(segment.id);
      bullet.hitPools.push(pool);
      if (game.phase !== 'playing') { consumed = true; break; }
      if (bullet.bounces > 0) {
        const next = selectNextHealthPoolTarget(activeBodies(game),
          { x: oldX, y: oldY }, new Set(bullet.hitPools), 180);
        if (next) {
          const dx = next.segment.x - oldX;
          const dy = next.segment.y - oldY;
          const length = Math.hypot(dx, dy) || 1;
          bullet.x = oldX; bullet.y = oldY;
          bullet.vx = dx / length * bullet.speed;
          bullet.vy = dy / length * bullet.speed;
          bullet.bounces--;
          bullet.extraHit = true;
          game.effects.push({ kind: 'arc', x: oldX, y: oldY,
            x2: next.segment.x, y2: next.segment.y, life: 0.2, maxLife: 0.2 });
          consumed = false;
          break;
        }
      }
      if (game.upgrades.blast) {
        const splashPools = new Set([pool]);
        for (const nearby of chain.segments.slice(1)) {
          if (nearby === segment || nearby.hp <= 0) continue;
          if (Math.hypot(nearby.x - oldX, nearby.y - oldY)
            < 40 + game.upgrades.blast * 11) {
            const nearbyPool = healthPoolKey(chain, nearby);
            if (splashPools.has(nearbyPool)) continue;
            splashPools.add(nearbyPool);
            hitSegment(game, chain, nearby, bullet.damage * 0.24 * game.upgrades.blast,
              { dot: true });
            if (game.phase !== 'playing') break;
          }
        }
        addBlastEffect(game, oldX, oldY, game.upgrades.blast);
      }
      if (game.upgrades.bankshot && game.phase === 'playing') {
        const next = selectNextHealthPoolTarget(activeBodies(game),
          { x: oldX, y: oldY }, new Set(bullet.hitPools), 115);
        if (next) {
          game.effects.push({ kind: 'arc', x: oldX, y: oldY,
            x2: next.segment.x, y2: next.segment.y, life: 0.17, maxLife: 0.17 });
          hitSegment(game, next.chain, next.segment,
            bullet.damage * (0.2 + game.upgrades.bankshot * 0.1), { special: true });
        }
      }
      if (bullet.pierce > 0) {
        bullet.extraHit = true;
        bullet.pierce--;
      }
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
      for (const { chain, segment } of uniqueHealthTargets(activeBodies(game))) {
        const pool = healthPoolKey(chain, segment);
        effect.hitPools ||= [];
        if (effect.hitPools.includes(pool)) continue;
        const angle = Math.atan2(segment.y - effect.y, segment.x - effect.x);
        const difference = Math.atan2(Math.sin(angle - effect.angle),
          Math.cos(angle - effect.angle));
        if (Math.hypot(segment.x - effect.x, segment.y - effect.y) < effect.radius
          && Math.abs(difference) <= effect.halfAngle) {
          effect.hitPools.push(pool);
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
  for (const { chain, segment } of uniqueHealthTargets(activeBodies(game))) {
    const group = chain.boss && segment.healthGroupId
      ? chain.healthGroups.find(item => item.id === segment.healthGroupId) : null;
    const members = group?.members || [segment];
    const cooldown = Math.max(0, Math.max(...members.map(member =>
      member.detonationCooldown || 0)) - dt);
    for (const member of members) member.detonationCooldown = cooldown;
    const poisonFor = Math.max(...members.map(member => member.poisonFor || 0));
    if (poisonFor > 0) {
      const remaining = Math.max(0, poisonFor - dt);
      for (const member of members) member.poisonFor = remaining;
      hitSegment(game, chain, segment, getShotDamage(game)
        * poisonDamageRatio(game.upgrades.poison || 1) * dt, { dot: true });
    }
    const burnFor = Math.max(...members.map(member => member.burnFor || 0));
    if (burnFor > 0 && game.phase === 'playing') {
      const remaining = Math.max(0, burnFor - dt);
      for (const member of members) member.burnFor = remaining;
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
  fireCapsules(game, dt);
  fireSpecials(game, dt);
  if (game.phase !== 'playing') return;
  updateBullets(game, dt);
  if (game.phase !== 'playing') return;
  updateStatuses(game, dt);
  if (game.phase !== 'playing') return;
  updateEffects(game, dt);
  if (game.phase !== 'playing') return;
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
