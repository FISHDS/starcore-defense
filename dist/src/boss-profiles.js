import { BOSS_PROFILES_A } from './boss-profiles-a.js?v=20261017-starcore-7';
import { BOSS_PROFILES_B } from './boss-profiles-b.js';
import { BOSS_PROFILES_C } from './boss-profiles-c.js';

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
if (FIRST_TWENTY_ROSTER.some(profile => !profile)) {
  throw new Error('前20關頭目名冊有缺少的外型資料');
}

export function bossProfileFor(chapter, lane = 0) {
  const chapterIndex = bossRosterIndexFor(chapter);
  const lead = FIRST_TWENTY_ROSTER[chapterIndex];
  if (Math.abs(lane) === 0) return lead;
  for (let offset = 1; offset < FIRST_TWENTY_ROSTER.length; offset++) {
    const candidate = FIRST_TWENTY_ROSTER[(chapterIndex + offset) % FIRST_TWENTY_ROSTER.length];
    if (candidate.silhouette !== lead.silhouette) return candidate;
  }
  return FIRST_TWENTY_ROSTER[(chapterIndex + Math.abs(lane)) % FIRST_TWENTY_ROSTER.length];
}

export function bossRosterIndexFor(chapter) {
  return chapter === 26 ? 19
    : chapter > 20 ? 10 + ((chapter - 21) % 10)
      : Math.max(0, Math.min(19, chapter - 1));
}
