export const WAVES = [
  { name: '孢子先鋒', duration: 28, chainCount: 2, spawnGap: 11, segments: 18, hp: 34, speed: 84, tint: 'mint' },
  { name: '紫潮擴散', duration: 32, chainCount: 2, spawnGap: 10, segments: 21, hp: 45, speed: 91, tint: 'violet' },
  { name: '硬殼行軍', duration: 35, chainCount: 3, spawnGap: 9, segments: 19, hp: 60, speed: 85, tint: 'amber' },
  { name: '雙螺旋', duration: 38, chainCount: 3, spawnGap: 8, segments: 23, hp: 65, speed: 97, tint: 'coral' },
  { name: '終端感染', duration: 40, chainCount: 3, spawnGap: 7, segments: 25, hp: 78, speed: 103, tint: 'violet' },
  { name: '裂隙母體', duration: 46, chainCount: 1, spawnGap: 0, segments: 30, hp: 84, speed: 65, tint: 'coral', boss: true },
];

export const UPGRADES = [
  { id: 'power', name: '高能彈', description: '子彈傷害 +30%', icon: '✦', tone: 'coral', max: 4 },
  { id: 'rapid', name: '快速裝填', description: '射擊頻率 +20%', icon: '⚡', tone: 'gold', max: 4 },
  { id: 'multi', name: '分裂射擊', description: '每次多發射 1 顆子彈', icon: '✳', tone: 'cyan', max: 3 },
  { id: 'pierce', name: '穿透彈', description: '子彈多穿過 1 節敵群', icon: '➤', tone: 'violet', max: 2 },
  { id: 'blast', name: '震盪彈', description: '命中時波及附近節點', icon: '✺', tone: 'coral', max: 2 },
  { id: 'orbit', name: '蓄能環', description: '定期發射掃蕩敵群的能量環', icon: '◉', tone: 'gold', max: 3 },
  { id: 'arc', name: '連鎖電弧', description: '定期攻擊數個相鄰節點', icon: 'ϟ', tone: 'cyan', max: 3 },
  { id: 'frost', name: '冰凍脈衝', description: '命中後暫時減緩整條敵群', icon: '❄', tone: 'cyan', max: 2 },
  { id: 'repair', name: '細胞再生', description: '立即恢復 25 點防線耐久', icon: '♥', tone: 'mint', max: 4 },
  { id: 'shield', name: '防護膜', description: '敵群越線時減少傷害', icon: '⬡', tone: 'mint', max: 3 },
  { id: 'focus', name: '弱點瞄準', description: '命中敵群頭部的傷害 +50%', icon: '◎', tone: 'gold', max: 3 },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade]));
