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

export function knifeShieldSlash(head, targetX, phase = 1) {
  const side = phase === 2 ? -1 : 1;
  const vy = 260;
  const flight = Math.max(0.65, (744 - head.y - 25) / vy);
  return {
    kind: 'knifeSlash', x: head.x, y: head.y + 25,
    vx: (targetX - head.x + side * 32) / flight,
    vy, radius: 17, damage: 12,
  };
}
