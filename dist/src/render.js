import { WIDTH, HEIGHT } from './game.js?v=20261016-boss-evolution';
import { routePosition } from './routes.js?v=20261015-pressure-art-audio';
import { drawBiome, drawChestFocus, drawConnector, drawGuardian,
  drawProjectile, drawSegment } from './art.js?v=20261016-boss-evolution';
import { BOSS_PROFILES, bossProfileFor } from './boss-profiles.js';
import { resolveBossPose } from './boss-rig.js';
import { drawBossConnector, drawBossSegment } from './boss-art.js';

const TAU = Math.PI * 2;
const BACKGROUND_TONES = [
  ['#243d47', '#243b4d', '#1b2b3b'],
  ['#383451', '#302e54', '#202743'],
  ['#4d3b38', '#40394b', '#272c3f'],
  ['#4a3142', '#35334e', '#252941'],
  ['#2c3a53', '#28334d', '#19293c'],
  ['#472c43', '#332c4b', '#222739'],
];
function compact(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(Math.ceil(value));
}

// 只留下能辨認的戰場資訊；寶箱與數字不共用同一塊畫面。
export function visibleChests(chains) {
  return chains.filter(chain => !chain.dead).flatMap(chain => chain.segments)
    .filter(piece => piece.chest && piece.hp > 0 && piece.y >= 55 && piece.y <= 700
      && piece.x >= 20 && piece.x <= WIDTH - 20)
    .sort((a, b) => b.y - a.y);
}

export function selectHealthLabels(chains) {
  const chests = visibleChests(chains);
  const candidates = chains.filter(chain => !chain.dead).flatMap(chain => chain.segments)
    .filter(piece => piece.index > 0 && !piece.chest && piece.hp > 0
      && piece.y >= 35 && piece.y <= 710 && piece.x >= 20
      && piece.x <= WIDTH - 20 && piece.index % 6 === 2)
    .sort((a, b) => b.y - a.y);
  const selected = [];
  for (const piece of candidates) {
    if (chests.some(chest => Math.hypot(chest.x - piece.x, chest.y - piece.y) < 48)) continue;
    if (selected.some(label => Math.abs(label.x - piece.x) < 50
      && Math.abs(label.y - piece.y) < 28)) continue;
    selected.push(piece);
    if (selected.length === 10) break;
  }
  return selected;
}

export function selectDamagePopups(popups, chests) {
  const selected = [];
  for (let index = popups.length - 1; index >= 0; index--) {
    const popup = popups[index];
    if (popup.life <= 0 || chests.some(chest =>
      Math.hypot(chest.x - popup.x, chest.y - popup.y) < 48)) continue;
    if (selected.some(item => Math.abs(item.x - popup.x) < 34
      && Math.abs(item.y - popup.y) < 24)) continue;
    selected.push(popup);
    if (selected.length === 12) break;
  }
  return selected;
}
const PALETTES = {
  mint: { body: '#62d8ba', edge: '#177e80', light: '#c2fff0', shadow: '#286e78', head: '#f58e81' },
  violet: { body: '#ab87e9', edge: '#51418e', light: '#e8d3ff', shadow: '#674eac', head: '#f478ad' },
  amber: { body: '#e9b568', edge: '#9b5f44', light: '#ffe4a7', shadow: '#b9794f', head: '#f18569' },
  coral: { body: '#f28d9b', edge: '#a34a75', light: '#ffd3d3', shadow: '#b3577e', head: '#f9ae62' },
};

function circle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function background(ctx, time, wave = 1) {
  const tones = BACKGROUND_TONES[Math.max(0, Math.min(5, wave - 1))];
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, tones[0]);
  gradient.addColorStop(0.68, tones[1]);
  gradient.addColorStop(1, tones[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(166,192,216,.07)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 11; row++) {
    const y = 82 + row * 67;
    ctx.beginPath();
    ctx.moveTo((row * 53) % 105 - 30, y);
    ctx.lineTo(Math.min(WIDTH, (row * 53) % 105 + 94), y);
    ctx.stroke();
  }
  for (let i = 0; i < 31; i++) {
    const x = (i * 133 + 17) % WIDTH;
    const y = (i * 229 + 105) % 690;
    circle(ctx, x, y, i % 6 === 0 ? 3 : 1.4, 'rgba(148,178,194,.16)');
  }
  ctx.strokeStyle = 'rgba(102,133,160,.23)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 530);
  ctx.lineTo(102, 530);
  ctx.lineTo(112, 535);
  ctx.lineTo(WIDTH, 535);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(250, 355);
  ctx.lineTo(309, 355);
  ctx.lineTo(320, 346);
  ctx.lineTo(WIDTH, 346);
  ctx.stroke();

  const dust = 0.2 + 0.12 * Math.sin(time * 0.7);
  circle(ctx, 335, 420, 3, `rgba(182,209,210,${dust})`);
}

function rail(ctx, core, time) {
  ctx.fillStyle = '#17253b';
  ctx.fillRect(0, 741, WIDTH, HEIGHT - 741);
  ctx.fillStyle = '#53617a';
  ctx.fillRect(0, 738, WIDTH, 4);
  ctx.fillStyle = '#111b2c';
  ctx.fillRect(0, 748, WIDTH, 8);
  ctx.strokeStyle = '#71849a';
  ctx.lineWidth = 1.5;
  for (let x = -10; x < WIDTH + 12; x += 13) {
    ctx.beginPath();
    ctx.moveTo(x, 741);
    ctx.lineTo(x + 8, 748);
    ctx.stroke();
    circle(ctx, x + 5, 754, 1.3, '#8da0ad');
  }
  ctx.fillStyle = core < 30 ? '#fa777a' : '#69dfc6';
  ctx.fillRect(0, 734, WIDTH * core / 100, 4);
  if (core < 35) {
    ctx.fillStyle = `rgba(255,94,110,${0.08 + 0.05 * Math.sin(time * 7)})`;
    ctx.fillRect(0, 710, WIDTH, 80);
  }
}

function guardian(ctx, x, y, time, invulnerable = 0) {
  ctx.save();
  ctx.translate(x, y - 3 + Math.sin(time * 5) * 2);
  if (invulnerable > 0 && Math.floor(time * 12) % 2) ctx.globalAlpha = 0.45;
  ctx.shadowColor = '#9df2e4';
  ctx.shadowBlur = 16;
  circle(ctx, 0, 0, 19, '#74d9d2');
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#dcfff3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0.35, Math.PI * 1.72);
  ctx.stroke();
  circle(ctx, -6, 0, 3, '#102b42');
  circle(ctx, 6, 0, 3, '#102b42');
  ctx.strokeStyle = '#14415b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 3, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#f9c385';
  ctx.beginPath();
  ctx.moveTo(13, -15);
  ctx.lineTo(27, -27);
  ctx.lineTo(29, -21);
  ctx.lineTo(17, -10);
  ctx.closePath();
  ctx.fill();
  circle(ctx, 28, -26, 5, '#85f5f3');
  ctx.restore();
}

function segment(ctx, piece, chain, time) {
  if (piece.hp <= 0 || piece.y < -35 || piece.y > HEIGHT + 30
    || piece.x < -35 || piece.x > WIDTH + 35) return;
  const p = PALETTES[chain.tint] || PALETTES.violet;
  const head = piece.index === 0;
  const r = piece.radius;
  ctx.save();
  ctx.translate(piece.x, piece.y);
  const wiggle = Math.sin(time * 5 + piece.index * 0.8) * 1.4;
  ctx.translate(0, wiggle);
  ctx.strokeStyle = p.edge;
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.6, -r * 0.7);
    ctx.lineTo(side * (r + 6), -r * 0.95);
    ctx.lineTo(side * (r + 8), -r * 0.2);
    ctx.stroke();
  }
  circle(ctx, 2, 3, r + 1, p.edge);
  if (piece.chest) {
    ctx.shadowColor = piece.gold ? '#ffd668' : '#a3edff';
    ctx.shadowBlur = 20 + Math.sin(time * 5) * 5;
  }
  circle(ctx, 0, 0, r - 2, head ? p.head : p.body);
  ctx.shadowBlur = 0;
  ctx.fillStyle = p.light;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.ellipse(-5, -7, r * 0.48, r * 0.25, -0.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (head) {
    ctx.strokeStyle = '#7c374f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, -r + 5);
    ctx.lineTo(-16, -r - 10);
    ctx.moveTo(12, -r + 5);
    ctx.lineTo(16, -r - 10);
    ctx.stroke();
    circle(ctx, -16, -r - 11, 4, '#ffcb83');
    circle(ctx, 16, -r - 11, 4, '#ffcb83');
    circle(ctx, -7, -3, 3.5, '#432b4b');
    circle(ctx, 7, -3, 3.5, '#432b4b');
    circle(ctx, 0, -12, 5, '#fff0a8');
    circle(ctx, 0, -12, 2.5, '#ff696e');
  } else if (piece.chest) {
    ctx.fillStyle = piece.gold ? '#f5bc53' : '#a0ddeb';
    ctx.strokeStyle = '#283b51';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-10, -13, 20, 17, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = piece.gold ? '#ffe799' : '#d6f7ff';
    ctx.fillRect(-10, -15, 20, 5);
    ctx.fillStyle = '#506481';
    ctx.fillRect(-2, -14, 4, 18);
  } else {
    ctx.strokeStyle = p.shadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 1, r * 0.58, -0.4, Math.PI + 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function chain(ctx, item, time, zone = 0) {
  if (item.dead) return;
  const profile = item.boss ? bossProfileFor(zone * 5 + 1, item.lane) : null;
  const pose = profile ? resolveBossPose(item, profile, time) : null;
  if (item.rig?.telegraphFor > 0 && item.segments[0].y > 70) {
    const source = item.segments[0];
    ctx.save();
    ctx.setLineDash([9, 8]);
    ctx.strokeStyle = profile.colors.glow;
    ctx.lineWidth = 3 + Math.sin(time * 22) * .8;
    for (const spread of [-40, 40]) {
      const landingX = (item.rig.targetX ?? source.x) + spread;
      ctx.beginPath(); ctx.moveTo(source.x, source.y + 22);
      ctx.lineTo(landingX, 740); ctx.stroke();
      ctx.fillStyle = `${profile.colors.glow}55`;
      ctx.fillRect(landingX - 13, 724, 26, 20);
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
  for (let i = item.segments.length - 1; i > 0; i--) {
    const a = item.segments[i];
    const b = item.segments[i - 1];
    if (a.hp <= 0 || b.hp <= 0 || a.y < -20 || b.y < -20
      || (a.x < -35 && b.x < -35) || (a.x > WIDTH + 35 && b.x > WIDTH + 35)) continue;
    if (profile) drawBossConnector(ctx, { from: a, to: b, profile, pose, index: i });
    else drawConnector(ctx, { from: a, to: b, zone, boss: item.boss,
      lane: item.lane, shielded: item.shielded, time });
  }
  for (let i = item.segments.length - 1; i >= 0; i--) {
    if (!item.segments[i].chest) {
      if (profile) drawBossSegment(ctx, { piece: item.segments[i], chain: item,
        time, profile, pose });
      else drawSegment(ctx, { piece: item.segments[i], chain: item, time, zone });
    }
  }
  // 寶箱疊在相鄰甲片上方，瞄準時不會被長鏈遮住。
  for (let i = item.segments.length - 1; i >= 0; i--) {
    if (item.segments[i].chest)
      drawSegment(ctx, { piece: item.segments[i], chain: item, time, zone });
  }
}

export function effectVisualProgress(effect, time) {
  if (effect.kind !== 'bossDeath') return effect.life / effect.maxLife;
  effect.visualStartAt ??= time;
  return Math.max(0, 1 - (time - effect.visualStartAt) / effect.maxLife);
}

function drawEffect(ctx, effect, time) {
  const progress = effectVisualProgress(effect, time);
  if (progress <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, progress * 2);
  if (effect.kind === 'bossDeath') {
    const profile = BOSS_PROFILES.find(item => item.id === effect.profileId);
    const color = profile?.colors.glow || '#fff0a8';
    const spread = (1 - progress) * 44;
    if (profile) {
      ctx.save();
      ctx.translate(effect.x, effect.y + (1 - progress) * 15);
      ctx.scale(Math.max(0.05, progress), Math.max(0.05, progress));
      ctx.translate(-effect.x, -effect.y);
      drawBossSegment(ctx, {
        piece: { index: 0, x: effect.x, y: effect.y, hp: 1, radius: 27 },
        chain: {}, profile, time: 0,
        pose: { head: { x: effect.x, y: effect.y, scale: profile.anatomy.headScale },
          angle: 0, phase: 1, state: 'dying',
          antenna: [-1, 1].map(side => ({ side, length: profile.anatomy.hornLength, bend: 0 })),
          jaw: profile.anatomy.jawWidth },
      });
      ctx.restore();
    }
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    for (let piece = 0; piece < 8; piece++) {
      const angle = piece * TAU / 8;
      const x = effect.x + Math.cos(angle) * spread;
      const y = effect.y + Math.sin(angle) * spread;
      ctx.beginPath();
      ctx.moveTo(x, y - 7 * progress);
      ctx.lineTo(x + 6 * progress, y + 4 * progress);
      ctx.lineTo(x - 5 * progress, y + 3 * progress);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(effect.x, effect.y, 14 + spread, 0, TAU); ctx.stroke();
  } else if (effect.kind === 'orbit') {
    ctx.strokeStyle = '#ffc76d';
    ctx.shadowColor = '#ffab4e';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (0.72 + 0.28 * progress), 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff5bc';
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (0.72 + 0.28 * progress), 0, TAU);
    ctx.stroke();
  } else if (effect.kind === 'arc') {
    ctx.strokeStyle = '#92f9ff';
    ctx.shadowColor = '#65eeff';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 4;
    const midX = (effect.x + effect.x2) / 2 + 10;
    const midY = (effect.y + effect.y2) / 2 - 13;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(midX, midY);
    ctx.lineTo(effect.x2, effect.y2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = effect.kind === 'breach' ? '#ff747e' : effect.kind === 'blast' ? '#ffca7e' : '#d6fff5';
    ctx.lineWidth = effect.kind === 'hit' ? 2 : 5;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, (1 - progress) * (effect.kind === 'breach' ? 110 : 35) + 5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function healthNumbers(ctx, labels) {
  ctx.save();
  ctx.font = '900 12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const piece of labels) {
    const value = compact(piece.hp);
    const width = Math.max(27, ctx.measureText(value).width + 10);
    ctx.fillStyle = 'rgba(13,29,47,.80)';
    ctx.fillRect(piece.x - width / 2, piece.y - 7, width, 17);
    ctx.fillStyle = '#f4fdff';
    ctx.fillText(value, piece.x, piece.y + 2);
  }
  ctx.restore();
}

function damageNumbers(ctx, popups) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const popup of popups) {
    ctx.globalAlpha = Math.min(1, popup.life * 2.5);
    ctx.font = `900 ${popup.weak ? 22 : 15}px system-ui`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#28304a';
    ctx.strokeText(compact(popup.value), popup.x, popup.y);
    ctx.fillStyle = popup.weak ? '#ffde80' : '#fff5f2';
    ctx.fillText(compact(popup.value), popup.x, popup.y);
  }
  ctx.restore();
}

function chestHighlights(ctx, chests, time) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let index = 0; index < chests.length; index++) {
    const chest = chests[index];
    drawChestFocus(ctx, { x: chest.x, y: chest.y, gold: chest.gold,
      time, hpRatio: chest.hp / chest.maxHp });
  }
  ctx.restore();
}

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const zone = game ? Math.min(4, Math.floor((game.chapter === 26
    ? 20 + (game.endlessTier - 1) % 5 : game.chapter - 1) / 5)) : 0;
  drawBiome(ctx, { zone, time, width: WIDTH, height: HEIGHT });
  if (!game) {
    const preview = {
      tint: 'violet',
      segments: Array.from({ length: 68 }, (_, index) => {
        const position = routePosition('sine', false, 0, 750 - index * 29);
        return {
          x: position.x,
          y: position.y,
          hp: index ? Math.round(50 * (1 + (index / 25) ** 3)) : 1,
          maxHp: index ? Math.round(50 * (1 + (index / 25) ** 3)) : 1,
          chest: index === 5 || index === 15, gold: false, index, radius: index === 0 ? 23 : 18,
        };
      }),
    };
    chain(ctx, preview, time, zone);
    healthNumbers(ctx, selectHealthLabels([preview]));
    chestHighlights(ctx, visibleChests([preview]), time);
    rail(ctx, 100, time);
    drawGuardian(ctx, { x: WIDTH / 2, y: 744, time });
    return;
  }
  const chests = visibleChests(game.chains);
  for (const hazard of game.hazards || []) {
    ctx.save();
    ctx.fillStyle = hazard.phase === 'warning' ? 'rgba(255,216,119,.16)'
      : 'rgba(255,104,110,.38)';
    ctx.fillRect(hazard.x - 38, 100, 76, 650);
    ctx.strokeStyle = hazard.phase === 'warning' ? '#ffe18a' : '#ff696f';
    ctx.lineWidth = hazard.phase === 'warning' ? 2 : 8;
    ctx.setLineDash(hazard.phase === 'warning' ? [8, 9] : []);
    ctx.beginPath(); ctx.moveTo(hazard.x, 90); ctx.lineTo(hazard.x, 748); ctx.stroke();
    ctx.restore();
  }
  for (const item of game.chains) chain(ctx, item, time, zone);
  for (const bullet of game.bullets) {
    drawProjectile(ctx, { x: bullet.x, y: bullet.y, time });
  }
  for (const bullet of game.enemyBullets) {
    drawProjectile(ctx, { x: bullet.x, y: bullet.y, time, enemy: true });
  }
  for (const effect of game.effects) drawEffect(ctx, effect, time);
  for (const pickup of game.pickups || []) {
    if (pickup.y < -15 || pickup.y > 790) continue;
    const shield = pickup.kind === 'shield';
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.shadowColor = shield ? '#9af7d6' : '#ffd36d';
    ctx.shadowBlur = 14;
    ctx.fillStyle = shield ? '#8ce9cf' : '#ffcc64';
    ctx.strokeStyle = '#15344b';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(9, 0);
    ctx.lineTo(0, 10); ctx.lineTo(-9, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#15344b';
    ctx.font = '900 12px system-ui'; ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; ctx.fillText(shield ? '+' : 'ϟ', 0, 1);
    ctx.restore();
  }
  healthNumbers(ctx, selectHealthLabels(game.chains));
  damageNumbers(ctx, selectDamagePopups(game.popups, chests));
  if (game.comboCount >= 3 && game.comboTimer > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 20px system-ui';
    ctx.strokeStyle = '#193348'; ctx.lineWidth = 5;
    ctx.strokeText(`${game.comboCount} 連擊`, WIDTH / 2, 157);
    ctx.fillStyle = '#ffe29b';
    ctx.fillText(`${game.comboCount} 連擊`, WIDTH / 2, 157);
    ctx.restore();
  }
  rail(ctx, game.core / game.maxCore * 100, time);
  chestHighlights(ctx, chests, time);
  if (game.chargeFor > 0) {
    ctx.save(); ctx.strokeStyle = '#ffde79'; ctx.lineWidth = 3;
    ctx.shadowColor = '#ffcf6e'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(game.player.x, game.player.y - 11, 38, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  drawGuardian(ctx, { x: game.player.x, y: game.player.y, time,
    invulnerable: game.invulnerable });
}
