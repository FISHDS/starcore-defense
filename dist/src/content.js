// 同一局戰鬥會自動跨越六段感染區；這些段落不是會中斷的波次。
export const WAVES = [
  { name: '孢子潮汐', startsAt: 0, duration: 48, spawnGap: 10, segments: 60, hp: 170, speed: 90, tint: 'mint', path: 'sine' },
  { name: '鏡像夾擊', startsAt: 48, duration: 48, spawnGap: 9, segments: 66, hp: 450, speed: 97, tint: 'violet', path: 'mirror' },
  { name: '硬殼岔路', startsAt: 96, duration: 48, spawnGap: 8, segments: 70, hp: 1500, speed: 103, tint: 'amber', path: 'fork' },
  { name: '雙螺旋', startsAt: 144, duration: 52, spawnGap: 8, segments: 74, hp: 4200, speed: 109, tint: 'coral', path: 'weave' },
  { name: '終端渦流', startsAt: 196, duration: 54, spawnGap: 7, segments: 78, hp: 12000, speed: 116, tint: 'violet', path: 'spiral' },
  { name: '交錯雙母體', startsAt: 250, duration: 50, spawnGap: 0, segments: 86, hp: 35000, speed: 72, tint: 'coral', path: 'cross', boss: true },
];

export const CHAPTERS = [
  {
    id: 1, name: '星核邊境', difficulty: '入門',
    paths: ['sine', 'mirror', 'fork', 'weave', 'spiral', 'cross'],
    tints: ['mint', 'violet', 'amber', 'coral', 'violet', 'coral'],
    hpScale: 1, speedScale: 1, gapScale: 1,
  },
  {
    id: 2, name: '斷層裂縫', difficulty: '進階',
    paths: ['fork', 'weave', 'mirror', 'spiral', 'cross', 'cross'],
    tints: ['amber', 'coral', 'violet', 'mint', 'amber', 'violet'],
    hpScale: 1.22, speedScale: 1.06, gapScale: 0.92,
  },
  {
    id: 3, name: '旋潮深域', difficulty: '嚴峻',
    paths: ['spiral', 'cross', 'weave', 'fork', 'mirror', 'cross'],
    tints: ['violet', 'coral', 'mint', 'amber', 'coral', 'violet'],
    hpScale: 1.48, speedScale: 1.11, gapScale: 0.87,
  },
];

export const UPGRADES = [
  { id: 'power', name: '高能藥丸', description: '藥丸傷害 +35%', icon: '✦', tone: 'coral', rarity: 'common', category: 'bullet', max: 5 },
  { id: 'rapid', name: '高速裝填', description: '射速 +18%', icon: '⚡', tone: 'gold', rarity: 'common', category: 'bullet', max: 5 },
  { id: 'multi', name: '多重發射', description: '每輪多發射一枚藥丸', icon: '✳', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 4 },
  { id: 'pierce', name: '穿透針', description: '藥丸額外穿過一節身體', icon: '➤', tone: 'violet', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'blast', name: '震盪彈', description: '命中時波及附近身體', icon: '✺', tone: 'coral', rarity: 'rare', category: 'area', max: 3 },
  { id: 'orbit', name: '蓄能環', description: '定期掃蕩畫面下方的身體', icon: '◉', tone: 'gold', rarity: 'epic', category: 'area', max: 3 },
  { id: 'arc', name: '連鎖電弧', description: '定期連擊多節身體', icon: 'ϟ', tone: 'cyan', rarity: 'epic', category: 'area', max: 3 },
  { id: 'frost', name: '冰凍脈衝', description: '命中後讓整條敵群減速', icon: '❄', tone: 'cyan', rarity: 'rare', category: 'control', max: 3 },
  { id: 'repair', name: '細胞再生', description: '立刻修復 24 點防線', icon: '♥', tone: 'mint', rarity: 'common', category: 'survival', max: 4 },
  { id: 'shield', name: '防護膜', description: '敵人越線時減少傷害', icon: '⬡', tone: 'mint', rarity: 'common', category: 'survival', max: 4 },
  { id: 'focus', name: '補給獵手', description: '對寶箱節點傷害 +60%', icon: '◎', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'crit', name: '精準藥劑', description: '提高暴擊機率', icon: '✧', tone: 'gold', rarity: 'common', category: 'bullet', max: 4 },
  { id: 'fury', name: '背水一戰', description: '防線越危急，傷害越高', icon: '♨', tone: 'coral', rarity: 'rare', category: 'survival', max: 3 },
  { id: 'scatter', name: '廣角噴射', description: '藥丸分布更廣', icon: '❋', tone: 'cyan', rarity: 'common', category: 'bullet', max: 3 },
  { id: 'needle', name: '超音速針', description: '藥丸飛行更快且傷害增加', icon: '↑', tone: 'violet', rarity: 'common', category: 'bullet', max: 3 },
  { id: 'poison', name: '滲透毒素', description: '命中後持續侵蝕該節身體', icon: '☣', tone: 'mint', rarity: 'rare', category: 'control', max: 3 },
  { id: 'burn', name: '灼熱藥劑', description: '命中後持續灼燒該節身體', icon: '♨', tone: 'coral', rarity: 'rare', category: 'control', max: 3 },
  { id: 'saw', name: '迴旋手術刀', description: '定期橫掃最靠近防線的身體', icon: '⌁', tone: 'violet', rarity: 'epic', category: 'area', max: 3 },
  { id: 'magnet', name: '尋箱磁場', description: '部分藥丸會追蹤寶箱節點', icon: '⌖', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'mark', name: '破甲標記', description: '受擊節點後續承受更多傷害', icon: '◇', tone: 'coral', rarity: 'rare', category: 'control', max: 3 },
  { id: 'echo', name: '回聲射擊', description: '每輪有機會追加一次發射', icon: '≋', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'drone', name: '醫療無人機', description: '自動攻擊最接近防線的身體', icon: '✹', tone: 'mint', rarity: 'epic', category: 'area', max: 3 },
  { id: 'pulse', name: '脈衝場', description: '定期擊傷畫面下半部的敵人', icon: '◈', tone: 'violet', rarity: 'epic', category: 'area', max: 3 },
  { id: 'rail', name: '寬幅藥丸', description: '藥丸更寬且傷害增加', icon: '▰', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'rebound', name: '崩解反應', description: '擊破身體時波及前後鄰節', icon: '✷', tone: 'coral', rarity: 'epic', category: 'area', max: 3 },
  { id: 'anchor', name: '重力錨', description: '每擊破一節，頭部額外後退', icon: '⚓', tone: 'cyan', rarity: 'epic', category: 'control', max: 3 },
  { id: 'bounty', name: '細胞回收', description: '擊破身體增加分數與研究獎勵', icon: '◆', tone: 'mint', rarity: 'common', category: 'survival', max: 3 },
  { id: 'secondwind', name: '急救裝置', description: '防線低於一半時緩慢回復', icon: '✚', tone: 'mint', rarity: 'rare', category: 'survival', max: 3 },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade]));
