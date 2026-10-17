// 模擬固定角色的瞄準策略：優先鎖定弱點、寶箱與最迫近的身體節。
export function fixedAimAngle(game) {
  const player = game.player;
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
    ? ['power', 'multi', 'rapid', 'volley', 'pierce', 'bounce', 'crit', 'echo',
      'arc', 'drone', 'blast', 'bankshot', 'needle', 'rail', 'combo', 'burn',
      'poison', 'detonation', 'superconductor', 'shatter']
    : ['power', 'multi', 'rapid', 'volley', 'pierce', 'bounce', 'crit', 'echo',
      'arc', 'drone', 'blast', 'bankshot', 'needle', 'rail', 'combo', 'burn',
      'poison', 'orbit', 'frost', 'mark', 'rebound', 'shatter', 'saw', 'pulse',
      'anchor'];
  return ranks.find(id => game.choices.includes(id)) || game.choices[0];
}
