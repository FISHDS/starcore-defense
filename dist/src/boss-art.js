// 全部魔王共用的畫法；外型差異由資料提供，路線與碰撞仍由遊戲管理。
import { resolveBossEquipmentPose } from './boss-rig.js';
import { knifeShieldGuarded } from './knife-shield.js';

const TAU = Math.PI * 2;
const INK = '#172235';
const SHIBA_ASSETS = {};
const CAT_ASSETS = {};
const smallSprites = new WeakMap();
function mobileSprite(image, size = 112) {
  if (!image?.complete || !image.naturalWidth) return null;
  if (smallSprites.has(image)) return smallSprites.get(image);
  if (typeof document === 'undefined') return image;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  canvas.getContext('2d').drawImage(image, 0, 0, size, size);
  smallSprites.set(image, canvas);
  return canvas;
}
if (typeof Image !== 'undefined') {
  const files = {
    head: 'shiba-head.png', props: 'shiba-props.png', body: 'shiba-body.png',
    headFallback: 'shiba-head.svg', knifeFallback: 'shiba-knife.svg',
    shieldFallback: 'shiba-shield.svg',
  };
  for (const [part, file] of Object.entries(files)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL(`../assets/bosses/${file}?v=20261016-shiba-3`, import.meta.url).href;
    SHIBA_ASSETS[part] = image;
  }
  for (const part of ['head', 'body']) {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL(`../assets/bosses/screech-cat-${part}.png?v=20261016-cat-1`, import.meta.url).href;
    CAT_ASSETS[part] = image;
  }
}

function drawShibaPart(ctx, part, x, y, size, angle = 0) {
  const image = SHIBA_ASSETS[part]?.complete && SHIBA_ASSETS[part].naturalWidth
    ? SHIBA_ASSETS[part] : SHIBA_ASSETS[`${part}Fallback`];
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(part === 'body' ? mobileSprite(image) : image,
    -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

function drawShibaProp(ctx, part, x, y, width, height, angle, mirror = false) {
  const atlas = SHIBA_ASSETS.props;
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
    const equipment = resolveBossEquipmentPose(pose.state, pose.phase, time);
    const side = equipment.weaponSide;
    const headSize = r * 3.35;
    ctx.save();
    ctx.translate(0, equipment.bob + equipment.recoil);
    if (equipment.fall) ctx.rotate(-equipment.fall * 0.55);
    if (pose.state === 'telegraph') {
      ctx.shadowColor = profile.colors.glow;
      ctx.shadowBlur = 20;
    } else if (pose.state === 'hurt') {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.filter = 'brightness(1.55) saturate(0.6)';
    }
    drawShibaProp(ctx, 'knife', side * r * 1.42, -6,
      r * 1.36, r * 2.18, equipment.knifeSwing, side > 0);
    drawShibaPart(ctx, 'head', 0, 0, headSize);
    ctx.shadowBlur = 0;
    drawShibaProp(ctx, 'shield', -side * r * (pose.state === 'telegraph' ? 0.55 : 1.25),
      8 - equipment.shieldLift * 20, r * 1.48, r * 1.85,
      -side * equipment.shieldLift * 0.32);
    if (pose.state === 'strike') {
      ctx.strokeStyle = '#fff1b6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(side * r * 1.1, -r * 0.3, r * 1.12,
        side > 0 ? -1.15 : 2.1, side > 0 ? .5 : 3.75);
      ctx.stroke();
    }
    if (chain.shielded) {
      ctx.beginPath(); ctx.arc(0, 0, r + 9, 0, TAU);
      ctx.strokeStyle = '#a4f5ff'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  } else {
    const tilt = (piece.index % 2 ? 1 : -1) * 0.18;
    const ahead = pose.spine[piece.index - 1];
    const here = pose.spine[piece.index];
    const pathAngle = ahead && here
      ? Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2 : 0;
    drawShibaPart(ctx, 'body', 0, 0, r * 2.2, tilt + pathAngle);
    if (knifeShieldGuarded(chain, piece)) {
      ctx.save();
      ctx.shadowColor = '#94ecff';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#c2f6ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, -2.3, 0.8);
      ctx.stroke();
      ctx.restore();
    }
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
    const open = pose.state === 'telegraph' ? 1.13 : pose.state === 'strike' ? 1.21 : 1;
    const wobble = pose.state === 'hurt' ? Math.sin(time * 35) * .11 : Math.sin(time * 5) * .025;
    ctx.rotate(wobble);
    if (pose.state === 'hurt') ctx.filter = 'brightness(1.6)';
    ctx.drawImage(mobileSprite(image, 192), -r * 1.6 * open, -r * 1.6 * open,
      r * 3.2 * open, r * 3.2 * open);
    if (chain.shielded) {
      ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, TAU);
      ctx.strokeStyle = '#8af7ff'; ctx.lineWidth = 4; ctx.stroke();
    }
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
  if (head) ctx.rotate(profile.id === 'meme-screech-cat'
    ? Math.max(-0.38, Math.min(0.38, pose.angle)) : pose.angle);
  if (head && (pose.state === 'telegraph' || pose.phase === 2)) {
    ctx.shadowColor = colors.glow; ctx.shadowBlur = pose.state === 'telegraph' ? 27 : 13;
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
    polygon(ctx, [[-jaw, r * .47], [0, r * (pose.state === 'strike' ? 1.02 : .77)],
      [jaw, r * .47], [0, r * .56]], colors.shadow, 2.5);
    if (pose.state === 'telegraph') {
      ellipse(ctx, 0, -r * .55, 5 + Math.sin(time * 18) * 1.5, 5,
        colors.glow, null);
    }
    if (chain.shielded) {
      ctx.beginPath(); ctx.arc(0, 0, r + 8 + Math.sin(time * 5) * 1.5, 0, TAU);
      ctx.strokeStyle = '#a4f5ff'; ctx.lineWidth = 4;
      ctx.shadowColor = '#6cdeff'; ctx.shadowBlur = 13; ctx.stroke();
    }
  }
  ctx.restore();
}
