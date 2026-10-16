// 一條普通長鏈會依擊破進度跨越五段感染區，清空後進入該關頭目。
export const WAVES = [
  { name: '孢子潮汐', startsAt: 0, duration: 48, spawnGap: 0, segments: 220, hp: 50, speed: 32, tint: 'mint', path: 'sine' },
  { name: '鏡像夾擊', startsAt: 48, duration: 48, spawnGap: 1.5, segments: 66, hp: 990, speed: 60, tint: 'violet', path: 'mirror' },
  { name: '硬殼岔路', startsAt: 96, duration: 48, spawnGap: 1.5, segments: 70, hp: 3300, speed: 36, tint: 'amber', path: 'fork' },
  { name: '雙螺旋', startsAt: 144, duration: 52, spawnGap: 1.5, segments: 74, hp: 9240, speed: 44, tint: 'coral', path: 'weave' },
  { name: '終端渦流', startsAt: 196, duration: 54, spawnGap: 1.5, segments: 78, hp: 26400, speed: 68, tint: 'violet', path: 'spiral' },
  { name: '交錯雙母體', startsAt: 250, duration: 50, spawnGap: 0, segments: 42, hp: 14000, speed: 27, tint: 'coral', path: 'cross', boss: true },
];

export { CHAPTERS } from './campaign.js?v=20261016-stage-variety-1';

export const UPGRADES = [
  { id: 'power', name: '高能藥丸', description: '藥丸傷害 +35%', icon: '✦', tone: 'coral', rarity: 'common', category: 'bullet', max: 5 },
  { id: 'rapid', name: '高速裝填', description: '射速 +18%', icon: '⚡', tone: 'gold', rarity: 'common', category: 'bullet', max: 5 },
  { id: 'multi', name: '多重發射', description: '每輪多發射一枚藥丸', icon: '✳', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 4 },
  { id: 'pierce', name: '穿透針', description: '藥丸額外穿過一節身體', icon: '➤', tone: 'violet', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'blast', name: '震盪彈', description: '命中時波及附近身體', icon: '✺', tone: 'coral', rarity: 'rare', category: 'area', max: 3 },
  { id: 'orbit', name: '蓄能環', description: '定期掃蕩畫面下方的身體', icon: '◉', tone: 'gold', rarity: 'epic', category: 'area', max: 3 },
  { id: 'arc', name: '連鎖電弧', description: '定期連擊多節身體', icon: 'ϟ', tone: 'cyan', rarity: 'epic', category: 'area', max: 3 },
  { id: 'frost', name: '冰凍脈衝', description: '命中後讓整條敵群減速', icon: '❄', tone: 'cyan', rarity: 'rare', category: 'control', max: 3 },
  { id: 'repair', name: '細胞再生', description: '立刻恢復 24 點護盾', icon: '♥', tone: 'mint', rarity: 'common', category: 'survival', max: 4 },
  { id: 'shield', name: '防護膜', description: '頭目飛彈造成的傷害減少', icon: '⬡', tone: 'mint', rarity: 'common', category: 'survival', max: 4 },
  { id: 'focus', name: '補給獵手', description: '對寶箱節點傷害 +60%', icon: '◎', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'crit', name: '精準藥劑', description: '提高暴擊機率', icon: '✧', tone: 'gold', rarity: 'common', category: 'bullet', max: 4 },
  { id: 'fury', name: '背水一戰', description: '護盾越低，傷害越高', icon: '♨', tone: 'coral', rarity: 'rare', category: 'survival', max: 3 },
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
  { id: 'anchor', name: '重力錨', description: '每擊破一節，敵群暫停前進更久', icon: '⚓', tone: 'cyan', rarity: 'epic', category: 'control', max: 3 },
  { id: 'bounty', name: '細胞回收', description: '擊破身體增加分數與研究獎勵', icon: '◆', tone: 'mint', rarity: 'common', category: 'survival', max: 3 },
  { id: 'secondwind', name: '急救裝置', description: '護盾低於一半時緩慢回復', icon: '✚', tone: 'mint', rarity: 'rare', category: 'survival', max: 3 },
  { id: 'bankshot', name: '折射藥丸', description: '命中後彈向附近另一節身體', icon: '⤴', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'harvest', name: '能量採集', description: '擊破後更容易掉能量與護盾，需移動拾取', icon: '⬡', tone: 'mint', rarity: 'rare', category: 'survival', max: 3 },
  { id: 'combo', name: '連擊激勵', description: '短時間連續擊破會提高火力', icon: '✴', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'detonation', name: '爆燃反應', description: '毒素與灼熱達 2 級後合成；雙重感染時引爆鄰節', icon: '✹', tone: 'coral', rarity: 'evolution', category: 'evolution', max: 1, requires: ['poison', 'burn'] },
  { id: 'superconductor', name: '超導連鎖', description: '電弧與冰凍達 2 級後合成；電弧延伸並強化凍結', icon: 'ϟ', tone: 'cyan', rarity: 'evolution', category: 'evolution', max: 1, requires: ['arc', 'frost'] },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade]));
