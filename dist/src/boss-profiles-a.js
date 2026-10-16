// 第一、二區魔王外型：只提供外觀資料，不改變戰鬥判定。
export const BOSS_PROFILES_A = [
  {
    id: 'meme-knife-shield',
    name: '我的刀盾',
    silhouette: 'ram',
    colors: { shell: '#b67a43', shadow: '#514756', glow: '#ffe087', eye: '#fff4d8' },
    anatomy: { headScale: 1.18, bodyScale: 1.08, hornLength: 21, jawWidth: 20, finLength: 9 },
    motion: { sway: 1.8, pulse: 0.035, attackReach: 15, hurtKick: 7 },
    parts: { head: 'shiba-head.png', knife: 'shiba-props.png',
      shield: 'shiba-props.png', body: 'shiba-body.svg' },
  },
  {
    id: 'zone-1-dreamweaver',
    name: '星蕈織夢者',
    silhouette: 'jelly',
    colors: { shell: '#586fc7', shadow: '#292b68', glow: '#77f0df', eye: '#fff9ff' },
    anatomy: { headScale: 0.9, bodyScale: 0.88, hornLength: 8, jawWidth: 9, finLength: 24 },
    motion: { sway: 4.2, pulse: 0.12, attackReach: 8, hurtKick: 11 },
  },
  {
    id: 'zone-2-verdant-reaper',
    name: '裂潮刃王',
    silhouette: 'mantis',
    colors: { shell: '#3caa82', shadow: '#174c4d', glow: '#c9ff72', eye: '#fff4bc' },
    anatomy: { headScale: 0.96, bodyScale: 0.92, hornLength: 25, jawWidth: 12, finLength: 20 },
    motion: { sway: 3.1, pulse: 0.075, attackReach: 24, hurtKick: 8 },
  },
  {
    id: 'zone-2-sun-coral',
    name: '珊瑚日蝕者',
    silhouette: 'coral',
    colors: { shell: '#e3a34d', shadow: '#874752', glow: '#fff1a1', eye: '#fffdf2' },
    anatomy: { headScale: 1.1, bodyScale: 1.04, hornLength: 17, jawWidth: 23, finLength: 13 },
    motion: { sway: 2.2, pulse: 0.1, attackReach: 13, hurtKick: 6 },
  },
];
