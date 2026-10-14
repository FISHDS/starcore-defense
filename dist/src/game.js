import { WAVES, UPGRADES, UPGRADE_BY_ID } from './content.js';

export { WAVES, UPGRADES, UPGRADE_BY_ID };
export const WIDTH = 390;
export const HEIGHT = 844;
const RAIL_Y = 744;

export function startRun(seed = Date.now()) {
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
    core: 100,
    score: 0,
    player: { x: WIDTH / 2, y: RAIL_Y },
    chains: [],
    bullets: [],
    enemyBullets: [],
    effects: [],
    popups: [],
    boss: null,
    invulnerable: 0,
    upgrades: {},
    choices: [],
  };
}

function random(game) {
  game.seed = (1664525 * game.seed + 1013904223) >>> 0;
  return game.seed / 4294967296;
}

function trackPosition(chain, index) {
  const distance = chain.travel - index * chain.spacing;
  return {
    x: WIDTH / 2 + 143 * Math.sin(distance / 78 + chain.phase),
    y: 82 + distance * 0.31 + chain.yOffset,
  };
}

function spawnChain(game, wave) {
  const isBoss = !!wave.boss;
  const count = wave.segments + (isBoss ? 0 : Math.floor(random(game) * 4));
  const chain = {
    id: game.nextId++,
    boss: isBoss,
    tint: wave.tint,
    phase: random(game) * Math.PI * 2,
    yOffset: (game.spawnCount % 2) * -28,
    travel: 360,
    spacing: isBoss ? 27 : 25,
    speed: wave.speed,
    slowFor: 0,
    segments: [],
  };
  for (let index = 0; index < count; index++) {
    const hp = isBoss && index === 0 ? 430 : Math.round(wave.hp * (index === 0 ? 1.6 : 1));
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
  if (isBoss) game.boss = chain;
}

function addPopup(game, x, y, value, weak = false) {
  game.popups.push({ x, y, value: Math.round(value), life: 0.64, weak });
  if (game.popups.length > 55) game.popups.shift();
}

function damageSegment(game, chain, segment, amount, weak = false) {
  if (segment.hp <= 0 || game.phase !== 'playing') return;
  const damage = Math.max(1, Math.round(amount * (weak ? 1.9 + (game.upgrades.focus || 0) * 0.5 : 1)));
  segment.hp -= damage;
  addPopup(game, segment.x, segment.y - 12, damage, weak);
  game.effects.push({ kind: 'hit', x: segment.x, y: segment.y, life: 0.24, maxLife: 0.24 });
  if (game.upgrades.frost) chain.slowFor = Math.max(chain.slowFor, 1.4 + game.upgrades.frost * 0.7);
  if (segment.hp <= 0) {
    game.score += chain.boss ? 20 : 10;
    game.effects.push({ kind: 'burst', x: segment.x, y: segment.y, life: 0.42, maxLife: 0.42 });
    if (chain.boss && segment.index === 0) {
      game.score += 400;
      game.phase = 'victory';
    }
  }
}

function updateChains(game, dt) {
  for (let chainIndex = game.chains.length - 1; chainIndex >= 0; chainIndex--) {
    const chain = game.chains[chainIndex];
    chain.travel += chain.speed * (chain.slowFor > 0 ? 0.55 : 1) * dt;
    chain.slowFor = Math.max(0, chain.slowFor - dt);
    for (const segment of chain.segments) {
      const position = trackPosition(chain, segment.index);
      segment.x = position.x;
      segment.y = position.y;
    }
    if (chain.segments[0].y >= RAIL_Y - 8) {
      const damage = Math.max(5, (chain.boss ? 34 : 17) - (game.upgrades.shield || 0) * 4);
      game.core = Math.max(0, game.core - damage);
      game.effects.push({ kind: 'breach', x: chain.segments[0].x, y: RAIL_Y, life: 0.55, maxLife: 0.55 });
      game.chains.splice(chainIndex, 1);
      if (game.core <= 0 || chain.boss) game.phase = 'defeat';
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
        damage: 20 * (1 + (game.upgrades.power || 0) * 0.3),
        pierce: game.upgrades.pierce || 0,
        hit: [],
      });
    }
  }
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
    let consumed = false;
    for (const { chain, segment } of crossed) {
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
  if (!game.boss || game.boss.segments[0].hp <= 0) return;
  game.bossShotTimer += dt;
  while (game.bossShotTimer >= 2.1) {
    game.bossShotTimer -= 2.1;
    const head = game.boss.segments[0];
    for (const spread of [-55, 0, 55]) {
      game.enemyBullets.push({
        x: head.x + spread * 0.35, y: head.y + 27,
        vx: (game.player.x - head.x) * 0.28 + spread,
        vy: 220, radius: 7,
      });
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

function presentUpgrades(game) {
  game.phase = 'upgrade';
  const pool = UPGRADES.filter(item => (game.upgrades[item.id] || 0) < item.max);
  game.choices = [];
  while (game.choices.length < 3 && pool.length) {
    game.choices.push(pool.splice(Math.floor(random(game) * pool.length), 1)[0].id);
  }
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
    && game.spawnCount >= wave.chainCount && game.chains.length === 0) presentUpgrades(game);
}

export function chooseUpgrade(game, id) {
  if (game.phase !== 'upgrade' || !game.choices.includes(id)) return false;
  game.upgrades[id] = (game.upgrades[id] || 0) + 1;
  if (id === 'repair') game.core = Math.min(100, game.core + 25);
  game.wave++;
  game.waveTime = 0;
  game.spawnCount = 0;
  game.fireTimer = 0;
  game.orbitTimer = 0;
  game.arcTimer = 0;
  game.bossShotTimer = 0;
  game.boss = null;
  game.bullets = [];
  game.enemyBullets = [];
  game.effects = [];
  game.popups = [];
  game.choices = [];
  game.phase = 'playing';
  return true;
}
