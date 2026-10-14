export const WAVES = [
  { name: '孢子先鋒', duration: 28, chainCount: 2, spawnGap: 11, segments: 18, hp: 34, speed: 84, tint: 'mint', path: 'sine', chestAt: 6 },
  { name: '鏡像夾擊', duration: 32, chainCount: 2, spawnGap: 10, segments: 21, hp: 45, speed: 91, tint: 'violet', path: 'mirror', chestAt: 8 },
  { name: '硬殼岔路', duration: 35, chainCount: 3, spawnGap: 9, segments: 19, hp: 60, speed: 85, tint: 'amber', path: 'fork', chestAt: 7 },
  { name: '雙螺旋', duration: 38, chainCount: 3, spawnGap: 8, segments: 23, hp: 65, speed: 97, tint: 'coral', path: 'weave', chestAt: 7 },
  { name: '終端渦流', duration: 40, chainCount: 3, spawnGap: 7, segments: 25, hp: 78, speed: 103, tint: 'violet', path: 'spiral', chestAt: 8 },
  { name: '交錯雙母體', duration: 46, chainCount: 2, spawnGap: 0, segments: 27, hp: 82, speed: 68, tint: 'coral', path: 'cross', chestAt: 9, boss: true },
];

export const UPGRADES = [
  { id: 'power', name: '高能彈', description: '子彈傷害 +30%', icon: '✦', tone: 'coral', rarity: 'common', max: 4 },
  { id: 'rapid', name: '快速裝填', description: '射擊頻率 +20%', icon: '⚡', tone: 'gold', rarity: 'common', max: 4 },
  { id: 'multi', name: '分裂射擊', description: '每次多發射 1 顆子彈', icon: '✳', tone: 'cyan', rarity: 'rare', max: 3 },
  { id: 'pierce', name: '穿透彈', description: '子彈多穿過 1 節敵群', icon: '➤', tone: 'violet', rarity: 'rare', max: 2 },
  { id: 'blast', name: '震盪彈', description: '命中時波及附近節點', icon: '✺', tone: 'coral', rarity: 'rare', max: 2 },
  { id: 'orbit', name: '蓄能環', description: '定期發射掃蕩敵群的能量環', icon: '◉', tone: 'gold', rarity: 'epic', max: 3 },
  { id: 'arc', name: '連鎖電弧', description: '定期攻擊數個相鄰節點', icon: 'ϟ', tone: 'cyan', rarity: 'epic', max: 3 },
  { id: 'frost', name: '冰凍脈衝', description: '命中後暫時減緩整條敵群', icon: '❄', tone: 'cyan', rarity: 'rare', max: 2 },
  { id: 'repair', name: '細胞再生', description: '立即恢復 25 點防線耐久', icon: '♥', tone: 'mint', rarity: 'common', max: 4 },
  { id: 'shield', name: '防護膜', description: '敵群越線時減少傷害', icon: '⬡', tone: 'mint', rarity: 'common', max: 3 },
  { id: 'focus', name: '弱點瞄準', description: '命中敵群頭部的傷害 +50%', icon: '◎', tone: 'gold', rarity: 'rare', max: 3 },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade]));
