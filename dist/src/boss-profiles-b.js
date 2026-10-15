// 三至五區魔王外型：刻意以不同頭型、比例與明暗配色拉開手機上的辨識度。
export const BOSS_PROFILES_B = [
  {
    id: 'zone-3-reef-warden', name: '礁脊守衛', silhouette: 'coral',
    colors: { shell: '#e66b58', shadow: '#71384d', glow: '#ffd879', eye: '#fff9df' },
    anatomy: { headScale: 1.08, bodyScale: 1.16, hornLength: 25, jawWidth: 17, finLength: 22 },
    motion: { sway: 2.8, pulse: 0.08, attackReach: 13, hurtKick: 9 },
  },
  {
    id: 'zone-3-glass-mantis', name: '鏡甲螳螂', silhouette: 'mantis',
    colors: { shell: '#51c8b2', shadow: '#244c70', glow: '#b8fff0', eye: '#fff4ad' },
    anatomy: { headScale: 0.9, bodyScale: 0.88, hornLength: 11, jawWidth: 25, finLength: 9 },
    motion: { sway: 4.2, pulse: 0.12, attackReach: 21, hurtKick: 6 },
  },
  {
    id: 'zone-4-abyss-bell', name: '深淵鐘母', silhouette: 'jelly',
    colors: { shell: '#a27be8', shadow: '#42376f', glow: '#ff9ee8', eye: '#ffffff' },
    anatomy: { headScale: 1.18, bodyScale: 1.04, hornLength: 8, jawWidth: 12, finLength: 26 },
    motion: { sway: 3.1, pulse: 0.16, attackReach: 8, hurtKick: 12 },
  },
  {
    id: 'zone-4-iron-maw', name: '鐵顎破陣者', silhouette: 'ram',
    colors: { shell: '#a9bac2', shadow: '#394956', glow: '#ffb34e', eye: '#fff2d2' },
    anatomy: { headScale: 1.14, bodyScale: 1.2, hornLength: 23, jawWidth: 27, finLength: 5 },
    motion: { sway: 1.5, pulse: 0.04, attackReach: 25, hurtKick: 5 },
  },
  {
    id: 'zone-5-solar-heart', name: '蝕日核心', silhouette: 'core',
    colors: { shell: '#f2a52f', shadow: '#7c3428', glow: '#fff477', eye: '#fffdf0' },
    anatomy: { headScale: 1.2, bodyScale: 1.12, hornLength: 4, jawWidth: 19, finLength: 15 },
    motion: { sway: 1.2, pulse: 0.19, attackReach: 18, hurtKick: 11 },
  },
  {
    id: 'zone-5-night-bloom', name: '夜幕花噬者', silhouette: 'coral',
    colors: { shell: '#4163a8', shadow: '#202943', glow: '#7ef4ff', eye: '#ffe6ff' },
    anatomy: { headScale: 0.94, bodyScale: 0.92, hornLength: 18, jawWidth: 9, finLength: 24 },
    motion: { sway: 5.2, pulse: 0.1, attackReach: 10, hurtKick: 15 },
  },
];
