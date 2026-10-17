// 全部魔王共用的畫法；外型差異由資料提供，路線與碰撞仍由遊戲管理。
import { resolveBossEquipmentPose } from './boss-rig.js?v=20261017-starcore-14';
import { BOSS_PROFILES } from './boss-profiles.js?v=20261017-starcore-14';

const TAU = Math.PI * 2;
const INK = '#172235';
const SHIBA_ASSETS = {};
const CAT_ASSETS = {};
const ADMIN_ASSETS = {};
const COFFIN_ASSETS = {};
const LOADING99_ASSETS = {};
const BATCH_BOSS_ASSETS = new Map();
const smallSprites = new WeakMap();
function mobileSprite(image, size = 112) {
  if (!image?.complete || !image.naturalWidth) return null;
  let variants = smallSprites.get(image);
  if (!variants) {
    variants = new Map();
    smallSprites.set(image, variants);
  }
  if (variants.has(size)) return variants.get(size);
  if (typeof document === 'undefined') return image;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  canvas.getContext('2d').drawImage(image, 0, 0, size, size);
  variants.set(size, canvas);
  return canvas;
}
if (typeof Image !== 'undefined') {
  const files = {
    head: 'shiba-head-battle.png', props: 'shiba-props-battle.png', body: 'shiba-body.png',
    headFallback: 'shiba-head.svg', knifeFallback: 'shiba-knife.svg',
    shieldFallback: 'shiba-shield.svg',
  };
  for (const [part, file] of Object.entries(files)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL(`../assets/bosses/${file}?v=20261017-shiba-5`, import.meta.url).href;
    SHIBA_ASSETS[part] = image;
    image.addEventListener('load', () => {
      if (part === 'body') mobileSprite(image, 112);
    }, { once: true });
  }
  for (const part of ['head', 'body']) {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL(`../assets/bosses/screech-cat-${part}.png?v=20261017-cat-2`, import.meta.url).href;
    CAT_ASSETS[part] = image;
  }
  const admin = new Image();
  admin.decoding = 'async';
  admin.src = new URL('../assets/bosses/prototypes/seen-zone-group-admin.svg?v=20261017-admin-2', import.meta.url).href;
  admin.addEventListener('load', () => {
    const parts = {
      head: [54, 28, 210, 292, 126, 176],
      body: [330, 90, 165, 145, 96, 84],
      phone: [580, 70, 160, 220, 80, 110],
    };
    for (const [part, [sx, sy, sw, sh, width, height]] of Object.entries(parts)) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(admin, sx, sy, sw, sh, 0, 0, width, height);
      ADMIN_ASSETS[part] = canvas;
    }
  }, { once: true });
  const coffinAtlas = new Image();
  coffinAtlas.decoding = 'async';
  coffinAtlas.src = new URL('../assets/bosses/prototypes/last-shift-coffin-leader-atlas.svg?v=20261017-coffin-2', import.meta.url).href;
  coffinAtlas.addEventListener('load', () => {
    const parts = {
      head: [0, 0, 96, 96], hand: [112, 8, 44, 44],
      coffin: [168, 8, 44, 44], shoe: [224, 8, 44, 44],
      chest: [280, 8, 44, 44],
    };
    for (const [part, [sx, sy, width, height]] of Object.entries(parts)) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(coffinAtlas, sx, sy, width, height,
        0, 0, width, height);
      COFFIN_ASSETS[part] = canvas;
    }
  }, { once: true });
  const loading99Atlas = new Image();
  loading99Atlas.decoding = 'async';
  loading99Atlas.src = new URL('../assets/bosses/loading-99-atlas.svg?v=20261017-starcore-14', import.meta.url).href;
  loading99Atlas.addEventListener('load', () => {
    const parts = {
      head: [0, 0, 100, 104], ring: [105, 16, 72, 72],
      bar: [182, 16, 72, 72], error: [259, 16, 72, 72],
      chest: [336, 16, 72, 72],
    };
    for (const [part, [sx, sy, width, height]] of Object.entries(parts)) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(loading99Atlas, sx, sy, width, height,
        0, 0, width, height);
      LOADING99_ASSETS[part] = canvas;
    }
  }, { once: true });
  for (const profile of BOSS_PROFILES.filter(item => item.parts?.signature)) {
    const assets = {};
    BATCH_BOSS_ASSETS.set(profile.id, assets);
    for (const part of ['head', 'body', 'signature']) {
      const image = new Image();
      image.decoding = 'async';
      image.src = new URL(`../assets/bosses/${profile.parts[part]}?v=20261017-boss-roster-2`, import.meta.url).href;
      assets[part] = image;
    }
  }
}

function drawShibaPart(ctx, part, x, y, size, angle = 0) {
  const image = SHIBA_ASSETS[part]?.complete && SHIBA_ASSETS[part].naturalWidth
    ? SHIBA_ASSETS[part] : SHIBA_ASSETS[`${part}Fallback`];
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(mobileSprite(image, part === 'body' ? 112 : 128),
    -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

function drawShibaProp(ctx, part, x, y, width, height, angle, mirror = false) {
  const source = SHIBA_ASSETS.props;
  const atlas = source?.complete && source.naturalWidth
    ? mobileSprite(source, 256) : source;
  if (!atlas?.complete || !atlas.naturalWidth) {
    return drawShibaPart(ctx, part, x, y, Math.max(width, height), angle);
  }
  const sourceWidth = atlas.naturalWidth / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(atlas, part === 'knife' ? 0 : sourceWidth, 0,
    sourceWidth, atlas.naturalHeight,
    -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function ellipse(ctx, x, y, rx, ry, fill, stroke = INK, width = 2.5) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function stroke(ctx, points, color, width = 3) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function polygon(ctx, points, fill, width = 2.5) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = width; ctx.stroke();
}

export function drawBossConnector(ctx, { from, to, profile, pose, index }) {
  if (!from || !to || from.hp <= 0 || to.hp <= 0) return;
  ctx.save();
  if (profile.id === 'meme-last-shift-coffin-leader') {
    stroke(ctx, [[from.x, from.y], [to.x, to.y]], '#171d29', 28);
    stroke(ctx, [[from.x, from.y], [to.x, to.y]], '#7355ad', 20);
    stroke(ctx, [[from.x - 2, from.y - 2], [to.x - 2, to.y - 2]], '#b997ef', 5);
    const joint = pose.joints[index - 1];
    if (joint) ellipse(ctx, joint.x, joint.y, 5, 5, '#f5d892', '#171d29', 2);
    ctx.restore();
    return;
  }
  if (profile.id === 'meme-seen-zone-admin') {
    stroke(ctx, [[from.x, from.y], [to.x, to.y]], '#202b44', 17);
    stroke(ctx, [[from.x, from.y], [to.x, to.y]], '#67cfc9', 8);
    ctx.restore();
    return;
  }
  if (profile.id === 'meme-loading-99') {
    stroke(ctx, [[from.x, from.y], [to.x, to.y]], '#14283a', 22);
    stroke(ctx, [[from.x, from.y], [to.x, to.y]], '#45617b', 14);
    stroke(ctx, [[from.x - 2, from.y - 2], [to.x - 2, to.y - 2]], '#69d9d5', 4);
    ctx.restore();
    return;
  }
  stroke(ctx, [[from.x, from.y], [to.x, to.y]], INK, 32 * profile.anatomy.bodyScale);
  stroke(ctx, [[from.x, from.y], [to.x, to.y]], profile.colors.shadow,
    25 * profile.anatomy.bodyScale);
  stroke(ctx, [[from.x - 3, from.y - 3], [to.x - 3, to.y - 3]],
    profile.colors.shell, 7);
  const joint = pose.joints[index - 1];
  if (joint && joint.x > -35 && joint.x < 425 && joint.y > -35 && joint.y < 870) {
    ellipse(ctx, joint.x, joint.y, 5.5, 5.5, profile.colors.glow, INK, 2);
  }
  ctx.restore();
}

function headOutline(ctx, shape, radius, colors) {
  const r = radius;
  if (shape === 'mantis') {
    polygon(ctx, [[0, -r], [r * .9, -r * .35], [r * .75, r * .65],
      [0, r], [-r * .75, r * .65], [-r * .9, -r * .35]], colors.shell, 3.5);
  } else if (shape === 'coral') {
    polygon(ctx, [[0, -r], [r * .82, -r * .5], [r, r * .3], [r * .35, r],
      [-r * .35, r], [-r, r * .3], [-r * .82, -r * .5]], colors.shell, 3.5);
  } else if (shape === 'jelly') {
    ellipse(ctx, 0, 0, r * 1.05, r * .78, colors.shell, INK, 3.5);
    ellipse(ctx, 0, 7, r * .83, r * .42, colors.shadow, null);
  } else if (shape === 'ram') {
    ellipse(ctx, 0, 1, r * 1.05, r * .93, colors.shell, INK, 3.5);
    polygon(ctx, [[-r * .55, -r * .6], [0, -r * 1.08], [r * .55, -r * .6],
      [r * .38, 0], [-r * .38, 0]], colors.shadow);
  } else {
    polygon(ctx, [[0, -r * 1.13], [r * .86, -r * .55], [r * .86, r * .45],
      [0, r], [-r * .86, r * .45], [-r * .86, -r * .55]], colors.shell, 3.5);
    polygon(ctx, [[0, -r * .67], [r * .47, 0], [0, r * .64], [-r * .47, 0]],
      colors.shadow, 2);
  }
}

function antenna(ctx, shape, side, length, bend, colors, r) {
  if (shape === 'ram') {
    ctx.beginPath(); ctx.arc(side * (r - 2), -r * .42, length * .58,
      side < 0 ? .5 : Math.PI * .5, side < 0 ? Math.PI * 1.75 : Math.PI * 2.25);
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = colors.glow; ctx.stroke();
  } else if (shape === 'coral') {
    stroke(ctx, [[side * r * .48, -r * .6], [side * (r * .7 + bend), -r - length * .42],
      [side * (r + bend), -r - length]], INK, 7);
    stroke(ctx, [[side * r * .48, -r * .6], [side * (r * .7 + bend), -r - length * .42],
      [side * (r + bend), -r - length]], colors.glow, 4);
    stroke(ctx, [[side * (r * .7 + bend), -r - length * .42],
      [side * (r * .25 + bend), -r - length * .7]], colors.glow, 3);
  } else if (shape === 'core') {
    polygon(ctx, [[side * r * .55, -r * .55], [side * (r + length * .55), -r - length],
      [side * r * .87, -r * .2]], colors.glow);
  } else {
    stroke(ctx, [[side * r * .55, -r * .5],
      [side * (r + bend), -r - length]], INK, 6);
    stroke(ctx, [[side * r * .55, -r * .5],
      [side * (r + bend), -r - length]], colors.glow, 3.2);
    ellipse(ctx, side * (r + bend), -r - length, 4, 4, colors.glow, INK, 1.5);
  }
}

function drawKnifeShield(ctx, { piece, chain, time, profile, pose, head, r }) {
  const part = head ? 'head' : 'body';
  const image = SHIBA_ASSETS[part]?.complete && SHIBA_ASSETS[part].naturalWidth
    ? SHIBA_ASSETS[part] : SHIBA_ASSETS[`${part}Fallback`];
  if (!image?.complete || !image.naturalWidth) return false;
  if (head) {
    const equipmentState = pose.state === 'hurt' || pose.state === 'dying'
      ? pose.state : 'move';
    const equipment = resolveBossEquipmentPose(equipmentState, pose.phase, time);
    const side = equipment.weaponSide;
    const headSize = r * 3.35;
    ctx.save();
    ctx.translate(0, equipment.bob + equipment.recoil);
    if (equipment.fall) ctx.rotate(-equipment.fall * 0.55);
    if (pose.state === 'hurt') {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.filter = 'brightness(1.55) saturate(0.6)';
    }
    drawShibaProp(ctx, 'knife', side * r * 1.42, -6,
      r * 1.36, r * 2.18, equipment.knifeSwing, side > 0);
    drawShibaPart(ctx, 'head', 0, 0, headSize);
    ctx.shadowBlur = 0;
    drawShibaProp(ctx, 'shield', -side * r * 1.25,
      8, r * 1.48, r * 1.85, 0);
    ctx.restore();
  } else {
    const tilt = (piece.index % 2 ? 1 : -1) * 0.18;
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const pathAngle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    drawShibaPart(ctx, 'body', 0, 0, r * 2.2, tilt + pathAngle);
    if (piece.armorHp > 0) {
      ctx.beginPath(); ctx.arc(0, 0, r + 3, -2.8, -.2);
      ctx.strokeStyle = '#d1e9ed'; ctx.lineWidth = 3; ctx.stroke();
    }
    if (piece.guard || piece.weakpoint || piece.magnet || piece.haste) {
      ellipse(ctx, 0, 0, 7, piece.guard ? '#ffe08a'
        : piece.weakpoint ? (piece.weakOpen ? '#fff0a0' : '#6a5b85')
          : piece.magnet ? '#7be6ed' : '#fff2a1', INK, 2);
    }
  }
  return true;
}

function drawScreechCat(ctx, { piece, chain, time, profile, pose, head, r }) {
  const image = CAT_ASSETS[head ? 'head' : 'body'];
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.save();
  if (head) {
    const open = 1;
    const wobble = pose.state === 'hurt' ? Math.sin(time * 35) * .11 : Math.sin(time * 5) * .025;
    ctx.rotate(wobble);
    if (pose.state === 'hurt') ctx.filter = 'brightness(1.6)';
    ctx.drawImage(mobileSprite(image, 192), -r * 1.6 * open, -r * 1.6 * open,
      r * 3.2 * open, r * 3.2 * open);
  } else {
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const pathAngle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    ctx.rotate(pathAngle + Math.sin(time * 4 + piece.index * .65) * .06);
    ctx.drawImage(mobileSprite(image, 80), -r, -r, r * 2, r * 2);
    if (piece.armorHp > 0 || piece.weakpoint) {
      ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, TAU);
      ctx.fillStyle = piece.weakpoint && piece.weakOpen ? '#fff6a8' : '#c5e9f2';
      ctx.fill();
    }
  }
  ctx.restore();
  return true;
}

function drawSeenZoneAdmin(ctx, { piece, chain, time, pose, head, r }) {
  const image = ADMIN_ASSETS[head ? 'head' : 'body'];
  if (!image) return false;
  ctx.save();
  if (head) {
    ctx.rotate(Math.max(-0.28, Math.min(0.28, pose.angle)));
    if (pose.state === 'hurt') ctx.filter = 'brightness(1.55)';
    ctx.drawImage(image, -r * 1.34, -r * 1.68, r * 2.68, r * 3.36);
  } else {
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const pathAngle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    ctx.rotate(pathAngle + Math.sin(time * 4 + piece.index) * 0.045);
    ctx.drawImage(image, -r * 1.2, -r, r * 2.4, r * 2);
    if (piece.id === chain.rig?.weakpointId && ADMIN_ASSETS.phone) {
      ctx.drawImage(ADMIN_ASSETS.phone, r * 0.42, -r * 1.32,
        r * 0.98, r * 1.68);
      if (piece.weakOpen) {
        ctx.beginPath(); ctx.arc(r * 0.9, -r * 0.46, r * 1.25, 0, TAU);
        ctx.strokeStyle = '#ff6374'; ctx.lineWidth = 3;
        ctx.shadowColor = '#ff6374'; ctx.shadowBlur = 12; ctx.stroke();
      }
    }
  }
  ctx.restore();
  return true;
}

export function lastShiftPartForIndex(index) {
  return ['hand', 'coffin', 'shoe'][(index - 1) % 3];
}

export function loading99PartForIndex(index, weakpoint = false) {
  if (weakpoint) return 'error';
  return index % 2 === 0 ? 'ring' : 'bar';
}

function drawLoading99(ctx, { piece, chain, time, pose, head, r }) {
  const key = head ? 'head' : loading99PartForIndex(piece.index,
    piece.id === chain.rig?.weakpointId);
  const part = LOADING99_ASSETS[key];
  if (!part) return false;
  ctx.save();
  if (head) {
    if (pose.state === 'hurt') ctx.filter = 'brightness(1.7)';
    ctx.drawImage(part, -r * 1.55, -r * 1.55, r * 3.1, r * 3.1);
  } else {
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const angle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    ctx.rotate(angle + Math.sin(time * 4 + piece.index * 0.72) * 0.045);
    const size = r * 2.18;
    if (key === 'error' && piece.weakOpen) {
      ctx.shadowColor = '#ff796e'; ctx.shadowBlur = 14;
    }
    ctx.drawImage(part, -size / 2, -size / 2, size, size);
    if (key === 'error' && piece.weakOpen) {
      ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU);
      ctx.strokeStyle = '#ffe4a1'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  ctx.restore();
  return true;
}

function drawBatchBoss(ctx, { piece, chain, time, profile, pose, head, r }) {
  const assets = BATCH_BOSS_ASSETS.get(profile.id);
  const key = head ? 'head' : 'body';
  const image = assets?.[key];
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.save();
  if (head) {
    const moveBob = Math.sin(time * (profile.motion.sway + 2)) * 2.2;
    ctx.translate(0, moveBob + (pose.state === 'hurt' ? -4 : 0));
    if (pose.state === 'hurt') ctx.filter = 'brightness(1.65)';
    const size = r * (profile.id === 'meme-clock-in-executioner' ? 3.15 : 3.35);
    ctx.drawImage(mobileSprite(image, 128), -size / 2, -size / 2, size, size);
  } else {
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const angle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    ctx.rotate(angle + Math.sin(time * 4 + piece.index * 0.72) * 0.045);
    const size = r * (piece.chest ? 2.7 : 2.3);
    ctx.drawImage(mobileSprite(image, 64), -size / 2, -size / 2, size, size);
    const signature = assets.signature;
    if (piece.index % 5 === 2 && signature?.complete && signature.naturalWidth) {
      const mark = r * 1.35;
      ctx.drawImage(mobileSprite(signature, 56), -mark / 2, -mark / 2, mark, mark);
    }
    if (piece.weakpoint && piece.weakOpen) {
      ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, TAU);
      ctx.strokeStyle = profile.colors.glow; ctx.lineWidth = 3;
      ctx.shadowColor = profile.colors.glow; ctx.shadowBlur = 10; ctx.stroke();
    }
  }
  ctx.restore();
  return true;
}

function drawLastShiftCoffin(ctx, { piece, chain, time, pose, head, r }) {
  const part = head ? COFFIN_ASSETS.head
    : piece.chest ? COFFIN_ASSETS.chest
      : COFFIN_ASSETS[lastShiftPartForIndex(piece.index)];
  if (!part) return false;
  ctx.save();
  if (head) {
    const bob = Math.sin(time * 5) * 2;
    if (pose.state === 'hurt') ctx.filter = 'brightness(1.65)';
    ctx.translate(0, bob + (pose.state === 'hurt' ? -6 : 0));
    ctx.drawImage(part, -r * 1.55, -r * 1.55, r * 3.1, r * 3.1);
  } else {
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const angle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    ctx.rotate(angle + Math.sin(time * 5 + piece.index * .7) * .07);
    const size = piece.chest ? r * 2.8 : piece.index === 3 ? r * 2.7 : r * 2.25;
    ctx.drawImage(part, -size / 2, -size / 2, size, size);
    if (piece.weakpoint && piece.weakOpen) {
      ctx.beginPath(); ctx.arc(0, 0, r * 1.34, 0, TAU);
      ctx.strokeStyle = '#fff2a1'; ctx.lineWidth = 4;
      ctx.shadowColor = '#ffe17a'; ctx.shadowBlur = 14; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.lineTo(r * 1.2, 0);
      ctx.moveTo(0, -r * 1.2); ctx.lineTo(0, r * 1.2); ctx.stroke();
    }
  }
  ctx.restore();
  return true;
}

export function drawBossSegment(ctx, { piece, chain, time, profile, pose }) {
  if (!piece || piece.hp <= 0 || piece.y < -60 || piece.y > 900
    || piece.x < -60 || piece.x > 450) return;
  const colors = profile.colors;
  const head = piece.index === 0;
  const location = head ? pose.head : pose.spine[piece.index];
  const r = (head ? 27 * pose.head.scale : (piece.radius || 20)
    * profile.anatomy.bodyScale);
  ctx.save();
  ctx.translate(location.x, location.y);
  if (head) ctx.rotate(['meme-screech-cat', 'meme-loading-99'].includes(profile.id)
    ? Math.max(-0.38, Math.min(0.38, pose.angle)) : pose.angle);
  if (head && pose.phase === 2) {
    ctx.shadowColor = colors.glow; ctx.shadowBlur = 13;
  }
  if (profile.id === 'meme-knife-shield'
    && drawKnifeShield(ctx, { piece, chain, time, profile, pose, head, r })) {
    ctx.restore();
    return;
  }
  if (profile.id === 'meme-screech-cat'
    && drawScreechCat(ctx, { piece, chain, time, profile, pose, head, r })) {
    ctx.restore();
    return;
  }
  if (profile.id === 'meme-seen-zone-admin'
    && drawSeenZoneAdmin(ctx, { piece, chain, time, pose, head, r })) {
    ctx.restore();
    return;
  }
  if (profile.id === 'meme-last-shift-coffin-leader'
    && drawLastShiftCoffin(ctx, { piece, chain, time, pose, head, r })) {
    ctx.restore();
    return;
  }
  if (profile.id === 'meme-loading-99'
    && drawLoading99(ctx, { piece, chain, time, profile, pose, head, r })) {
    ctx.restore();
    return;
  }
  if (BATCH_BOSS_ASSETS.has(profile.id)
    && drawBatchBoss(ctx, { piece, chain, time, profile, pose, head, r })) {
    ctx.restore();
    return;
  }
  if (!head) {
    const fin = pose.fin * (piece.index % 3 === 0 ? 1 : .65);
    for (const side of [-1, 1]) {
      polygon(ctx, [[side * (r - 3), -7], [side * (r + fin), -12],
        [side * (r + fin * .55), 9], [side * r, 8]], colors.shadow, 2);
    }
    ellipse(ctx, 0, 1, r + 2, r * .88, colors.shadow, INK, 3);
    ellipse(ctx, -1, -3, r - 1, r * .68, colors.shell, INK, 2);
    ellipse(ctx, -r * .27, -r * .37, r * .36, r * .16, colors.glow, null);
    if (profile.silhouette === 'core') {
      polygon(ctx, [[0, -r * .58], [r * .4, 0], [0, r * .48], [-r * .4, 0]], colors.glow, 1.5);
    } else if (profile.silhouette === 'jelly') {
      ellipse(ctx, 0, 2, r * .3, r * .34, colors.glow, null);
    } else {
      stroke(ctx, [[-r * .4, 5], [0, r * .5], [r * .4, 5]], colors.shadow, 2);
    }
    if (piece.armorHp > 0) {
      ctx.beginPath(); ctx.arc(0, 0, r + 3, -2.8, -.2);
      ctx.strokeStyle = colors.glow; ctx.lineWidth = 3; ctx.stroke();
    }
    if (piece.guard) {
      polygon(ctx, [[-7, -7], [7, -7], [7, 7], [-7, 7]], '#ffe08a', 2);
      stroke(ctx, [[0, -4], [0, 4]], INK, 2);
    } else if (piece.magnet) {
      ellipse(ctx, 0, 0, 8, 8, '#7be6ed', INK, 2);
      ellipse(ctx, 0, 0, 3, 3, '#f7fff0', null);
    } else if (piece.weakpoint) {
      ellipse(ctx, 0, 0, 8, 8, piece.weakOpen ? '#fff0a0' : '#6a5b85', INK, 2);
      if (piece.weakOpen) ellipse(ctx, 0, 0, 3, 3, '#ff875d', null);
    } else if (piece.haste) {
      polygon(ctx, [[-2, -10], [5, -3], [0, -3], [4, 9], [-5, 1], [0, 1]],
        '#fff2a1', 2);
    }
  } else {
    for (const item of pose.antenna) antenna(ctx, profile.silhouette,
      item.side, item.length, item.bend, colors, r);
    headOutline(ctx, profile.silhouette, r, colors);
    ctx.shadowBlur = 0;
    ellipse(ctx, -r * .24, -r * .38, r * .32, r * .13, colors.glow, null);
    for (const side of [-1, 1]) {
      ellipse(ctx, side * r * .34, -r * .04, r * .18, r * .25,
        pose.state === 'hurt' ? '#ffffff' : colors.eye, INK, 2);
      ellipse(ctx, side * r * .34, r * .01, r * .07, r * .11, INK, null);
    }
    const jaw = pose.jaw;
    polygon(ctx, [[-jaw, r * .47], [0, r * .77],
      [jaw, r * .47], [0, r * .56]], colors.shadow, 2.5);
  }
  ctx.restore();
}
