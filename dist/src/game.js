import { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID } from './content.js';

export { WAVES, CHAPTERS, UPGRADES, UPGRADE_BY_ID };
export const WIDTH = 390;
export const HEIGHT = 844;
const RAIL_Y = 744;
const LAST_TIME = WAVES.at(-1).startsAt + WAVES.at(-1).duration;

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
    spawnCount: 0, nextSpawnAt: 0, nextId: 1,
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
  const natural = game.baseDamage * (1 + game.runTime / 60) ** 1.65;
  const upgrades = 1 + (game.upgrades.power || 0) * 0.35
    + (game.upgrades.needle || 0) * 0.14 + (game.upgrades.rail || 0) * 0.13;
  const danger = 1 + (game.upgrades.fury || 0) * 0.5 * (1 - game.core / game.maxCore);
  return Math.round(natural * upgrades * danger);
}

function currentWaveIndex(time) {
  for (let index = WAVES.length - 1; index >= 0; index--) {
    if (time >= WAVES[index].startsAt) return index;
  }
  return 0;
}

function configuredWave(game, index) {
  const source = WAVES[index];
  const chapter = CHAPTERS[game.chapter - 1];
  return {
    ...source,
    path: chapter.paths[index],
    tint: chapter.tints[index],
    hp: Math.round(source.hp * chapter.hpScale),
    speed: source.speed * chapter.speedScale,
    spawnGap: source.spawnGap * chapter.gapScale,
  };
}

function trackPosition(chain, index) {
  const distance = chain.travel - index * chain.spacing;
  const side = chain.lane % 2 ? -1 : 1;
  let x;
  switch (chain.path) {
    case 'mirror':
      x = WIDTH / 2 + side * (93 + 42 * Math.sin(distance / 68 + 0.6)); break;
    case 'fork':
      x = WIDTH / 2 + side * (87 + 47 * Math.sin(distance / 92 + 0.4)); break;
    case 'weave':
      x = WIDTH / 2 + 105 * Math.sin(distance / 61 + chain.phase)
        + 29 * Math.sin(distance / 22 + chain.phase); break;
    case 'spiral':
      x = WIDTH / 2 + (89 + 51 * Math.sin(distance / 135))
        * Math.sin(distance / 56 + chain.phase); break;
    case 'cross':
      x = WIDTH / 2 + 138 * Math.sin(distance / 62
        + (chain.lane % 2 ? Math.PI : 0) + 0.5); break;
    default:
      x = WIDTH / 2 + 140 * Math.sin(distance / 76 + chain.phase);
  }
  return {
    x: Math.max(25, Math.min(WIDTH - 25, x)),
    y: 174 + distance * (chain.boss ? 0.19 : 0.21)
      + (chain.boss ? 42 : 22) * Math.sin(distance / 77 + chain.phase)
      + chain.yOffset,
  };
}

function reposition(chain) {
  for (let index = 0; index < chain.segments.length; index++) {
    const segment = chain.segments[index];
    segment.index = index;
    const position = trackPosition(chain, index);
    segment.x = position.x;
    segment.y = position.y;
  }
}

function spawnChain(game, wave, lane = game.spawnCount) {
  const boss = !!wave.boss;
  const count = wave.segments + (boss ? 0 : Math.floor(random(game) * 5));
  const chain = {
    id: game.nextId++, boss, dead: false, path: wave.path, lane, stage: game.wave,
    tint: wave.tint, phase: random(game) * Math.PI * 2,
    yOffset: (lane % 2 ? -25 : 0), travel: 275,
    spacing: boss ? 25 : 23, speed: wave.speed * (lane % 3 === 2 ? 1.06 : 1),
    slowFor: 0, breachLock: 0, breaches: 0, segments: [],
  };
  const chestIndex = 10 + Math.floor(random(game) * 7);
  const carriesChest = boss || lane % 3 !== 2;
  for (let index = 0; index < count; index++) {
    const head = index === 0;
    const chest = carriesChest && index === chestIndex;
    const hp = head ? 1 : Math.round(wave.hp * (chest
      ? Math.max(0.25, game.chestMaxHp / 250) : 1) * (boss ? 1.15 : 1));
    chain.segments.push({
      id: game.nextId++, index, x: 0, y: 0, hp, maxHp: hp,
      radius: head ? (boss ? 27 : 23) : chest ? 23 : boss ? 20 : 18,
      chest, gold: chest && (boss || lane % 4 === 0),
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
  chain.travel -= chain.spacing * (1.75 + (game.upgrades.anchor || 0) * 0.42);
  reposition(chain);
  game.score += (chain.boss ? 30 : 12) * (1 + (game.upgrades.bounty || 0));
  game.effects.push({ kind: 'burst', x: segment.x, y: segment.y, life: 0.43, maxLife: 0.43 });
  if (chain.segments.length === 1) {
    chain.dead = true;
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
    chain.breachLock = Math.max(0, chain.breachLock - dt);
    chain.travel += chain.speed * (chain.slowFor > 0 ? 0.58 : 1) * dt;
    chain.slowFor = Math.max(0, chain.slowFor - dt);
    reposition(chain);
    if (chain.segments[0].y >= RAIL_Y - 8 && chain.breachLock <= 0) {
      chain.breaches++;
      const damage = Math.max(4, (chain.boss ? 22 : 8 + chain.stage * 2)
        - (game.upgrades.shield || 0) * 3);
      game.core = Math.max(0, game.core - damage);
      game.effects.push({ kind: 'breach', x: chain.segments[0].x,
        y: RAIL_Y, life: 0.55, maxLife: 0.55 });
      chain.travel -= chain.boss ? 700 : 650;
      chain.breachLock = 4;
      reposition(chain);
      if (!chain.boss && chain.breaches >= 3) chain.dead = true;
      if (game.core <= 0) game.phase = 'defeat';
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
          + (shot - (count + extra - 1) / 2) * (25 + (game.upgrades.scatter || 0) * 9))),
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
    .filter(segment => segment.hp > 0 && segment.y > 45 && segment.y < RAIL_Y)
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
    bullet.y -= (650 + (game.upgrades.needle || 0) * 85) * dt;
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
  const waveIndex = currentWaveIndex(game.runTime);
  if (game.wave !== waveIndex + 1) {
    game.wave = waveIndex + 1;
    game.spawnCount = 0;
    game.nextSpawnAt = game.runTime;
  }
  const wave = configuredWave(game, waveIndex);
  game.waveTime = game.runTime - wave.startsAt;
  if (wave.boss) {
    if (game.spawnCount === 0) {
      spawnChain(game, wave, 0);
      spawnChain(game, wave, 1);
      game.spawnCount = 2;
    }
  } else if (game.runTime >= game.nextSpawnAt
    && game.runTime < wave.startsAt + wave.duration) {
    spawnChain(game, wave);
    game.spawnCount++;
    game.nextSpawnAt = game.runTime + wave.spawnGap;
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
  if (game.phase === 'playing' && game.runTime >= LAST_TIME
    && game.bosses.length === 2 && game.bosses.every(boss => boss.dead)) {
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
