// 每區五關：逐步介紹路線與機制；頭目出場數由關卡決定。
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
  weakpoint: '開合弱點', haste: '加速節',
  goldRush: '黃金補給',
};

const LEVELS = [
  ['孢子初潮', 'tide', [], 'knife-shield'],
  ['窄膜通道', 'narrow', ['narrow'], 'screech-cat'],
  ['已讀風暴', 'weave', ['switchback', 'weakpoint'], 'group-admin'],
  ['甲殼試煉', 'mirror', ['armor'], 'weakpoint'],
  ['最後一班', 'spiral', ['switchback', 'weakpoint'], 'coffin-dance'],
  ['左岔菌路', 'fork', ['forkLeft'], 'loading-99'],
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
  ['導管折返', 'mirror', ['switchback', 'weakpoint'], 'weakpoint'],
  ['補給或追擊', 'fork', ['haste', 'guard'], 'speed'],
  ['甲殼暴走', 'weave', ['armor', 'haste'], 'speed'],
  ['雙脈破陣', 'spiral', ['magnet', 'haste'], 'speed'],
  ['深域大迴路', 'cross', ['switchback', 'weakpoint'], 'alternating'],
  ['磁速同調', 'spiral', ['magnet', 'haste'], 'speed'],
  ['誘餌與折返', 'fork', ['guard', 'forkRight', 'weakpoint'], 'alternating'],
  ['高階金箱', 'weave', ['armor', 'magnet', 'goldRush'], 'alternating'],
  ['母巢終局', 'cross', ['armor', 'haste', 'weakpoint', 'guard'], 'final'],
];

// 雙頭集中在每區決戰；其餘關卡由單一頭目帶較長身體與更完整的第二階段。
const BOSS_COUNTS = [
  1, 1, 1, 1, 1,
  1, 2, 1, 2, 2,
  1, 2, 1, 2, 2,
  1, 2, 1, 2, 2,
  1, 2, 1, 1, 2,
];

const POSITION_MODES = [
  'bottom', 'center', 'center', 'center', 'center',
  'center', 'bottom', 'center', 'center', 'bottom',
  'bottom', 'center', 'bottom', 'center', 'center',
  'center', 'bottom', 'center', 'bottom', 'center',
  'bottom', 'center', 'bottom', 'center', 'center',
];

const BOSS_PATHS = ['tide', 'narrow', 'weave', 'mirror', 'spiral',
  'fork', 'fork-right', 'sine', 'cross'];

// 依每發命中頭目、一般長鏈清除後火力、代表性局外研究與常見技能配法校準。
// 目標頭目時間由第 1 關約 45 秒，逐關增加到第 25 關約 74 秒。
const BOSS_HP_SCALES = [
  1.352, 1.394, 1.475, 1.255, 1.338,
  2.292, 1.560, 2.724, 1.826, 1.986,
  3.444, 2.366, 3.988, 2.645, 2.842,
  4.882, 3.242, 5.548, 3.672, 4.319,
  7.361, 4.850, 8.247, 8.736, 5.701,
];

export const CHAPTERS = LEVELS.map(([name, path, mechanics, bossMode], index) => {
  const id = index + 1;
  const zone = Math.floor(index / 5);
  const zoneInfo = ZONES[zone];
  const tint = zoneInfo.tint;
  const bossCount = BOSS_COUNTS[index];
  const difficulty = id === 4
    ? { hp: 1.76, speed: 1.1 }
    : id === 5
      ? { hp: 1.805, speed: 1.2 }
      : id === 3
        ? { hp: 1.38, speed: 1.09 }
        : id < 4
          ? { hp: 1 + index * 0.06,
            speed: (id === 1 ? 0.84 : 1) + index * 0.016 }
          : { hp: 1.805 + (id - 5) * 0.045,
            speed: 1.2 + (id - 5) * 0.008 };
  const details = id === 1 ? '刀盾外圈折返 · 半血弱點移位'
    : id === 2 ? '破音貓反向盤行 · 弱點窗口變化'
      : id === 5 ? '棺材舞交錯長鏈 · 可擊破承重節'
      : mechanics.length ? mechanics.map(rule => MECHANIC_NAMES[rule]).join(' · ')
        : '連綿長鏈 · 基礎瞄準';
  return {
    id, zone, name, region: zoneInfo.name,
    difficulty: id <= 5 ? '入門' : id <= 10 ? '進階' : id <= 20 ? '挑戰' : '深域',
    mechanics, bossMode, path, bossCount,
    positionMode: POSITION_MODES[index],
    bossSegments: bossCount === 1 ? 54 : 42,
    bossHpScale: BOSS_HP_SCALES[index],
    summary: `${positionModeName(POSITION_MODES[index])} · ${details} · ${bossCount === 1 ? '單頭長戰' : '雙頭交疊'}`,
    paths: [path, path, path, path, path,
      id === 6 ? 'coil' : BOSS_PATHS[index % BOSS_PATHS.length]],
    tints: [tint, tint, tint, tint, tint, zone === 4 ? 'coral' : tint],
    hpScale: difficulty.hp,
    speedScale: difficulty.speed,
    gapScale: 1,
  };
});

function positionModeName(mode) {
  return mode === 'center' ? '中央守點' : '底線迎擊';
}

export const ZONE_COUNT = ZONES.length;
export const FINAL_STAGE = CHAPTERS.length;

export function getStage(id) {
  return CHAPTERS.find(stage => stage.id === id) || null;
}
