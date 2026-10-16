import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, createBossShowcase, startRun } from '../dist/src/game.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';

function enterCat(seed = 71) {
  const game = startRun(seed, {}, 2);
  game.encounter = 'boss';
  game.wave = 6;
  game.fireTimer = -10000;
  advance(game, 0.05);
  return game;
}

test('第 2 關改由原創破音貓單頭守關，舊區域頭目映射仍有效', () => {
  assert.equal(CHAPTERS[1].bossCount, 1);
  assert.equal(bossProfileFor(2, 0).id, 'meme-screech-cat');
  assert.equal(bossProfileFor(1, 0).id, 'meme-knife-shield');
  const game = enterCat();
  assert.equal(game.bosses.length, 1);
  assert.equal(game.boss.rig.profileId, 'meme-screech-cat');
});

test('破音貓先蓄音預警，再朝固定角色射出可攔截扇形聲浪', () => {
  const game = enterCat();
  while (!game.boss.rig.telegraphLocked && game.phase === 'playing') advance(game, 0.05);
  assert.ok(game.boss.rig.telegraphFor > 0);
  assert.ok(game.audioCues.includes('inhale'));
  const fixed = { x: game.player.x, y: game.player.y };
  const lockedAngle = game.boss.rig.targetAngle;
  game.bullets = [];
  game.fireTimer = -10000;
  game.bossShotTimer = 3.12;
  advance(game, 0.05, { aimAngle: lockedAngle });
  const waves = game.enemyBullets.filter(shot => shot.kind === 'sonicWave');
  assert.ok(waves.length >= 3);
  assert.ok(waves.every(shot => Math.cos(Math.atan2(shot.vy, shot.vx)
    - lockedAngle) > 0.97));
  assert.equal(game.boss.rig.attackCount, 1);
  assert.ok(game.audioCues.includes('screech'));
  assert.deepEqual({ x: game.player.x, y: game.player.y }, fixed);
});

test('半血後破音貓縮短蓄音間隔並提高聲浪傷害', () => {
  const game = enterCat(72);
  const boss = game.boss;
  boss.segments = boss.segments.slice(0, 20);
  advance(game, 0.05);
  assert.equal(boss.rig.phase, 2);
  const before = game.bossShotTimer;
  while (!boss.rig.telegraphLocked && game.phase === 'playing') advance(game, 0.05);
  const locked = { x: boss.rig.targetX, y: boss.rig.targetY };
  assert.ok(locked.x === game.player.x && locked.y === game.player.y);
  game.bullets = [];
  game.fireTimer = -10000;
  game.bossShotTimer = 2.41;
  advance(game, 0.05);
  const wave = game.enemyBullets.find(shot => shot.kind === 'sonicWave');
  assert.ok(wave);
  assert.equal(wave.damage, 32);
  assert.ok(game.bossShotTimer < 0.1, `新攻擊間隔應小於 2.8 秒，計時器 ${game.bossShotTimer}`);
});

test('破音貓可由快速體驗直接試打，身上仍有可打開的寶箱', () => {
  const game = createBossShowcase(73, 2);
  assert.equal(game.preview, true);
  assert.equal(game.bosses.length, 1);
  assert.equal(game.boss.rig.profileId, 'meme-screech-cat');
  assert.ok(game.boss.segments.filter(piece => piece.chest).length >= 2);
});
