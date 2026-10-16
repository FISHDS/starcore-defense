import { BOSS_PROFILES_A } from './boss-profiles-a.js?v=20261017-starcore-4';
import { BOSS_PROFILES_B } from './boss-profiles-b.js';

export const BOSS_PROFILES = [...BOSS_PROFILES_A, ...BOSS_PROFILES_B];
const STANDARD_PROFILES = BOSS_PROFILES.filter(item =>
  !['meme-screech-cat', 'meme-seen-zone-admin',
    'meme-last-shift-coffin-leader', 'meme-loading-99'].includes(item.id));
const SCREECH_CAT = BOSS_PROFILES.find(item => item.id === 'meme-screech-cat');

export function bossProfileFor(chapter, lane = 0) {
  if (chapter === 6 && lane === 0)
    return BOSS_PROFILES.find(item => item.id === 'meme-loading-99');
  if (chapter === 1 && lane === 0)
    return STANDARD_PROFILES.find(item => item.id === 'meme-knife-shield');
  if (chapter === 5 && lane === 0)
    return BOSS_PROFILES.find(item => item.id === 'meme-last-shift-coffin-leader');
  if (chapter === 2 && lane === 0) return SCREECH_CAT;
  if (chapter === 3 && lane === 0)
    return BOSS_PROFILES.find(item => item.id === 'meme-seen-zone-admin');
  // 依關卡輪替頭目輪廓，避免每區只重複同兩種外型；雙頭仍取相鄰但不同的輪廓。
  const base = chapter === 26
    ? Math.floor((chapter - 1) / 5) * 2
    : ((Math.max(3, Math.min(25, chapter)) - 3) * 7 + 2) % STANDARD_PROFILES.length;
  let index = base % STANDARD_PROFILES.length;
  if (Math.abs(lane) > 0) {
    const firstSilhouette = STANDARD_PROFILES[index].silhouette;
    for (let offset = 1; offset < STANDARD_PROFILES.length; offset++) {
      const candidate = (base + offset) % STANDARD_PROFILES.length;
      if (STANDARD_PROFILES[candidate].silhouette !== firstSilhouette) {
        index = candidate;
        break;
      }
    }
  }
  return STANDARD_PROFILES[index];
}
