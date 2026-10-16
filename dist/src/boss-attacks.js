// 頭目招式只產生可被玩家瞄準擊落的彈體規格；所有預警由戰鬥倒數先畫出。
const PATTERNS = {
  'shield-slash': { kind: 'slash', angles: [0], speed: 360, radius: 12, damage: 18 },
  'sonic-fan': { kind: 'sonicWave', angles: [-.18, 0, .18], speed: 245, radius: 15, damage: 24 },
  'notification-fan': { kind: 'notification', angles: [-.24, -.12, 0, .12, .24], speed: 215, radius: 8, damage: 20 },
  'coffin-beat': { kind: 'coffin-card', angles: [0], speed: 215, radius: 10, damage: 17, alternate: .48 },
  'spore-bloom': { kind: 'sporeBloom', angles: [-.3, 0, .3], speed: 175, radius: 8, damage: 12 },
  'cross-cut': { kind: 'crossCut', angles: [-.52, 0, .52], speed: 235, radius: 11, damage: 18 },
  'solar-burst': { kind: 'solarBurst', angles: [-.65, -.39, -.13, 0, .13, .39, .65], speed: 210, radius: 9, damage: 14 },
  'loading-scan': { kind: 'loadingScan', angles: [-.13, 0, .13], speed: 205, radius: 9, damage: 11 },
  'reef-volley': { kind: 'reefShard', angles: [-.42, -.14, .14, .42], speed: 225, radius: 7, damage: 13 },
  'prism-return': { kind: 'prismShard', angles: [-.26, .26], speed: 220, radius: 8, damage: 14, ricochets: 1 },
  'abyss-pulse': { kind: 'abyssPulse', angles: [-.9, -.6, -.3, 0, .3, .6, .9], speed: 165, radius: 12, damage: 13 },
  'iron-charge': { kind: 'ironCharge', angles: [-.14, .14], speed: 335, radius: 14, damage: 21 },
  'solar-ring': { kind: 'solarRing', angles: [-.75, -.5, -.25, 0, .25, .5, .75], speed: 195, radius: 9, damage: 15 },
  'night-seeds': { kind: 'nightSeed', angles: [-.7, -.35, 0, .35, .7], speed: 180, radius: 9, damage: 12 },
  'alarm-rush': { kind: 'alarmBell', angles: [0], speed: 205, phaseTwoSpeed: 325, radius: 10, damage: 17 },
  'timecard-stamp': { kind: 'timecardStamp', angles: [0], speed: 185, radius: 15, damage: 19, alternate: .33 },
  'groundhog-quake': { kind: 'groundQuake', angles: [0, .55], speed: 205, radius: 12, damage: 16 },
  'clockwork-ring': { kind: 'clockworkRing', angles: [-.84, -.56, -.28, 0, .28, .56, .84], speed: 190, radius: 10, damage: 14 },
  'magnetic-sweep': { kind: 'magSweep', angles: [-.82, 0, .82], speed: 230, radius: 13, damage: 16 },
  'mirror-return': { kind: 'mirrorReturn', angles: [-.4, 0, .4], speed: 225, radius: 9, damage: 15, ricochets: 2 },
};

export const BOSS_ATTACK_STYLES = Object.keys(PATTERNS);

export function bossVolleyFor(style, origin, aimAngle, phase = 1, attackCount = 0) {
  const pattern = PATTERNS[style];
  if (!pattern) throw new Error(`未知的頭目招式：${style || '?'}`);
  return pattern.angles.map((offset, index) => {
    const variation = pattern.alternate && attackCount % 2
      ? pattern.alternate * (attackCount % 4 === 1 ? 1 : -1) : 0;
    const angle = aimAngle + offset + variation;
    const speed = phase > 1 ? (pattern.phaseTwoSpeed || pattern.speed * 1.12)
      : pattern.speed;
    return {
      kind: pattern.kind, x: origin.x, y: origin.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: pattern.radius, damage: pattern.damage + (phase > 1 ? 3 : 0),
      ...(pattern.ricochets ? { ricochets: pattern.ricochets } : {}),
    };
  });
}
