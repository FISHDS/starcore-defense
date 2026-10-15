// 每區五關：先介紹新機制，再變形、組合，最後由雙頭目考核。
const ZONES = [
  { name: '培養皿邊陲', tint: 'mint' },
  { name: '黏液沼槽', tint: 'amber' },
  { name: '晶化裂隙', tint: 'violet' },
  { name: '熱毒導管', tint: 'coral' },
  { name: '深海母巢', tint: 'violet' },
];

const MECHANIC_NAMES = {
  narrow: '窄道', switchback: '折返', armor: '甲殼', forkLeft: '左岔',
  forkRight: '右岔', guard: '護箱', magnet: '磁力', focus: '補給窗口',
  weakpoint: '開合弱點', haste: '加速節', hazard: '預警射線',
  goldRush: '黃金補給',
};

const LEVELS = [
  ['孢子初潮', 'tide', [], 'cover'],
  ['窄膜通道', 'narrow', ['narrow'], 'cover'],
  ['回折潮汐', 'weave', ['switchback'], 'cover'],
  ['甲殼試煉', 'mirror', ['armor'], 'armor'],
  ['殼母交鋒', 'spiral', ['armor', 'switchback'], 'armor'],
  ['左岔菌路', 'fork', ['forkLeft'], 'cover'],
  ['右岔誘餌', 'fork-right', ['forkRight', 'guard'], 'cover'],
  ['交替狹道', 'weave', ['switchback', 'guard'], 'cover'],
  ['護箱菌牆', 'spiral', ['guard', 'armor'], 'guard'],
  ['雙岔包圍', 'cross', ['guard', 'switchback'], 'guard'],
  ['磁囊甦醒', 'sine', ['magnet'], 'cover'],
  ['斷磁窗口', 'fork', ['magnet', 'focus'], 'cover'],
  ['晶殼弱點', 'spiral', ['weakpoint'], 'weakpoint'],
  ['磁晶交錯', 'weave', ['magnet', 'weakpoint'], 'weakpoint'],
  ['輪轉晶后', 'cross', ['magnet', 'weakpoint', 'guard'], 'alternating'],
  ['熱脈加速', 'sine', ['haste'], 'speed'],
  ['導管警報', 'mirror', ['hazard'], 'hazard'],
  ['補給或追擊', 'fork', ['haste', 'guard'], 'speed'],
  ['甲殼暴走', 'weave', ['armor', 'haste'], 'speed'],
  ['雙脈破陣', 'spiral', ['hazard', 'haste'], 'hazard'],
  ['深域大迴路', 'cross', ['switchback', 'weakpoint'], 'alternating'],
  ['磁速同調', 'spiral', ['magnet', 'haste'], 'speed'],
  ['誘餌與射線', 'fork', ['guard', 'hazard'], 'hazard'],
  ['高階金箱', 'weave', ['armor', 'magnet', 'hazard', 'goldRush'], 'alternating'],
  ['母巢終局', 'cross', ['armor', 'haste', 'weakpoint', 'guard', 'hazard'], 'final'],
];

export const CHAPTERS = LEVELS.map(([name, path, mechanics, bossMode], index) => {
  const id = index + 1;
  const zone = Math.floor(index / 5);
  const zoneInfo = ZONES[zone];
  const tint = zoneInfo.tint;
  return {
    id, zone, name, region: zoneInfo.name,
    difficulty: id <= 5 ? '入門' : id <= 10 ? '進階' : id <= 20 ? '挑戰' : '深域',
    mechanics, bossMode, path,
    summary: id === 1 ? '中央護膜無法擊破 · 左右追擊'
      : mechanics.length ? mechanics.map(rule => MECHANIC_NAMES[rule]).join(' · ')
      : '連綿長鏈 · 基礎瞄準',
    paths: [path, path, path, path, path, 'cross'],
    tints: [tint, tint, tint, tint, tint, zone === 4 ? 'coral' : tint],
    hpScale: 1 + index * 0.055,
    speedScale: (id === 1 ? 0.84 : 1) + index * 0.014,
    gapScale: 1,
  };
});

export const ZONE_COUNT = ZONES.length;
export const FINAL_STAGE = CHAPTERS.length;

export function getStage(id) {
  return CHAPTERS.find(stage => stage.id === id) || null;
}
