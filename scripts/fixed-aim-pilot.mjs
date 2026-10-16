// 模擬固定角色的瞄準策略：先處理迫近彈，再鎖定寶箱或最危險的身體節。
export function fixedAimAngle(game) {
  const player = game.player;
  const projectile = game.enemyBullets
    .filter(shot => Math.hypot(shot.x - player.x, shot.y - player.y) < 300)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y)
      - Math.hypot(b.x - player.x, b.y - player.y))[0];
  if (projectile) return Math.atan2(projectile.y - player.y,
    projectile.x - player.x);

  const visible = game.chains.filter(chain => !chain.dead)
    .flatMap(chain => chain.segments.filter(piece => piece.index > 0
      && piece.hp > 0 && piece.x >= 0 && piece.x <= 390
      && piece.y >= 0 && piece.y <= 844)
      .map(piece => ({ chain, piece,
        distance: Math.hypot(piece.x - player.x, piece.y - player.y) })));
  const chest = visible.filter(item => item.piece.chest)
    .sort((a, b) => a.distance - b.distance)[0];
  const openWeakpoint = visible.filter(item => item.piece.weakpoint
    && item.piece.weakOpen)
    .sort((a, b) => a.distance - b.distance)[0];
  let target = openWeakpoint || chest;
  if (!target) {
    target = visible.sort((a, b) => {
      const dangerA = a.chain.segments[0]?.routeDistance || 0;
      const dangerB = b.chain.segments[0]?.routeDistance || 0;
      return dangerB - dangerA || a.distance - b.distance;
    })[0];
  }
  if (!target) return player.aimAngle;
  return Math.atan2(target.piece.y - player.y, target.piece.x - player.x);
}

export function choosePilotUpgrade(game, build = 'base') {
  const ranks = build === 'new'
    ? ['detonation', 'superconductor', 'bounce', 'shatter', 'volley', 'power',
      'rapid', 'pierce', 'poison', 'burn', 'arc', 'multi', 'bankshot', 'combo']
    : ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce',
      'bounce', 'volley', 'bankshot', 'poison', 'burn', 'combo'];
  return ranks.find(id => game.choices.includes(id)) || game.choices[0];
}
