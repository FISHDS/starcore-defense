import { BOSS_PROFILES_A } from './boss-profiles-a.js?v=20261016-cat-1';
import { BOSS_PROFILES_B } from './boss-profiles-b.js';

export const BOSS_PROFILES = [...BOSS_PROFILES_A, ...BOSS_PROFILES_B];
const STANDARD_PROFILES = BOSS_PROFILES.filter(item => item.id !== 'meme-screech-cat');
const SCREECH_CAT = BOSS_PROFILES.find(item => item.id === 'meme-screech-cat');

export function bossProfileFor(chapter, lane = 0) {
  if (chapter === 2 && lane === 0) return SCREECH_CAT;
  const zone = chapter === 26 ? 4 : Math.max(0, Math.min(4, Math.floor((chapter - 1) / 5)));
  const index = zone * 2 + (Math.abs(lane) % 2);
  return STANDARD_PROFILES[index];
}
