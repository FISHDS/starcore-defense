import { WAVES, UPGRADES, UPGRADE_BY_ID } from './content.js';

export { WAVES, UPGRADES, UPGRADE_BY_ID };
export const WIDTH = 390;
export const HEIGHT = 844;
const RAIL_Y = 744;

export function startRun(seed = Date.now(), profile = {}) {
  const profileLevels = {
    fire: Math.max(0, Math.min(4, profile.fire || 0)),
    guard: Math.max(0, Math.min(4, profile.guard || 0)),
    scavenge: Math.max(0, Math.min(4, profile.scavenge || 0)),
  };
  const maxCore = 100 + profileLevels.guard * 15;
  return {
    phase: 'playing',
    seed: seed >>> 0,
    wave: 1,
    waveTime: 0,
    spawnCount: 0,
    nextId: 1,
    fireTimer: 0,
    orbitTimer: 0,
    arcTimer: 0,
    bossShotTimer: 0,
    maxCore,
    core: maxCore,
    baseDamage: 20 + profileLevels.fire * 3,
    chestMaxHp: 80 - profileLevels.scavenge * 9,
    profileLevels,
    score: 0,
    player: { x: WIDTH / 2, y: RAIL_Y },
    chains: [],
    chest: null,
    chestSpawned: false,
    bullets: [],
    enemyBullets: [],
    effects: [],
    popups: [],
    boss: null,
    bosses: [],
    invulnerable: 0,
    upgrades: {},
    choices: [],
    rerollsLeft: 0,
    upgradeSource: null,
    routeId: 'stable',
    routeChoices: [],
    bonusDNA: 0,
  };
}

function random(game) {
  game.seed = (1664525 * game.seed + 1013904223) >>> 0;
  return game.seed / 4294967296;
}

function trackPosition(chain, index) {
  const distance = chain.travel - index * chain.spacing;
  const side = chain.lane % 2 ? -1 : 1;
  let x;
  switch (chain.path) {
    case 'mirror':
      x = WIDTH / 2 + side * 135 * Math.sin(distance / 73 + 0.6);
      break;
    case 'fork':
      x = WIDTH / 2 + side * (67 + 66 * Math.sin(distance / 100 + 0.4));
      break;
    case 'weave':
      x = WIDTH / 2 + 109 * Math.sin(distance / 62 + chain.phase)
        + 23 * Math.sin(distance / 22 + chain.phase);
      break;
    case 'spiral':
      x = WIDTH / 2 + (90 + 50 * Math.sin(distance / 145))
        * Math.sin(distance / 58 + chain.phase);
      break;
    case 'cross':
      x = WIDTH / 2 + 134 * Math.sin(distance / 71 + (chain.lane ? Math.PI : 0) + 0.5);
      break;
    default:
      x = WIDTH / 2 + 143 * Math.sin(distance / 78 + chain.phase);
  }
  return {
    x: Math.max(25, Math.min(WIDTH - 25, x)),
    y: chain.boss
      ? 82 + distance * 0.16 + 45 * Math.sin(distance / 76 + chain.phase) + chain.yOffset
      : 82 + distance * 0.2 + 14 * Math.sin(distance / 90 + chain.phase) + chain.yOffset,
  };
}

function spawnChain(game, wave) {
  const isBoss = !!wave.boss;
  const count = wave.segments + (isBoss ? 0 : Math.floor(random(game) * 4));
  const chain = {
    id: game.nextId++,
    boss: isBoss,
    path: wave.path,
    lane: game.spawnCount,
    tint: wave.tint,
    phase: random(game) * Math.PI * 2,
    yOffset: (game.spawnCount % 2) * (isBoss ? -24 : -28),
    travel: 360,
    spacing: isBoss ? 27 : 25,
    speed: wave.speed * (game.routeId === 'volatile' ? 1.06 : 1),
    slowFor: 0,
    atBase: false,
    breachTimer: 0,
    segments: [],
  };
  for (let index = 0; index < count; index++) {
    const baseHp = isBoss && index === 0 ? 340 : wave.hp * (index === 0 ? 1.6 : 1);
    const hp = Math.round(baseHp * (game.routeId === 'volatile' ? 1.28 : 1));
    const position = trackPosition(chain, index);
    chain.segments.push({
      id: game.nextId++,
      index,
      x: position.x,
      y: position.y,
      hp,
      maxHp: hp,
      radius: isBoss && index === 0 ? 24 : isBoss ? 19 : 17,
    });
  }
  game.chains.push(chain);
  if (isBoss) {
    game.bosses.push(chain);
    game.boss ||= chain;
  }
}

function addPopup(game, x, y, value, weak = false) {
  game.popups.push({ x, y, value: Math.round(value), life: 0.64, weak });
  if (game.popups.length > 55) game.popups.shift();
}

function damageSegment(game, chain, segment, amount, weak = false) {
  if (segment.hp <= 0 || game.phase !== 'playing') return;
  const guarded = weak && chain.boss && game.bosses.some(other => other !== chain
    && other.segments[0].hp > 0
    && other.segments.some(piece => piece.hp > 0 && piece.y > segment.y
      && piece.y < segment.y + 72 && Math.abs(piece.x - segment.x) < 44));
  const damage = Math.max(1, Math.round(amount
    * (weak ? 1.9 + (game.upgrades.focus || 0) * 0.5 : 1)
    * (guarded ? 0.45 : 1)));
  segment.hp -= damage;
  addPopup(game, segment.x, segment.y - 12, damage, weak);
  game.effects.push({ kind: 'hit', x: segment.x, y: segment.y, life: 0.24, maxLife: 0.24 });
  if (game.upgrades.frost) chain.slowFor = Math.max(chain.slowFor, 1.4 + game.upgrades.frost * 0.7);
  if (segment.hp <= 0) {
    game.score += chain.boss ? 20 : 10;
    game.effects.push({ kind: 'burst', x: segment.x, y: segment.y, life: 0.42, maxLife: 0.42 });
    if (chain.boss && segment.index === 0) {
      game.score += 250;
      for (const piece of chain.segments) piece.hp = 0;
      if (game.bosses.every(boss => boss.segments[0].hp <= 0)) game.phase = 'victory';
    }
  }
}

function updateChains(game, dt) {
  for (let chainIndex = game.chains.length - 1; chainIndex >= 0; chainIndex--) {
    const chain = game.chains[chainIndex];
    if (chain.boss && chain.segments[0].hp <= 0) {
      game.chains.splice(chainIndex, 1);
      continue;
    }
    if (chain.atBase) {
      chain.breachTimer += dt;
      while (chain.breachTimer >= 3 && game.core > 0) {
        chain.breachTimer -= 3;
        game.core = Math.max(0, game.core - Math.max(3, 9 - (game.upgrades.shield || 0) * 2));
        game.effects.push({ kind: 'breach', x: chain.segments[0].x, y: RAIL_Y, life: 0.55, maxLife: 0.55 });
      }
      if (game.core <= 0) game.phase = 'defeat';
      continue;
    }
    chain.travel += chain.speed * (chain.slowFor > 0 ? 0.55 : 1) * dt;
    chain.slowFor = Math.max(0, chain.slowFor - dt);
    for (const segment of chain.segments) {
      const position = trackPosition(chain, segment.index);
      segment.x = position.x;
      segment.y = position.y;
    }
    if (chain.segments[0].y >= RAIL_Y - 8) {
      const damage = Math.max(5, (chain.boss ? 18 : 17) - (game.upgrades.shield || 0) * 4);
      game.core = Math.max(0, game.core - damage);
      game.effects.push({ kind: 'breach', x: chain.segments[0].x, y: RAIL_Y, life: 0.55, maxLife: 0.55 });
      if (chain.boss && game.core > 0) {
        chain.atBase = true;
        const offset = chain.segments[0].y - (RAIL_Y - 50);
        for (const segment of chain.segments) {
          segment.y -= offset;
        }
      } else {
        game.chains.splice(chainIndex, 1);
      }
      if (game.core <= 0) game.phase = 'defeat';
    } else if (chain.segments.every(segment => segment.hp <= 0)) {
      game.chains.splice(chainIndex, 1);
    }
  }
}

function fireCapsules(game, dt) {
  game.fireTimer += dt;
  const interval = 0.21 / (1 + (game.upgrades.rapid || 0) * 0.2);
  while (game.fireTimer >= interval) {
    game.fireTimer -= interval;
    const count = 1 + (game.upgrades.multi || 0);
    for (let shot = 0; shot < count; shot++) {
      game.bullets.push({
        x: Math.max(9, Math.min(WIDTH - 9, game.player.x + (shot - (count - 1) / 2) * 24)),
        y: game.player.y - 28,
        damage: game.baseDamage * (1 + (game.upgrades.power || 0) * 0.3),
        pierce: game.upgrades.pierce || 0,
        hit: [],
      });
    }
  }
}

function updateChest(game, wave, dt) {
  if (!game.chestSpawned && game.waveTime >= (wave.chestAt || 6)) {
    game.chestSpawned = true;
    game.chest = {
      x: WIDTH / 2, y: 255, hp: game.chestMaxHp,
      maxHp: game.chestMaxHp, radius: 24,
    };
  }
  if (!game.chest) return;
  game.chest.x = WIDTH / 2 + Math.sin(game.waveTime * 1.15) * 119;
  game.chest.y += 22 * dt;
  if (game.chest.y > RAIL_Y - 45) game.chest = null;
}

function fireSpecials(game, dt) {
  if (game.upgrades.orbit) {
    game.orbitTimer += dt;
    const interval = 1.35 - game.upgrades.orbit * 0.16;
    while (game.orbitTimer >= interval) {
      game.orbitTimer -= interval;
      game.effects.push({
        kind: 'orbit', x: game.player.x, y: game.player.y - 45,
        radius: 64 + game.upgrades.orbit * 8,
        damage: 14 + game.upgrades.orbit * 7,
        hit: [], life: 2.1, maxLife: 2.1,
      });
    }
  }
  if (game.upgrades.arc) {
    game.arcTimer += dt;
    const interval = 1.65 - game.upgrades.arc * 0.2;
    while (game.arcTimer >= interval) {
      game.arcTimer -= interval;
      const targets = game.chains.flatMap(chain => chain.segments
        .filter(segment => segment.hp > 0 && segment.y > 80 && segment.y < RAIL_Y)
        .map(segment => ({ chain, segment })))
        .sort((a, b) => b.segment.y - a.segment.y)
        .slice(0, 2 + game.upgrades.arc);
      let from = { x: game.player.x, y: game.player.y - 22 };
      for (const target of targets) {
        const { chain, segment } = target;
        game.effects.push({
          kind: 'arc', x: from.x, y: from.y, x2: segment.x, y2: segment.y,
          life: 0.24, maxLife: 0.24,
        });
        damageSegment(game, chain, segment, 13 + game.upgrades.arc * 7, segment.index === 0);
        from = segment;
      }
    }
  }
}

function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    const previousY = bullet.y;
    bullet.y -= 680 * dt;
    const crossed = game.chains.flatMap(chain => chain.segments
      .filter(segment => segment.hp > 0
        && !bullet.hit.includes(segment.id)
        && Math.abs(bullet.x - segment.x) <= segment.radius + 4
        && previousY >= segment.y - segment.radius
        && bullet.y <= segment.y + segment.radius)
      .map(segment => ({ chain, segment })))
      .sort((a, b) => b.segment.y - a.segment.y);
    if (game.chest && Math.abs(bullet.x - game.chest.x) <= game.chest.radius + 4
      && previousY >= game.chest.y - game.chest.radius
      && bullet.y <= game.chest.y + game.chest.radius) {
      crossed.push({ chain: null, segment: game.chest });
      crossed.sort((a, b) => b.segment.y - a.segment.y);
    }
    let consumed = false;
    for (const { chain, segment } of crossed) {
      if (!chain) {
        segment.hp -= bullet.damage;
        addPopup(game, segment.x, segment.y - 10, bullet.damage);
        game.effects.push({ kind: 'hit', x: segment.x, y: segment.y, life: 0.24, maxLife: 0.24 });
        if (segment.hp <= 0) {
          game.effects.push({ kind: 'burst', x: segment.x, y: segment.y, life: 0.55, maxLife: 0.55 });
          game.chest = null;
          presentUpgrades(game, 'chest');
        }
        consumed = true;
        break;
      }
      damageSegment(game, chain, segment, bullet.damage, segment.index === 0);
      bullet.hit.push(segment.id);
      if (game.upgrades.blast) {
        for (const nearby of chain.segments) {
          if (nearby === segment || nearby.hp <= 0) continue;
          if (Math.hypot(nearby.x - segment.x, nearby.y - segment.y) < 44 + game.upgrades.blast * 10) {
            damageSegment(game, chain, nearby, bullet.damage * 0.38);
          }
        }
        game.effects.push({ kind: 'blast', x: segment.x, y: segment.y, life: 0.3, maxLife: 0.3 });
      }
      if (bullet.pierce > 0) bullet.pierce--;
      else { consumed = true; break; }
      if (game.phase !== 'playing') break;
    }
    if (consumed || bullet.y < -30) game.bullets.splice(i, 1);
  }
}

function updateEffects(game, dt) {
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const effect = game.effects[i];
    if (effect.kind === 'orbit') {
      effect.y -= 370 * dt;
      for (const chain of game.chains) {
        for (const segment of chain.segments) {
          if (segment.hp <= 0 || effect.hit.includes(segment.id)) continue;
          if (Math.hypot(segment.x - effect.x, segment.y - effect.y) < effect.radius) {
            effect.hit.push(segment.id);
            damageSegment(game, chain, segment, effect.damage, segment.index === 0);
          }
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

function updateBossShots(game, dt) {
  if (!game.bosses.some(boss => boss.segments[0].hp > 0)) return;
  game.bossShotTimer += dt;
  while (game.bossShotTimer >= 2.1) {
    game.bossShotTimer -= 2.1;
    for (const boss of game.bosses) {
      if (boss.segments[0].hp <= 0 || boss.atBase) continue;
      const head = boss.segments[0];
      for (const spread of [-38, 38]) {
        game.enemyBullets.push({
          x: head.x + spread * 0.35, y: head.y + 27,
          vx: (game.player.x - head.x) * 0.28 + spread,
          vy: 220, radius: 7,
        });
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
  const pool = fresh.length >= 3 ? fresh : available;
  const choices = [];
  const weight = { common: 5, rare: 3, epic: 1 };
  while (choices.length < 3 && pool.length) {
    let roll = random(game) * pool.reduce((sum, item) => sum + weight[item.rarity], 0);
    let index = 0;
    while (index < pool.length - 1 && roll >= weight[pool[index].rarity]) {
      roll -= weight[pool[index].rarity];
      index++;
    }
    choices.push(pool.splice(index, 1)[0].id);
  }
  return choices;
}

function presentUpgrades(game, source = 'wave') {
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

function presentRoutes(game) {
  game.phase = 'route';
  game.routeChoices = ['stable', 'volatile'];
  game.chest = null;
}

export function advance(game, dt, targetX = game.player.x) {
  if (game.phase !== 'playing') return;
  game.player.x = Math.max(24, Math.min(WIDTH - 24, targetX));
  game.waveTime += dt;
  const wave = WAVES[game.wave - 1];
  while (game.spawnCount < wave.chainCount && game.waveTime >= game.spawnCount * wave.spawnGap) {
    spawnChain(game, wave);
    game.spawnCount++;
  }
  updateChest(game, wave, dt);
  updateChains(game, dt);
  if (game.phase !== 'playing') return;
  fireCapsules(game, dt);
  fireSpecials(game, dt);
  updateBullets(game, dt);
  if (game.phase !== 'playing') return;
  updateEffects(game, dt);
  if (game.phase !== 'playing') return;
  updateBossShots(game, dt);
  updateEnemyBullets(game, dt);
  if (game.phase === 'playing' && !wave.boss
    && game.spawnCount >= wave.chainCount && game.chains.length === 0) presentRoutes(game);
}

export function chooseRoute(game, id) {
  if (game.phase !== 'route' || !game.routeChoices.includes(id)) return false;
  game.routeId = id;
  if (id === 'volatile') game.bonusDNA += 12;
  game.wave++;
  game.waveTime = 0;
  game.spawnCount = 0;
  game.fireTimer = 0;
  game.orbitTimer = 0;
  game.arcTimer = 0;
  game.bossShotTimer = 0;
  game.boss = null;
  game.bosses = [];
  game.chest = null;
  game.chestSpawned = false;
  game.bullets = [];
  game.enemyBullets = [];
  game.effects = [];
  game.popups = [];
  game.routeChoices = [];
  game.phase = 'playing';
  return true;
}

export function chooseUpgrade(game, id) {
  if (game.phase !== 'upgrade' || !game.choices.includes(id)) return false;
  game.upgrades[id] = (game.upgrades[id] || 0) + 1;
  if (id === 'repair') game.core = Math.min(game.maxCore, game.core + 25);
  if (game.upgradeSource === 'chest') {
    game.upgradeSource = null;
    game.choices = [];
    game.bullets = [];
    game.phase = 'playing';
    return true;
  }
  game.wave++;
  game.waveTime = 0;
  game.spawnCount = 0;
  game.fireTimer = 0;
  game.orbitTimer = 0;
  game.arcTimer = 0;
  game.bossShotTimer = 0;
  game.boss = null;
  game.bosses = [];
  game.chest = null;
  game.chestSpawned = false;
  game.bullets = [];
  game.enemyBullets = [];
  game.effects = [];
  game.popups = [];
  game.choices = [];
  game.upgradeSource = null;
  game.phase = 'playing';
  return true;
}
