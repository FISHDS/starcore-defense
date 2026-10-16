import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';
import { lastShiftPartForIndex } from '../dist/src/boss-art.js';
import { bossVolleyFor } from '../dist/src/boss-attacks.js';

function enterBoss(chapter, seed = chapter) {
  const game = startRun(seed, {}, chapter);
  game.encounter = 'boss';
  advance(game, 0.05);
  // 招式測試在底線場地執行；正式中央關卡另有不攻擊測試。
  game.chapter = chapter === 15 ? 21 : 1;
  game.player.aimAngle = Math.PI / 2;
  game.bullets = [];
  game.enemyBullets = [];
  return game;
}

function triggerAttack(game, interval) {
  game.bossShotTimer = interval;
  advance(game, 0.05);
  return game.enemyBullets;
}

test('甲殼型頭目用三向扇形彈迫使玩家轉向攔截', () => {
  const game = enterBoss(4);
  assert.ok(game.bosses[0].segments.some(piece => piece.armorHp > 0
    && piece.weakpoint), '甲殼弱點必須沿長鏈出現');
  const shots = triggerAttack(game, 3.1);
  assert.equal(shots.length, 3);
  const towardPlayer = Math.atan2(game.player.y - game.boss.segments[0].y,
    game.player.x - game.boss.segments[0].x);
  assert.ok(shots.every(shot => Math.cos(Math.atan2(shot.vy, shot.vx)
    - towardPlayer) > 0), '每發彈都朝玩家所在方向');
  assert.equal(new Set(shots.map(shot => Math.round(shot.vx / shot.vy * 100))).size, 3);
});

test('護衛型雙頭目各自瞄準固定核心，玩家需轉向攔截', () => {
  const game = enterBoss(9);
  game.bullets = [];
  const shots = triggerAttack(game, 3.1);
  const expected = game.bosses.reduce((count, boss) => count
    + bossVolleyFor(boss.rig.attackStyle, { x: 0, y: 0 }, 0).length, 0);
  assert.equal(shots.length, expected);
  assert.ok(shots.every(shot => shot.radius >= 8));
  for (const shot of shots) {
    const dx = game.player.x - shot.x;
    const dy = game.player.y - shot.y;
    assert.ok((shot.vx * dx + shot.vy * dy) > 0,
      '飛彈方向應朝固定核心');
  }
});

test('輪替型雙頭目分次出手，核心位置不變且兩側輪流攻擊', () => {
  const game = enterBoss(15);
  game.bullets = [];
  game.fireTimer = -10000;
  const fixedPlayer = { x: game.player.x, y: game.player.y };
  const first = triggerAttack(game, 2.2);
  assert.equal(first.length, bossVolleyFor(game.bosses[0].rig.attackStyle,
    { x: 0, y: 0 }, 0).length);
  const firstSource = first[0].x;
  const firstTarget = game.bosses.map((boss, index) => ({ index,
    distance: Math.abs(boss.segments[0].x - firstSource) }))
    .sort((a, b) => a.distance - b.distance)[0].index;
  assert.equal(firstTarget, 0);

  game.enemyBullets = [];
  game.bullets = [];
  game.fireTimer = -10000;
  const second = triggerAttack(game, 2.2);
  assert.equal(second.length, bossVolleyFor(game.bosses[1].rig.attackStyle,
    { x: 0, y: 0 }, 0).length);
  const secondSource = second[0].x;
  const secondTarget = game.bosses.map((boss, index) => ({ index,
    distance: Math.abs(boss.segments[0].x - secondSource) }))
    .sort((a, b) => a.distance - b.distance)[0].index;
  assert.equal(secondTarget, 1);
  assert.deepEqual({ x: game.player.x, y: game.player.y }, fixedPlayer);
});

test('棺材舞領隊亮起抬棺手節時，打破弱點會中斷攻擊', () => {
  const game = enterBoss(5);
  const boss = game.bosses[0];
  const weakpoint = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
  game.bossShotTimer = 3.1 - 0.85;
  advance(game, 0.02);
  assert.equal(weakpoint.weakOpen, true);
  assert.ok(boss.rig.telegraphFor > 0);
  weakpoint.hp = 1;
  assert.equal(hitSegment(game, boss, weakpoint, 100), true);
  assert.equal(boss.rig.attackCancelled, true);
  game.enemyBullets = [];
  game.bossShotTimer = 3.1 - 0.01;
  advance(game, 0.02);
  assert.equal(game.enemyBullets.length, 0);
});

test('最後一班的身體重複呈現手套、棺材與舞鞋隊形', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, index) =>
    lastShiftPartForIndex(index + 1)), ['hand', 'coffin', 'shoe',
    'hand', 'coffin', 'shoe']);
});

test('最後一班交替射出單張斜向節拍牌，迫使玩家轉向攔截', () => {
  const game = enterBoss(5);
  const boss = game.bosses[0];
  game.bossShotTimer = 3.1 - 0.85;
  advance(game, 0.02);
  const firstDirection = boss.rig.attackDirection;
  const baseAngle = Math.atan2(game.player.y - boss.segments[0].y,
    game.player.x - boss.segments[0].x);
  assert.ok(Math.abs(Math.atan2(Math.sin(boss.rig.targetAngle - baseAngle
    - firstDirection * 0.48), Math.cos(boss.rig.targetAngle - baseAngle
      - firstDirection * 0.48))) < 0.02);
  game.bossShotTimer = 3.1 - 0.01;
  advance(game, 0.02);
  assert.equal(game.enemyBullets.length, 1);
  const firstAngle = Math.atan2(game.enemyBullets[0].vy, game.enemyBullets[0].vx);
  assert.ok(Math.abs(Math.atan2(Math.sin(firstAngle - boss.rig.targetAngle),
    Math.cos(firstAngle - boss.rig.targetAngle))) < 0.02);
  game.enemyBullets = [];
  game.bossShotTimer = 3.1 - 0.85;
  advance(game, 0.02);
  const secondDirection = boss.rig.attackDirection;
  game.bossShotTimer = 3.1 - 0.01;
  advance(game, 0.02);
  assert.equal(secondDirection, -firstDirection);
});
