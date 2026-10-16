// 「我的刀盾」獨立戰鬥規則；原有長鏈回拉與寶箱判定保持共用。
export function knifeShieldGuarded(chain, segment) {
  if (chain?.rig?.profileId !== 'meme-knife-shield'
    || !chain.rig.telegraphFor || segment?.index === 0 || segment?.chest) return false;
  const shieldParity = chain.rig.phase === 2 ? 1 : 0;
  return segment.depth % 2 === shieldParity;
}

export function knifeShieldDamageMultiplier(chain, segment) {
  if (chain?.rig?.profileId !== 'meme-knife-shield') return 1;
  if (knifeShieldGuarded(chain, segment)) return 0.2;
  return chain.rig.strikeFor > 0 ? 1.3 : 1;
}

export function knifeShieldSlash(head, target, phase = 1) {
  const side = phase === 2 ? -1 : 1;
  const targetPoint = typeof target === 'number' ? { x: target, y: 744 } : target;
  const dx = targetPoint.x - head.x + side * 32;
  const dy = targetPoint.y - head.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = 300;
  return {
    kind: 'knifeSlash', x: head.x, y: head.y + 25,
    vx: dx / length * speed, vy: dy / length * speed,
    radius: 17, damage: 12,
  };
}
