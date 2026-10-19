import { BOSS_PROFILES_A } from './boss-profiles-a.js?v=20261019-starcore-19';
import { BOSS_PROFILES_B } from './boss-profiles-b.js?v=20261019-starcore-19';
import { BOSS_PROFILES_C } from './boss-profiles-c.js?v=20261019-starcore-19';

export const BOSS_PROFILES = [...BOSS_PROFILES_A, ...BOSS_PROFILES_B, ...BOSS_PROFILES_C];

const FIRST_TWENTY_ROSTER = [
  'meme-knife-shield', 'meme-screech-cat', 'meme-seen-zone-admin',
  'zone-1-dreamweaver', 'meme-last-shift-coffin-leader',
  'meme-loading-99', 'meme-again-five-minutes-doge',
  'meme-clock-in-executioner', 'meme-shocked-groundhog',
  'zone-2-verdant-reaper', 'zone-2-sun-coral', 'zone-3-reef-warden',
  'zone-3-glass-mantis', 'zone-4-abyss-bell', 'zone-4-iron-maw',
  'zone-5-solar-heart', 'zone-5-night-bloom', 'zone-5-clockwork-jelly',
  'zone-5-mag-rail-cleaner', 'zone-5-mirror-feather-owl',
].map(id => BOSS_PROFILES.find(item => item.id === id));
const ROUTE_STYLES = [
  '外圈順時針橢圓，繞場後沿弧線收向守點', '扁長橢圓左右往返，最後從外側繞入',
  '反向雙圈交疊，上下穿越後收進中央', '圓角方框繞行，四邊都會經過再轉向守點',
  '外圈波浪左右盤旋，再以長彎道進場', '寬幅螺旋先繞外沿，再逐圈向內收',
  '雙頭分走不同方向，交叉掩護後再靠近', '上下長橢圓往返，尾段斜切進守點',
  '八字折返穿過左右兩側，最後繞回中央', '大圈加小圈交錯，避免固定方向直衝',
  '低幅波浪沿外緣盤行，再繞底部收束', '反向橢圓與交叉線連接，逐步進入中央',
  '方形外圈搭配斜向穿越，尾段轉入核心', '連續偏心圓弧，先巡過上半場再收近',
  '雙頭反向繞圈，交會後輪流領先', '寬幅八字延伸至上下邊緣，再折向守點',
  '左右兩翼交錯盤旋，尾段沿外側回彎', '外圈橢圓加快速方向反轉，再繞入中央',
  '長波浪橫掃全場，最後以弧線壓向防線', '多圈交錯後緩慢縮小半徑，抵達中央守點',
];
if (FIRST_TWENTY_ROSTER.some(profile => !profile)) {
  throw new Error('前20關頭目名冊有缺少的外型資料');
}

export function bossProfileFor(chapter, lane = 0) {
  const chapterIndex = bossRosterIndexFor(chapter);
  const lead = FIRST_TWENTY_ROSTER[chapterIndex];
  if (Math.abs(lane) === 0) return { ...lead, routeStyle: ROUTE_STYLES[chapterIndex] };
  for (let offset = 1; offset < FIRST_TWENTY_ROSTER.length; offset++) {
    const candidate = FIRST_TWENTY_ROSTER[(chapterIndex + offset) % FIRST_TWENTY_ROSTER.length];
    if (candidate.silhouette !== lead.silhouette)
      return { ...candidate, routeStyle: ROUTE_STYLES[chapterIndex] };
  }
  return { ...FIRST_TWENTY_ROSTER[(chapterIndex + Math.abs(lane)) % FIRST_TWENTY_ROSTER.length],
    routeStyle: ROUTE_STYLES[chapterIndex] };
}

export function bossRosterIndexFor(chapter) {
  return chapter === 26 ? 19
    : chapter > 20 ? 10 + ((chapter - 21) % 10)
      : Math.max(0, Math.min(19, chapter - 1));
}
