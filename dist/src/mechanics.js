// 關卡特殊節點都沿原有長鏈行進；破壞後不會額外生出頭部。
export function healthPoolKey(chain, segment) {
  return `${chain.id}:${segment.healthGroupId || segment.id}`;
}

export function uniqueHealthTargets(items) {
  const seen = new Set();
  return items.filter(({ chain, segment }) => {
    if (!segment || segment.hp <= 0) return false;
    const key = healthPoolKey(chain, segment);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectNextHealthPoolTarget(items, origin, excludedPools, range) {
  const excluded = excludedPools instanceof Set ? excludedPools : new Set(excludedPools);
  return items.filter(({ chain, segment }) => !segment.chest && segment.hp > 0
    && !excluded.has(healthPoolKey(chain, segment))
    && Math.hypot(segment.x - origin.x, segment.y - origin.y) < range)
    .sort((a, b) => Math.hypot(a.segment.x - origin.x, a.segment.y - origin.y)
      - Math.hypot(b.segment.x - origin.x, b.segment.y - origin.y))
    .find(item => !excluded.has(healthPoolKey(item.chain, item.segment))) || null;
}

export function poisonDamageRatio(rank) {
  return 0.22 + (Math.max(1, Math.min(3, rank)) - 1) * 0.1;
}

export function pulseDamageRatio(rank) {
  return 0.4 + (Math.max(1, Math.min(3, rank)) - 1) * 0.15;
}

export function assignTraits(piece, stage, boss, chestIndices) {
  if (piece.index === 0 || piece.chest) return;
  const rules = stage.mechanics || [];
  const mode = boss ? stage.bossMode : '';
  const has = id => rules.includes(id);
  if (!boss && has('armor') && piece.depth % 13 === 6) {
    piece.armorHp = Math.round(piece.maxHp * 0.45);
  }
  if (has('guard') && chestIndices.some(index => piece.depth === index + 2)) {
    piece.guard = true;
  }
  if (has('magnet') && piece.depth % 30 === 14) piece.magnet = true;
  if ((has('weakpoint') && piece.depth % 22 === 11)
    || (boss && ['weakpoint', 'alternating', 'final'].includes(mode)
      && piece.depth % 8 === 4)) {
    piece.weakpoint = true;
    piece.weakOpen = false;
  }
  if ((has('haste') && piece.depth % 26 === 12)
    || (boss && ['speed', 'final'].includes(mode) && piece.depth % 9 === 2)) {
    piece.haste = true;
  }
}

export function chestGuarded(chain, chest) {
  return chest.chest && chain.segments.some(piece => piece.guard && piece.hp > 0
    && Math.abs(piece.depth - chest.depth) <= 2);
}

export function chainSpeed(chain) {
  const hasteCount = chain.segments.filter(piece => piece.haste && piece.hp > 0).length;
  return chain.speed * (1 + Math.min(0.45, hasteCount * 0.025));
}

export function steerBullet(game, bullet, dt) {
  const magnets = game.chains.flatMap(chain => chain.segments)
    .filter(piece => piece.magnet && piece.hp > 0
      && Math.abs(piece.y - bullet.y) < 90 && Math.abs(piece.x - bullet.x) < 85);
  if (!magnets.length) return;
  const magnet = magnets.sort((a, b) =>
    Math.abs(a.y - bullet.y) - Math.abs(b.y - bullet.y))[0];
  const shift = Math.max(-140 * dt, Math.min(140 * dt,
    (magnet.x - bullet.x) * dt * 3));
  bullet.x += shift;
}

export function updateWeakpoints(game) {
  for (const chain of game.chains) {
    for (const piece of chain.segments) {
      if (piece.weakpoint) piece.weakOpen = (game.runTime + piece.depth * 0.09
        + (chain.boss && chain.lane % 2 ? 1.2 : 0)) % 2.4 < 0.8;
    }
  }
}
