// 星核防線的原創手繪圖鑑。座標以 390 × 844 的遊戲畫布為基準。
const TAU = Math.PI * 2;
const INK = '#17283d';
const PAPER = '#fff2d2';
const BIOMES = [
  { top: '#244653', mid: '#2b4c58', bottom: '#1e3545', accent: '#8ddbc9', enemy: '#f38375', shade: '#c45160', pale: '#ffd5ae' },
  { top: '#3b5149', mid: '#465a48', bottom: '#263f40', accent: '#b8d779', enemy: '#df9e66', shade: '#9d674f', pale: '#ffe3a5' },
  { top: '#343f67', mid: '#3d4b72', bottom: '#23344f', accent: '#9adbea', enemy: '#a58fda', shade: '#6a5baf', pale: '#e9dcff' },
  { top: '#59433e', mid: '#67483f', bottom: '#3d3540', accent: '#ffb57a', enemy: '#ef7765', shade: '#ad493f', pale: '#ffe1ac' },
  { top: '#2b3152', mid: '#343455', bottom: '#202842', accent: '#d48aca', enemy: '#d16ba6', shade: '#804177', pale: '#f7c9e9' },
];

// 戰鬥插畫先載入一次；在無瀏覽器的測試環境保留向量圖備援。
const SPRITE_FILES = {
  guardian: 'battle-guardian.png',
  headCoral: 'battle-head-coral.png',
  headCrystal: 'battle-head-crystal.png',
  bodyCoral: 'battle-body-coral.png',
  bodyCrystal: 'battle-body-crystal.png',
  bodyToxic: 'battle-body-toxic.png',
  chestGold: 'battle-chest-gold.png',
  chestCommon: 'battle-chest-common.png',
};
const SPRITES = {};
if (typeof Image !== 'undefined') {
  for (const [key, file] of Object.entries(SPRITE_FILES)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL(`../assets/${file}`, import.meta.url).href;
    SPRITES[key] = image;
  }
}

function drawSprite(ctx, key, x, y, width, height) {
  const image = SPRITES[key];
  if (!image || !image.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  return true;
}

function zoneIndex(zone) {
  return Math.max(0, Math.min(4, Math.floor(Number(zone) || 0)));
}

function circle(ctx, x, y, radius, fill, stroke = null, width = 2) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function ellipse(ctx, x, y, rx, ry, fill, stroke = null, width = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function rounded(ctx, x, y, width, height, radius, fill, stroke = INK, line = 3) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function line(ctx, points, color, width = 2) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function sparkle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + radius * 0.28, y - radius * 0.28, x + radius, y);
  ctx.quadraticCurveTo(x + radius * 0.28, y + radius * 0.28, x, y + radius);
  ctx.quadraticCurveTo(x - radius * 0.28, y + radius * 0.28, x - radius, y);
  ctx.quadraticCurveTo(x - radius * 0.28, y - radius * 0.28, x, y - radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function paintPetri(ctx, width, height, color, time) {
  ctx.strokeStyle = `${color}31`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = [38, width - 26, width * 0.68, width * 0.3][i];
    const y = [218, 347, 530, 671][i];
    ctx.beginPath();
    ctx.ellipse(x, y, 31 + i * 10, 17 + i * 7, i * 0.4, 0, TAU);
    ctx.stroke();
    for (let dot = 0; dot < 3; dot++) {
      const dx = Math.sin(i * 11 + dot * 2.3 + time * 0.3) * (11 + dot * 6);
      const dy = Math.cos(i * 8 + dot * 2.1 + time * 0.25) * (5 + dot * 3);
      circle(ctx, x + dx, y + dy, 2 + dot % 2, `${color}38`);
    }
  }
}

function paintMoss(ctx, width, color, time) {
  for (let i = 0; i < 9; i++) {
    const x = (i * 83 + 19) % width;
    const y = 150 + ((i * 139) % 530);
    const sway = Math.sin(time * 0.8 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 18);
    ctx.quadraticCurveTo(x - 12 + sway, y, x - 4 + sway, y - 20);
    ctx.quadraticCurveTo(x + 5 + sway, y - 3, x, y + 18);
    ctx.fillStyle = `${color}2c`;
    ctx.fill();
    circle(ctx, x + 9, y + 9, 5, `${color}30`);
    circle(ctx, x + 14, y + 4, 3, `${color}2b`);
  }
}

function paintCrystals(ctx, width, color) {
  for (let i = 0; i < 13; i++) {
    const x = (i * 71 + 23) % width;
    const y = 132 + ((i * 113) % 540);
    const size = 10 + i % 4 * 5;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.7, y);
    ctx.lineTo(x, y + size * 0.8);
    ctx.lineTo(x - size * 0.65, y);
    ctx.closePath();
    ctx.fillStyle = `${color}1f`;
    ctx.fill();
    ctx.strokeStyle = `${color}38`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function paintVessels(ctx, width, color, time) {
  ctx.lineCap = 'round';
  for (let side = 0; side < 2; side++) {
    const x = side ? width + 15 : -15;
    for (let i = 0; i < 4; i++) {
      const y = 155 + i * 145;
      const reach = side ? -52 : 52;
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.bezierCurveTo(x + reach * 0.3, y - 16, x + reach * 0.6, y + 6,
        x + reach * (0.8 + 0.04 * Math.sin(time + i)), y + 15);
      ctx.strokeStyle = `${color}24`;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = `${color}4a`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function paintNest(ctx, width, color, time) {
  for (let i = 0; i < 13; i++) {
    const x = (i * 97 + 15) % width;
    const y = 140 + ((i * 157) % 550);
    const pulse = 1 + Math.sin(time * 1.7 + i) * 0.09;
    ellipse(ctx, x, y, 9 * pulse, 14 * pulse, `${color}25`, `${color}3c`, 1.5);
    ellipse(ctx, x, y, 3.5, 7, `${color}50`);
  }
}

export function drawBiome(ctx, { zone = 0, time = 0, width = 390, height = 844 } = {}) {
  const index = zoneIndex(zone);
  const biome = BIOMES[index];
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, biome.top);
  gradient.addColorStop(0.59, biome.mid);
  gradient.addColorStop(1, biome.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#f8f4d21a';
  ctx.lineWidth = 1;
  for (let y = 110; y < height - 95; y += 94) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.28, y - 9, width * 0.65, y + 10, width, y);
    ctx.stroke();
  }
  if (index === 0) paintPetri(ctx, width, height, biome.accent, time);
  if (index === 1) paintMoss(ctx, width, biome.accent, time);
  if (index === 2) paintCrystals(ctx, width, biome.accent);
  if (index === 3) paintVessels(ctx, width, biome.accent, time);
  if (index === 4) paintNest(ctx, width, biome.accent, time);
  for (let i = 0; i < 21; i++) {
    const x = (i * 113 + 23) % width;
    const y = 145 + ((i * 173) % Math.max(1, height - 240));
    circle(ctx, x, y, i % 6 === 0 ? 2 : 1, `${biome.accent}24`);
  }
  ctx.restore();
}

export function drawGuardian(ctx, { x = 195, y = 744, time = 0, state = 'idle', invulnerable = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y - 3 + Math.sin(time * 4) * 1.2);
  if (invulnerable > 0 && Math.floor(time * 10) % 2) ctx.globalAlpha = 0.55;
  ellipse(ctx, 0, 13, 19, 6, '#0819276b');
  if (drawSprite(ctx, 'guardian', 0, -18, 76, 79)) {
    if (state === 'fire') {
      ctx.globalAlpha = 0.75;
      sparkle(ctx, 1, -58, 6, '#fff4bb');
    }
    if (state === 'hit') sparkle(ctx, -26, -22, 6, '#fff5af');
    ctx.restore();
    return;
  }
  ctx.shadowColor = '#9ef7db';
  ctx.shadowBlur = 12;
  ellipse(ctx, 0, 0, 20, 18, '#75e0ca', INK, 3.5);
  ctx.shadowBlur = 0;
  ellipse(ctx, -6, -7, 8, 4, '#c8ffdf94');
  ctx.strokeStyle = '#efffde';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0.35, 2.8);
  ctx.stroke();
  // 針筒炮塔的斜角輪廓，使角色在低解析度仍能與敵人分開。
  ctx.translate(0, -17);
  ctx.rotate(state === 'fire' ? 0.04 : -0.04);
  rounded(ctx, -4, -13, 10, 19, 3, '#f7c676', INK, 2.5);
  rounded(ctx, -2, -22, 6, 11, 2, '#b2f4f1', INK, 2);
  line(ctx, [[1, -22], [1, -28]], INK, 2.5);
  circle(ctx, 1, -29, 2.5, '#fff3b8', INK, 1.4);
  ctx.rotate(state === 'fire' ? -0.04 : 0.04);
  ctx.translate(0, 17);
  ellipse(ctx, -5.5, 1, 2.7, 3.5, INK);
  ellipse(ctx, 5.5, 1, 2.7, 3.5, INK);
  if (state === 'hit') {
    line(ctx, [[-3, 10], [0, 8], [3, 10]], INK, 2);
    sparkle(ctx, -18, -12, 4, '#fff5af');
  } else {
    ctx.beginPath();
    ctx.arc(0, 5, 4, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawConnector(ctx, { from, to, zone = 0, boss = false,
  lane = 0, shielded = false, time = 0 } = {}) {
  if (!from || !to || from.hp <= 0 || to.hp <= 0) return;
  const biome = BIOMES[zoneIndex(zone)];
  ctx.save();
  ctx.lineCap = 'round';
  line(ctx, [[from.x, from.y], [to.x, to.y]], INK, boss ? 33 : 29);
  line(ctx, [[from.x, from.y], [to.x, to.y]], boss && lane % 2 ? '#785cb5'
    : boss ? biome.shade : biome.enemy, boss ? 27 : 23);
  if (shielded) {
    ctx.globalAlpha = 0.52 + Math.sin(time * 5) * 0.12;
    line(ctx, [[from.x, from.y], [to.x, to.y]], '#a4f5ff', 6);
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.33 + Math.sin(time * 3) * 0.05;
  line(ctx, [[from.x - 4, from.y - 5], [to.x - 4, to.y - 5]], biome.pale, boss ? 5 : 4);
  ctx.restore();
}

function drawBody(ctx, piece, biome, boss, zone, lane) {
  const radius = piece.radius || (boss ? 20 : 18);
  const variant = piece.armorHp > 0 ? 'armored'
    : zone === 1 && piece.depth % 9 < 3 ? 'toxic'
      : piece.depth % 13 === 4 ? 'toxic' : 'soft';
  const fill = boss && lane % 2 ? '#b497e2' : variant === 'toxic'
    ? (zone === 1 ? '#d6dc81' : '#b9d589') : biome.enemy;
  const shade = boss && lane % 2 ? '#7355ad' : biome.shade;
  ellipse(ctx, 0, 2, radius + 2, radius - 0.5, shade, INK, 3);
  ellipse(ctx, -1, -1, radius - 1, radius - 3, fill, INK, 2.4);
  ellipse(ctx, -5, -8, radius * 0.42, radius * 0.18, biome.pale);
  if (variant === 'armored') {
    line(ctx, [[-radius + 5, -5], [-7, -radius + 4], [8, -radius + 5], [radius - 4, -3]], INK, 2.4);
    line(ctx, [[-7, -radius + 5], [-2, -3], [8, -radius + 5]], shade, 2.5);
    line(ctx, [[-radius + 4, 3], [-radius - 3, 9]], INK, 2.5);
    line(ctx, [[radius - 4, 3], [radius + 3, 9]], INK, 2.5);
  } else if (variant === 'toxic') {
    for (let i = 0; i < 3; i++) circle(ctx, -8 + i * 8, 5 + (i % 2) * 3, 2.6, '#528a6c', INK, 1);
    circle(ctx, 13, -8, 3, '#d7e98e', INK, 1);
  } else {
    ctx.beginPath();
    ctx.arc(0, 4, radius * 0.56, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = shade;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  const ratio = Math.max(0, piece.hp / Math.max(1, piece.maxHp));
  if (ratio < 0.65) {
    line(ctx, [[-2, -1], [2, 2], [0, 7], [5, 10]], INK, 1.8);
    if (ratio < 0.3) line(ctx, [[6, -6], [9, -2], [5, 0]], INK, 1.5);
  }
  if (piece.poisonFor > 0) circle(ctx, 11, 9, 3.5, '#b8eb7c', INK, 1.3);
  if (piece.burnFor > 0) sparkle(ctx, -12, -11, 4, '#ffca66');
}

function drawHead(ctx, piece, biome, chain) {
  const boss = !!chain.boss;
  const lane = Number(chain.lane) || 0;
  const radius = piece.radius || (boss ? 27 : 23);
  const fill = boss ? lane % 2 ? '#a981e7' : '#ef746f' : biome.enemy;
  const shade = boss ? lane % 2 ? '#6956a7' : '#a74c5a' : biome.shade;
  // 分岔觸角與大頭部，頭節即使無血條也有明確輪廓。
  for (const side of [-1, 1]) {
    line(ctx, [[side * 11, -radius + 5], [side * 15, -radius - 9], [side * 21, -radius - 13]], INK, 5);
    circle(ctx, side * 21, -radius - 13, boss ? 5 : 4, boss ? '#ffe0a4' : biome.accent, INK, 2);
  }
  if (boss) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 19, -14);
      ctx.lineTo(side * 31, -24);
      ctx.lineTo(side * 27, -6);
      ctx.closePath();
      ctx.fillStyle = lane % 2 ? '#dcc2ff' : '#ffd59a';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  ellipse(ctx, 0, 4, radius + 2, radius * 0.93, shade, INK, 3.5);
  ellipse(ctx, 0, 0, radius, radius * 0.88, fill, INK, 3);
  ellipse(ctx, -9, -10, 8, 4, biome.pale);
  for (const side of [-1, 1]) {
    ellipse(ctx, side * (boss ? 10 : 8), -1, boss ? 6 : 5, boss ? 7 : 5.5, PAPER, INK, 2);
    circle(ctx, side * (boss ? 9 : 7), 1, boss ? 2.6 : 2.2, INK);
  }
  if (boss && lane % 2) {
    sparkle(ctx, 0, -15, 5, '#9cf3ef');
    line(ctx, [[-7, 12], [0, 8], [7, 12]], INK, 3);
    for (let i = -1; i <= 1; i++) circle(ctx, i * 7, 17, 1.5, '#efe0ff');
  } else {
    rounded(ctx, -10, 10, 20, boss ? 11 : 8, 3, INK, null);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 5, 10);
      ctx.lineTo(side * 2, 16);
      ctx.lineTo(side * 0, 10);
      ctx.fillStyle = PAPER;
      ctx.fill();
    }
  }
  if (boss) {
    for (const side of [-1, 1]) {
      circle(ctx, side * 19, 13, 3, lane % 2 ? '#e6b9ff' : '#ffbf8a', INK, 1.5);
    }
  }
}

function drawChest(ctx, piece, biome, time) {
  const gold = !!piece.gold;
  const pulse = 1 + 0.035 * Math.sin(time * 5);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = gold ? '#ffcb5f' : '#aff7ff';
  ctx.shadowBlur = 15;
  rounded(ctx, -21, -19, 42, 38, 7, gold ? '#ffcf67' : '#9ce2dd', INK, 3.5);
  ctx.shadowBlur = 0;
  rounded(ctx, -19, -19, 38, 14, 5, gold ? '#ffe6a1' : '#d4f3e1', INK, 2);
  rounded(ctx, -18, -5, 36, 21, 3, gold ? '#e9a952' : '#5db8bc', INK, 2);
  rounded(ctx, -7, -4, 14, 15, 3, gold ? '#fff3b1' : '#e5fff2', INK, 2);
  line(ctx, [[0, -1], [0, 8]], gold ? '#bd7044' : '#467f87', 2.5);
  line(ctx, [[-4, 3.5], [4, 3.5]], gold ? '#bd7044' : '#467f87', 2.5);
  for (const side of [-1, 1]) {
    circle(ctx, side * 14, 5, 2, gold ? '#fff2af' : '#d4ffff', INK, 1);
    ctx.beginPath();
    ctx.moveTo(side * 18, 0);
    ctx.lineTo(side * 25, -6);
    ctx.lineTo(side * 23, 8);
    ctx.closePath();
    ctx.fillStyle = gold ? '#f3b960' : '#7dcfd0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (gold) sparkle(ctx, 17, -20, 5, '#fff8ca');
}

export function drawSegment(ctx, { piece, chain = {}, time = 0, zone = 0 } = {}) {
  if (!piece || piece.hp <= 0 || piece.y < -55 || piece.y > 899
    || piece.x < -55 || piece.x > 445) return;
  const index = zoneIndex(zone);
  const biome = BIOMES[index];
  ctx.save();
  ctx.translate(piece.x, piece.y + Math.sin(time * 4 + (piece.depth || 0) * 0.5) * 0.8);
  if (piece.chest) {
    const pulse = 1 + Math.sin(time * 5) * 0.025;
    if (!drawSprite(ctx, piece.gold ? 'chestGold' : 'chestCommon',
      0, 0, 56 * pulse, 47 * pulse)) drawChest(ctx, piece, biome, time);
  } else if (piece.index === 0) {
    const key = (chain.boss && Number(chain.lane) % 2) || index === 2 || index === 4
      ? 'headCrystal' : 'headCoral';
    const size = chain.boss ? 74 : 61;
    if (!drawSprite(ctx, key, 0, -3, size, size)) drawHead(ctx, piece, biome, chain);
  }
  else {
    const key = piece.armorHp > 0 || (chain.boss && Number(chain.lane) % 2)
      || index === 2 || index === 4 ? 'bodyCrystal'
      : piece.poisonFor > 0 || index === 1 || piece.depth % 13 === 4
        ? 'bodyToxic' : 'bodyCoral';
    const scale = chain.boss ? 1.1 : 1;
    if (!drawSprite(ctx, key, 0, 0, 51 * scale, 39 * scale))
      drawBody(ctx, piece, biome, !!chain.boss, index, Number(chain.lane) || 0);
    if (piece.armorHp > 0) {
      ctx.strokeStyle = '#d7ecff'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, (piece.radius || 18) + 2, -2.8, -0.2); ctx.stroke();
    }
    if (piece.guard) {
      rounded(ctx, -7, -8, 14, 15, 4, '#ffdf82', INK, 2);
      line(ctx, [[0, -5], [0, 4]], '#7a4c3a', 2);
    } else if (piece.magnet) {
      ctx.strokeStyle = '#8bf5ed'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 1, 9, 0.25, Math.PI * 1.65); ctx.stroke();
      circle(ctx, 0, 1, 3, '#b9ffed', INK, 1);
    } else if (piece.weakpoint) {
      circle(ctx, 0, 2, 8, piece.weakOpen ? '#fff2a1' : '#8068a2', INK, 2);
      if (piece.weakOpen) sparkle(ctx, 0, 2, 5, '#ff9073');
    } else if (piece.haste) {
      line(ctx, [[-3, -9], [4, -2], [-2, -2], [3, 8]], '#fff0a2', 4);
    }
    if (piece.transitShield) {
      const pulse = Math.sin(time * 7 + (piece.depth || 0) * 0.6) * 0.12;
      ctx.save();
      ctx.shadowColor = '#a3faff';
      ctx.shadowBlur = 11;
      ctx.fillStyle = `rgba(90, 242, 255, ${0.1 + pulse * 0.3})`;
      ctx.strokeStyle = `rgba(177, 252, 255, ${0.78 + pulse})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 22, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      line(ctx, [[-20, -14], [-12, -20], [-3, -21]], '#f4ffff', 1.6);
      line(ctx, [[11, 20], [21, 12]], '#f4ffff', 1.6);
      ctx.restore();
    }
  }
  if (chain.shielded && (piece.index === 0 || piece.chest)) {
    ctx.strokeStyle = '#a4f5ff';
    ctx.shadowColor = '#6cdeff';
    ctx.shadowBlur = 13;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, (piece.radius || 20) + 8 + Math.sin(time * 5) * 1.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawChestFocus(ctx, { x = 0, y = 0, gold = false, time = 0, hpRatio = 1 } = {}) {
  ctx.save();
  const color = gold ? '#ffe38b' : '#b9fff1';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.arc(x, y, 29 + Math.sin(time * 5) * 1.2, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    sparkle(ctx, x + Math.cos(angle) * 35, y + Math.sin(angle) * 35, gold ? 3.5 : 2.5, color);
  }
  rounded(ctx, x - 21, y + 31, 42, 7, 3, '#12283b', null);
  rounded(ctx, x - 19, y + 33, 38 * Math.max(0, Math.min(1, hpRatio)), 3, 2, color, null);
  ctx.restore();
}

export function drawProjectile(ctx, { x = 0, y = 0, time = 0, enemy = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (enemy) {
    ctx.rotate(time * 4);
    sparkle(ctx, 0, 0, 10, '#ffc1aa');
    circle(ctx, 0, 0, 5, '#f7808a', INK, 1.7);
  } else {
    ctx.shadowColor = '#b2fff1';
    ctx.shadowBlur = 10;
    rounded(ctx, -4, -12, 8, 20, 4, '#d7fff5', INK, 1.5);
    ctx.shadowBlur = 0;
    rounded(ctx, -3, -2, 6, 8, 2, '#5bd6d7', null);
  }
  ctx.restore();
}

function skillPalette(id) {
  if (['power', 'blast', 'burn', 'fury', 'rebound'].includes(id)) return ['#f5826f', '#ffd2a6'];
  if (['rapid', 'orbit', 'focus', 'crit', 'rail', 'bounty'].includes(id)) return ['#f6c96c', '#fff1b0'];
  if (['pierce', 'needle', 'saw', 'mark', 'pulse'].includes(id)) return ['#ae92e8', '#eed8ff'];
  if (['frost', 'arc', 'multi', 'scatter', 'echo', 'magnet', 'anchor'].includes(id)) return ['#7edee2', '#dbffff'];
  return ['#8adcb0', '#e3ffd8'];
}

function capsuleIcon(ctx, fill, shine) {
  ctx.save();
  ctx.rotate(-0.55);
  rounded(ctx, -9, -20, 18, 40, 9, shine, INK, 3);
  rounded(ctx, -8, 0, 16, 18, 7, fill, null);
  line(ctx, [[-7, 0], [7, 0]], INK, 2.2);
  ctx.restore();
}

function boltIcon(ctx, fill) {
  ctx.beginPath();
  ctx.moveTo(3, -23); ctx.lineTo(-12, -2); ctx.lineTo(-3, -2);
  ctx.lineTo(-8, 21); ctx.lineTo(14, -7); ctx.lineTo(4, -7);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function crossIcon(ctx, fill) {
  rounded(ctx, -7, -21, 14, 42, 4, fill, INK, 2.5);
  rounded(ctx, -21, -7, 42, 14, 4, fill, INK, 2.5);
}

export function drawSkillIcon(ctx, { id = 'power', x = 0, y = 0, size = 52, time = 0 } = {}) {
  const [fill, shine] = skillPalette(id);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  circle(ctx, 0, 0, 27, '#122c40', INK, 2.5);
  circle(ctx, 0, 0, 24, `${fill}40`, null);
  switch (id) {
    case 'power': case 'rail': case 'needle':
      capsuleIcon(ctx, fill, shine); break;
    case 'rapid':
      boltIcon(ctx, fill); break;
    case 'multi': case 'scatter':
      ctx.save(); ctx.translate(-12, 2); ctx.scale(0.55, 0.55); capsuleIcon(ctx, fill, shine); ctx.restore();
      ctx.save(); ctx.translate(8, -8); ctx.scale(0.55, 0.55); capsuleIcon(ctx, fill, shine); ctx.restore();
      ctx.save(); ctx.translate(11, 12); ctx.scale(0.45, 0.45); capsuleIcon(ctx, fill, shine); ctx.restore();
      break;
    case 'pierce': case 'saw':
      line(ctx, [[-16, 17], [15, -16]], INK, 9);
      line(ctx, [[-16, 17], [15, -16]], shine, 5);
      ctx.beginPath(); ctx.moveTo(13, -21); ctx.lineTo(23, -24); ctx.lineTo(19, -12); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      break;
    case 'blast': case 'rebound':
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        line(ctx, [[Math.cos(a) * 12, Math.sin(a) * 12], [Math.cos(a) * 23, Math.sin(a) * 23]], shine, 4);
      }
      circle(ctx, 0, 0, 12, fill, INK, 2.5);
      sparkle(ctx, -4, -5, 6, shine);
      break;
    case 'orbit': case 'pulse':
      ctx.strokeStyle = fill; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0.3, 5.4); ctx.stroke();
      ctx.strokeStyle = shine; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0.3, 5.4); ctx.stroke();
      circle(ctx, 17, -3, 5, shine, INK, 2);
      break;
    case 'arc': case 'echo':
      boltIcon(ctx, fill);
      if (id === 'echo') { ctx.globalAlpha = 0.5; ctx.translate(7, 2); boltIcon(ctx, shine); }
      break;
    case 'frost':
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3;
        line(ctx, [[Math.cos(a) * 20, Math.sin(a) * 20], [-Math.cos(a) * 20, -Math.sin(a) * 20]], shine, 3.5);
      }
      circle(ctx, 0, 0, 5, fill, INK, 1.5);
      break;
    case 'repair': case 'secondwind':
      crossIcon(ctx, fill); break;
    case 'shield': case 'anchor':
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(19, -13); ctx.lineTo(16, 12);
      ctx.lineTo(0, 23); ctx.lineTo(-16, 12); ctx.lineTo(-19, -13); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      if (id === 'anchor') line(ctx, [[0, -12], [0, 15], [-11, 7], [0, 15], [11, 7]], INK, 2.5);
      else sparkle(ctx, 0, 0, 7, shine);
      break;
    case 'focus': case 'magnet': case 'crit': case 'mark':
      circle(ctx, 0, 0, 17, null, fill, 4);
      circle(ctx, 0, 0, 8, null, shine, 3);
      circle(ctx, 0, 0, 3, fill);
      for (const side of [-1, 1]) line(ctx, [[side * 21, 0], [side * 27, 0]], shine, 2);
      break;
    case 'poison': case 'burn': case 'fury':
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.bezierCurveTo(13, -9, 18, 0, 13, 11);
      ctx.bezierCurveTo(6, 25, -11, 23, -14, 9); ctx.bezierCurveTo(-16, -3, -6, -14, 0, -22);
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      sparkle(ctx, 1, 5, 7, shine);
      break;
    case 'drone':
      circle(ctx, 0, 0, 12, fill, INK, 3);
      for (const side of [-1, 1]) {
        ellipse(ctx, side * 20, -9, 7, 4, shine, INK, 2);
        line(ctx, [[side * 12, 3], [side * 21, 11]], INK, 3);
      }
      circle(ctx, 0, 0, 4, shine);
      break;
    case 'bounty':
      rounded(ctx, -18, -15, 36, 31, 7, fill, INK, 3);
      sparkle(ctx, 0, 0, 10, shine);
      break;
    default:
      capsuleIcon(ctx, fill, shine);
  }
  ctx.restore();
}
