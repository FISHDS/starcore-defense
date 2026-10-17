export const WEAPONS = [
  { id: 'capsule', name: '脈衝藥丸', description: '均衡的連續射擊', cost: 0 },
  { id: 'scatter', name: '雙生藥丸', description: '每次發射兩枚，適合掃過長鏈', cost: 180 },
  { id: 'rail', name: '穿骨針', description: '單發傷害提升，適合破甲與頭目', cost: 240 },
  { id: 'prism', name: '稜鏡彈', description: '每第三發可穿過一個節點', cost: 320 },
];

export const ORGANS = [
  { id: 'focus-lens', name: '弱點透鏡', description: '擊中頭目弱點時傷害提高 20%', cost: 140 },
  { id: 'salvage', name: '拾荒囊', description: '寶箱更容易打開，研究點收入提升', cost: 200 },
  { id: 'tempo', name: '速搏心', description: '開局射擊間隔縮短', cost: 260 },
  { id: 'anchor-organ', name: '定錨腺', description: '重力錨額外拖住敵群一小段時間', cost: 300 },
];

export const META_ITEMS = [...WEAPONS, ...ORGANS];
export const META_BY_ID = Object.fromEntries(META_ITEMS.map(item => [item.id, item]));
export const MILESTONE_REWARDS = {
  5: { kind: 'weapon', id: 'scatter' },
  10: { kind: 'organ', id: 'focus-lens' },
  15: { kind: 'weapon', id: 'rail' },
  20: { kind: 'organ', id: 'tempo' },
  25: { kind: 'weapon', id: 'prism' },
};
