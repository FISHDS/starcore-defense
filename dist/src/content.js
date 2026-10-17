// 一條普通長鏈會依擊破進度跨越五段感染區，清空後進入該關頭目。
export const WAVES = [
  { name: '孢子潮汐', startsAt: 0, duration: 48, spawnGap: 0, segments: 220, hp: 50, speed: 32, tint: 'mint', path: 'sine' },
  { name: '鏡像夾擊', startsAt: 48, duration: 48, spawnGap: 1.5, segments: 66, hp: 990, speed: 60, tint: 'violet', path: 'mirror' },
  { name: '硬殼岔路', startsAt: 96, duration: 48, spawnGap: 1.5, segments: 70, hp: 3300, speed: 36, tint: 'amber', path: 'fork' },
  { name: '雙螺旋', startsAt: 144, duration: 52, spawnGap: 1.5, segments: 74, hp: 9240, speed: 44, tint: 'coral', path: 'weave' },
  { name: '終端渦流', startsAt: 196, duration: 54, spawnGap: 1.5, segments: 78, hp: 26400, speed: 68, tint: 'violet', path: 'spiral' },
  { name: '交錯雙母體', startsAt: 250, duration: 50, spawnGap: 0, segments: 42, hp: 14000, speed: 27, tint: 'coral', path: 'cross', boss: true },
];

export { CHAPTERS } from './campaign.js?v=20261018-starcore-17';

export const UPGRADES = [
  { id: 'power', name: '高能藥丸', description: '藥丸傷害 +35%', icon: '✦', tone: 'coral', rarity: 'common', category: 'bullet', max: 5 },
  { id: 'rapid', name: '高速裝填', description: '射速 +18%', icon: '⚡', tone: 'gold', rarity: 'common', category: 'bullet', max: 5 },
  { id: 'multi', name: '多重發射', description: '每輪多射一枚，單枚威力略降，能同時掃過多個目標', icon: '✳', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 4 },
  { id: 'pierce', name: '穿透針', description: '穿過已命中的身節組，後續命中傷害稍弱', icon: '➤', tone: 'violet', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'blast', name: '震盪彈', description: '命中時波及附近身體', icon: '✺', tone: 'coral', rarity: 'rare', category: 'area', max: 3 },
  { id: 'orbit', name: '蓄能環', description: '定期在準星方向展開脈衝扇區', icon: '◉', tone: 'gold', rarity: 'epic', category: 'area', max: 3 },
  { id: 'arc', name: '連鎖電弧', description: '沿準星方向連鎖攻擊附近節點', icon: 'ϟ', tone: 'cyan', rarity: 'epic', category: 'area', max: 3 },
  { id: 'frost', name: '冰凍脈衝', description: '命中後短暫減慢整條敵群', icon: '❄', tone: 'cyan', rarity: 'rare', category: 'control', max: 3 },
  { id: 'crit', name: '精準藥劑', description: '提高暴擊機率', icon: '✧', tone: 'gold', rarity: 'common', category: 'bullet', max: 4 },
  { id: 'needle', name: '超音速針', description: '藥丸飛行更快且傷害增加', icon: '↑', tone: 'violet', rarity: 'common', category: 'bullet', max: 3 },
  { id: 'poison', name: '滲透毒素', description: '命中後持續侵蝕該組共享血量', icon: '☣', tone: 'mint', rarity: 'rare', category: 'control', max: 3 },
  { id: 'burn', name: '灼熱藥劑', description: '命中後持續灼燒該節身體', icon: '♨', tone: 'coral', rarity: 'rare', category: 'control', max: 3 },
  { id: 'saw', name: '迴旋手術刀', description: '定期橫掃準星前方的多組敵人', icon: '⌁', tone: 'violet', rarity: 'epic', category: 'area', max: 3 },
  { id: 'mark', name: '破甲標記', description: '受擊節點後續承受更多傷害', icon: '◇', tone: 'coral', rarity: 'rare', category: 'control', max: 3 },
  { id: 'echo', name: '回聲射擊', description: '每輪有機會追加一次發射', icon: '≋', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'drone', name: '電弧無人機', description: '自動鎖定準星前方的身體節', icon: '✹', tone: 'mint', rarity: 'epic', category: 'area', max: 3 },
  { id: 'pulse', name: '脈衝場', description: '定期震擊準星前方的多組敵人', icon: '◈', tone: 'violet', rarity: 'epic', category: 'area', max: 3 },
  { id: 'rail', name: '寬幅藥丸', description: '藥丸更寬且傷害增加', icon: '▰', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'rebound', name: '崩解反應', description: '擊破一組後，把衝擊傳給附近另一組', icon: '✷', tone: 'coral', rarity: 'epic', category: 'area', max: 3 },
  { id: 'anchor', name: '重力錨', description: '擊破一組後短暫停住敵群，再恢復行軍', icon: '⚓', tone: 'cyan', rarity: 'epic', category: 'control', max: 3 },
  { id: 'bankshot', name: '折射藥丸', description: '命中後以較弱電弧追加打擊附近另一組', icon: '⤴', tone: 'cyan', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'combo', name: '連擊激勵', description: '短時間連續擊破會提高火力', icon: '✴', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'bounce', name: '彈跳針', description: '折向附近另一組連續彈射，後續命中傷害遞減', icon: '↗', tone: 'violet', rarity: 'epic', category: 'bullet', max: 3 },
  { id: 'shatter', name: '碎裂擴散', description: '擊破一組後，碎片波及前後鄰組', icon: '✹', tone: 'coral', rarity: 'rare', category: 'area', max: 3 },
  { id: 'volley', name: '蓄壓齊射', description: '每四輪射擊蓄成一枚大型高傷藥丸', icon: '▰', tone: 'gold', rarity: 'rare', category: 'bullet', max: 3 },
  { id: 'detonation', name: '爆燃反應', description: '毒素與灼熱達 2 級後合成；雙重感染時引爆鄰節', icon: '✹', tone: 'coral', rarity: 'evolution', category: 'evolution', max: 1, requires: ['poison', 'burn'] },
  { id: 'superconductor', name: '超導連鎖', description: '電弧與冰凍達 2 級後合成；電弧延伸並強化凍結', icon: 'ϟ', tone: 'cyan', rarity: 'evolution', category: 'evolution', max: 1, requires: ['arc', 'frost'] },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade]));
