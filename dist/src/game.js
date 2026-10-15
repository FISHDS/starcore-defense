import { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID } from './content.js?v=20261015-singlechain';
import { routeLength, routePosition } from './routes.js?v=20261015-singlechain';

export { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID };
export const WIDTH = 390;
export const HEIGHT = 844;
const RAIL_Y = 744;

export function startRun(seed = Date.now(), profile = {}, chapter = 1) {
  const profileLevels = {
    fire: Math.max(0, Math.min(4, profile.fire || 0)),
    guard: Math.max(0, Math.min(4, profile.guard || 0)),
    scavenge: Math.max(0, Math.min(4, profile.scavenge || 0)),
  };
  const maxCore = 120 + profileLevels.guard * 15;
  return {
    phase: 'playing', seed: seed >>> 0,
    chapter: CHAPTERS.some(item => item.id === chapter) ? chapter : 1,
    wave: 1, waveTime: 0, runTime: 0,
    encounter: 'normal', normalTotal: WAVES[0].segments - 1,
    normalDestroyed: 0, bossDestroyed: 0,
    spawnCount: 0, nextId: 1,
    fireTimer: 0, specialTimers: {}, bossShotTimer: 0, regenTimer: 0,
    maxCore, core: maxCore, baseDamage: 40 + profileLevels.fire * 5,
    chestMaxHp: 100 - profileLevels.scavenge * 8,
    profileLevels, score: 0, player: { x: WIDTH / 2, y: RAIL_Y },
    chains: [], chest: null, bullets: [], enemyBullets: [], effects: [], popups: [],
    boss: null, bosses: [], invulnerable: 0, upgrades: {}, choices: [],
    rerollsLeft: 0, upgradeSource: null,
  };
}

function random(game) {
  game.seed = (1664525 * game.seed + 1013904223) >>> 0;
  return game.seed / 4294967296;
}

export function getShotDamage(game) {
  const elapsed = Math.max(game.runTime, game.normalDestroyed * 1.2);
  const natural = game.baseDamage * (1 + elapsed / 60) ** 1.65;
  const upgrades = 1 + (game.upgrades.power || 0) * 0.35
    + (game.upgrades.needle || 0) * 0.14 + (game.upgrades.rail || 0) * 0.13;
  const danger = 1 + (game.upgrades.fury || 0) * 0.5 * (1 - game.core / game.maxCore);
  return Math.round(natural * upgrades * danger);
}

export function getRunProgress(game) {
  if (game.phase === 'victory') return 1;
  const normal = Math.min(1, game.normalDestroyed / game.normalTotal);
  const bossTotal = 2 * (WAVES.at(-1).segments - 1);
  const boss = Math.min(1, game.bossDestroyed / bossTotal);
  return normal * 0.8 + boss * 0.2;
}

function configuredWave(game, index) {
  const source = WAVES[index];
  const chapter = CHAPTERS[game.chapter - 1];
  const path = chapter.paths[index];
  const originalDistance = routeLength(source.path, !!source.boss, 0)
    - initialTravel(source.path, !!source.boss);
  const chapterDistance = routeLength(path, !!source.boss, 0)
    - initialTravel(path, !!source.boss);
  return {
    ...source,
    path,
    tint: chapter.tints[index],
    hp: Math.round(source.hp * chapter.hpScale),
    speed: source.speed * chapter.speedScale * chapterDistance / originalDistance,
  };
}

function initialTravel(path, boss) {
  if (boss) return 500;
  if (path === 'fork') return 950;
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
  }
}

function spawnChain(game, wave, lane = game.spawnCount) {
  const boss = !!wave.boss;
  const count = wave.segments;
  const chain = {
    id: game.nextId++, boss, dead: false, path: wave.path, lane, stage: game.wave,
    tint: wave.tint, travel: initialTravel(wave.path, boss),
    spacing: boss ? 31 : 29, speed: wave.speed,
    slowFor: 0, recoil: 0, segments: [],
  };
  const chestIndices = boss ? [5, 15, 26, 38]
    : [5, 18, 36, 60, 84, 110, 138, 168, 198];
  for (let index = 0; index < count; index++) {
    const head = index === 0;
    const chest = chestIndices.includes(index);
    const depthHp = boss ? wave.hp * (1 + index / count)
      : wave.hp * (1 + (index / 25) ** 3);
    const hp = head ? 1 : Math.round(depthHp * (chest
      ? Math.max(0.35, game.chestMaxHp / 200) : 1));
    chain.segments.push({
      id: game.nextId++, index, depth: index, x: 0, y: 0, hp, maxHp: hp,
      radius: head ? (boss ? 27 : 23) : chest ? 23 : boss ? 20 : 18,
      chest, gold: chest && (boss || index === 60 || index === 138 || index === 198),
      poisonFor: 0, burnFor: 0, mark: 0,
    });
  }
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
    || (segment.chest && (options.special || options.dot))) return false;
  const guarded = chain.boss && game.bosses.some(other => other !== chain && !other.dead
    && other.segments.some(piece => piece.index > 0 && piece.y > segment.y
      && piece.y < segment.y + 76 && Math.abs(piece.x - segment.x) < 48));
  const critical = !options.dot && random(game) < (game.upgrades.crit || 0) * 0.1;
  const damage = Math.max(1, Math.round(amount * (critical ? 2 : 1)
    * (segment.chest ? 1 + (game.upgrades.focus || 0) * 0.6 : 1)
    * (1 + segment.mark) * (guarded ? 0.66 : 1)));
  segment.hp -= damage;
  addPopup(game, segment.x, segment.y - 12, damage, critical || segment.chest);
  game.effects.push({ kind: 'hit', x: segment.x, y: segment.y, life: 0.2, maxLife: 0.2 });
  if (!options.dot) {
    if (game.upgrades.frost) chain.slowFor = Math.max(chain.slowFor, 0.8 + game.upgrades.frost * 0.5);
    if (game.upgrades.poison) segment.poisonFor = 3 + game.upgrades.poison;
    if (game.upgrades.burn) segment.burnFor = 2 + game.upgrades.burn;
    if (game.upgrades.mark) segment.mark = Math.max(segment.mark, game.upgrades.mark * 0.11);
  }
  if (segment.hp > 0) return true;
  const position = chain.segments.indexOf(segment);
  const neighbors = [chain.segments[position - 1], chain.segments[position + 1]];
  chain.segments.splice(position, 1);
  chain.segments.forEach((piece, index) => { piece.index = index; });
  // 收掉一節時把鏈頭的目標位置退一節；後段的路線位置因此保持不變。
  chain.travel -= chain.spacing;
  chain.recoil = Math.max(chain.recoil || 0,
    0.18 + (game.upgrades.anchor || 0) * 0.04);
  if (!chain.boss) {
    game.normalDestroyed++;
    const nextWave = Math.min(5, 1 + Math.floor(game.normalDestroyed
      / (game.normalTotal / 5)));
    if (game.wave !== nextWave) { game.wave = nextWave; game.waveTime = 0; }
  } else game.bossDestroyed++;
  game.score += (chain.boss ? 30 : 12) * (1 + (game.upgrades.bounty || 0));
  game.effects.push({ kind: 'burst', x: segment.x, y: segment.y, life: 0.43, maxLife: 0.43 });
  if (chain.segments.length === 1) {
    chain.dead = true;
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
    if (chain.recoil > 0) {
      chain.recoil = Math.max(0, chain.recoil - dt);
    } else {
      chain.travel += chain.speed * (chain.slowFor > 0 ? 0.58 : 1) * dt;
    }
    chain.slowFor = Math.max(0, chain.slowFor - dt);
    reposition(chain, dt);
    if (chain.segments[0].y >= RAIL_Y - 8) {
      game.effects.push({ kind: 'breach', x: chain.segments[0].x,
        y: RAIL_Y, life: 0.55, maxLife: 0.55 });
      game.phase = 'defeat';
      return;
    }
  }
}

function fireCapsules(game, dt) {
  game.fireTimer += dt;
  const interval = 0.19 / (1 + (game.upgrades.rapid || 0) * 0.18);
  while (game.fireTimer >= interval) {
    game.fireTimer -= interval;
    const count = 1 + (game.upgrades.multi || 0);
    const extra = random(game) < (game.upgrades.echo || 0) * 0.22 ? 1 : 0;
    for (let shot = 0; shot < count + extra; shot++) {
      game.bullets.push({
        x: Math.max(10, Math.min(WIDTH - 10, game.player.x
          + (shot - (count + extra - 1) / 2) * (8 + (game.upgrades.scatter || 0) * 4))),
        y: game.player.y - 29, damage: getShotDamage(game),
        pierce: game.upgrades.pierce || 0, hit: [],
        seeking: random(game) < (game.upgrades.magnet || 0) * 0.22,
        width: 4 + (game.upgrades.rail || 0) * 3,
      });
    }
  }
}

function activeBodies(game) {
  return game.chains.flatMap(chain => chain.segments.slice(1)
    .filter(segment => segment.hp > 0 && segment.y > 45 && segment.y < RAIL_Y
      && segment.x > -segment.radius && segment.x < WIDTH + segment.radius)
    .map(segment => ({ chain, segment })));
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
      kind: 'orbit', x: game.player.x, y: game.player.y - 60,
      radius: 70 + game.upgrades.orbit * 10, damage: power * 0.48,
      hit: [], life: 2.1, maxLife: 2.1,
    });
  }
  if (game.upgrades.arc && specialTimer(game, 'arc', dt,
    Math.max(0.55, 1.7 - game.upgrades.arc * 0.2))) {
    const targets = activeBodies(game).sort((a, b) => b.segment.y - a.segment.y)
      .slice(0, 2 + game.upgrades.arc);
    let from = { x: game.player.x, y: game.player.y - 22 };
    for (const target of targets) {
      game.effects.push({ kind: 'arc', x: from.x, y: from.y,
        x2: target.segment.x, y2: target.segment.y, life: 0.24, maxLife: 0.24 });
      hitSegment(game, target.chain, target.segment, power * 0.58, { special: true });
      from = target.segment;
      if (game.phase !== 'playing') return;
    }
  }
  if (game.upgrades.drone && specialTimer(game, 'drone', dt,
    Math.max(0.45, 1.25 - game.upgrades.drone * 0.19))) {
    const target = activeBodies(game).sort((a, b) => b.segment.y - a.segment.y)[0];
    if (target) {
      game.effects.push({ kind: 'arc', x: game.player.x + 40, y: RAIL_Y - 35,
        x2: target.segment.x, y2: target.segment.y, life: 0.26, maxLife: 0.26 });
      hitSegment(game, target.chain, target.segment,
        power * (0.5 + game.upgrades.drone * 0.25), { special: true });
    }
  }
  if (game.upgrades.saw && specialTimer(game, 'saw', dt, 2.3)) {
    const targets = activeBodies(game).sort((a, b) => b.segment.y - a.segment.y)
      .slice(0, 4 + game.upgrades.saw * 2);
    for (const target of targets) {
      hitSegment(game, target.chain, target.segment,
        power * 0.34 * game.upgrades.saw, { special: true });
      if (game.phase !== 'playing') return;
    }
    game.effects.push({ kind: 'blast', x: game.player.x, y: RAIL_Y - 170,
      life: 0.45, maxLife: 0.45 });
  }
  if (game.upgrades.pulse && specialTimer(game, 'pulse', dt, 4.5)) {
    for (const target of activeBodies(game).filter(item => item.segment.y > 390)) {
      hitSegment(game, target.chain, target.segment,
        power * 0.13 * game.upgrades.pulse, { special: true });
      if (game.phase !== 'playing') return;
    }
    game.effects.push({ kind: 'orbit', x: game.player.x, y: RAIL_Y - 60,
      radius: 225, damage: 0, hit: [], life: 0.45, maxLife: 0.45 });
  }
}

function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    if (bullet.seeking) {
      const chest = activeBodies(game).filter(item => item.segment.chest)
        .sort((a, b) => b.segment.y - a.segment.y)[0]?.segment;
      if (chest && chest.y < bullet.y) bullet.x += Math.max(-240 * dt,
        Math.min(240 * dt, chest.x - bullet.x));
    }
    const previousY = bullet.y;
    bullet.y -= (1250 + (game.upgrades.needle || 0) * 100) * dt;
    const crossed = activeBodies(game)
      .filter(({ segment }) => !bullet.hit.includes(segment.id)
        && Math.abs(bullet.x - segment.x) <= segment.radius + bullet.width
        && previousY >= segment.y - segment.radius
        && bullet.y <= segment.y + segment.radius)
      .sort((a, b) => b.segment.y - a.segment.y);
    let consumed = false;
    for (const { chain, segment } of crossed) {
      const oldX = segment.x;
      const oldY = segment.y;
      if (!hitSegment(game, chain, segment, bullet.damage)) continue;
      bullet.hit.push(segment.id);
      if (game.phase !== 'playing') { consumed = true; break; }
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
      if (bullet.pierce > 0) bullet.pierce--;
      else { consumed = true; break; }
    }
    if (consumed || bullet.y < -30) game.bullets.splice(i, 1);
  }
}

function updateEffects(game, dt) {
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const effect = game.effects[i];
    if (effect.kind === 'orbit' && effect.damage > 0) {
      effect.y -= 340 * dt;
      for (const { chain, segment } of activeBodies(game)) {
        if (effect.hit.includes(segment.id)) continue;
        if (Math.hypot(segment.x - effect.x, segment.y - effect.y) < effect.radius) {
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
    if (segment.poisonFor > 0) {
      segment.poisonFor -= dt;
      hitSegment(game, chain, segment, getShotDamage(game)
        * 0.11 * (game.upgrades.poison || 0) * dt, { dot: true });
    }
    if (segment.burnFor > 0 && game.phase === 'playing') {
      segment.burnFor -= dt;
      hitSegment(game, chain, segment, getShotDamage(game)
        * 0.18 * (game.upgrades.burn || 0) * dt, { dot: true });
    }
    if (game.phase !== 'playing') return;
  }
}

function updateBossShots(game, dt) {
  if (!game.bosses.some(boss => !boss.dead)) return;
  game.bossShotTimer += dt;
  while (game.bossShotTimer >= 2.2) {
    game.bossShotTimer -= 2.2;
    for (const boss of game.bosses) {
      if (boss.dead || boss.segments[0].y < 120) continue;
      const head = boss.segments[0];
      for (const spread of [-40, 40]) {
        game.enemyBullets.push({ x: head.x, y: head.y + 25,
          vx: (game.player.x - head.x) * 0.28 + spread, vy: 220, radius: 7 });
      }
    }
  }
}

function updateEnemyBullets(game, dt) {
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const shot = game.enemyBullets[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (Math.abs(shot.x - game.player.x) < shot.radius + 15
      && Math.abs(shot.y - game.player.y) < shot.radius + 15 && game.invulnerable === 0) {
      game.enemyBullets.splice(i, 1);
      game.core = Math.max(0, game.core - Math.max(3, 9 - (game.upgrades.shield || 0) * 2));
      game.invulnerable = 0.7;
      if (game.core <= 0) game.phase = 'defeat';
    } else if (shot.y > HEIGHT + 20 || shot.x < -30 || shot.x > WIDTH + 30) {
      game.enemyBullets.splice(i, 1);
    }
  }
}

function drawUpgradeChoices(game, previous = []) {
  const available = UPGRADES.filter(item => (game.upgrades[item.id] || 0) < item.max);
  const fresh = available.filter(item => !previous.includes(item.id));
  const pool = [...(fresh.length >= 3 ? fresh : available)];
  const weight = game.upgradeSource === 'gold'
    ? { common: 2, rare: 5, epic: 3 } : { common: 5, rare: 3, epic: 1 };
  const choices = [];
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
  game.rerollsLeft = 1;
  game.choices = drawUpgradeChoices(game);
}

export function rerollUpgrades(game) {
  if (game.phase !== 'upgrade' || game.rerollsLeft <= 0) return false;
  game.choices = drawUpgradeChoices(game, game.choices);
  game.rerollsLeft--;
  return true;
}

export function advance(game, dt, targetX = game.player.x) {
  if (game.phase !== 'playing') return;
  dt = Math.max(0, Math.min(0.1, dt));
  game.player.x = Math.max(24, Math.min(WIDTH - 24, targetX));
  game.runTime += dt;
  game.waveTime += dt;
  if (game.encounter === 'boss') {
    if (game.spawnCount === 0) {
      const wave = configuredWave(game, WAVES.length - 1);
      spawnChain(game, wave, 0);
      spawnChain(game, wave, 1);
      game.spawnCount = 2;
    }
  } else if (game.spawnCount === 0) {
    spawnChain(game, configuredWave(game, 0), 0);
    game.spawnCount = 1;
  }
  updateChains(game, dt);
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
  if (game.upgrades.secondwind && game.core < game.maxCore / 2) {
    game.regenTimer += dt;
    if (game.regenTimer >= 5) {
      game.regenTimer = 0;
      game.core = Math.min(game.maxCore, game.core + game.upgrades.secondwind * 2);
    }
  }
  if (game.phase === 'playing' && game.encounter === 'boss'
    && game.spawnCount >= 2 && game.bosses.length > 0
    && game.bosses.every(boss => boss.dead)) {
    game.phase = 'victory';
  }
}

export function chooseUpgrade(game, id) {
  if (game.phase !== 'upgrade' || !game.choices.includes(id)) return false;
  game.upgrades[id] = (game.upgrades[id] || 0) + 1;
  if (id === 'repair') game.core = Math.min(game.maxCore, game.core + 24);
  game.upgradeSource = null;
  game.choices = [];
  game.bullets = [];
  game.phase = 'playing';
  return true;
}
