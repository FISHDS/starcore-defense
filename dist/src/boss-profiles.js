import { BOSS_PROFILES_A } from './boss-profiles-a.js?v=20261016-shiba-boss-1';
import { BOSS_PROFILES_B } from './boss-profiles-b.js';

export const BOSS_PROFILES = [...BOSS_PROFILES_A, ...BOSS_PROFILES_B];

export function bossProfileFor(chapter, lane = 0) {
  const zone = chapter === 26 ? 4 : Math.max(0, Math.min(4, Math.floor((chapter - 1) / 5)));
  return BOSS_PROFILES[zone * 2 + (Math.abs(lane) % 2)];
}
