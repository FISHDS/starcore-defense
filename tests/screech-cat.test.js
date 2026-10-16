import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, createBossShowcase, startRun } from '../dist/src/game.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';

function enterCat(seed = 71) {
  const game = startRun(seed, {}, 2);
  game.encounter = 'boss';
  game.wave = 6;
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

test('破音貓先標出安全位置，再讓聲浪從上方通過其他區域', () => {
  const game = enterCat();
  while (!game.boss.rig.telegraphLocked && game.phase === 'playing') advance(game, 0.05);
  assert.ok([80, 195, 310].includes(game.boss.rig.safeX));
  assert.ok(game.boss.rig.telegraphFor > 0);
  assert.ok(game.audioCues.includes('inhale'));
  const safeX = game.boss.rig.safeX;
  while (!game.enemyBullets.some(shot => shot.kind === 'sonicWave')
    && game.phase === 'playing') advance(game, 0.05, safeX);
  const waves = game.enemyBullets.filter(shot => shot.kind === 'sonicWave');
  assert.ok(waves.length >= 3);
  assert.ok(waves.every(shot => Math.abs(shot.x - safeX) > shot.radius + 15));
  assert.equal(game.boss.rig.attackCount, 1);
  assert.ok(game.audioCues.includes('screech'));
});

test('半血後聲浪改為更快節奏，並輪到中央安全位置', () => {
  const game = enterCat(72);
  const boss = game.boss;
  boss.segments = boss.segments.slice(0, 20);
  advance(game, 0.05);
  assert.equal(boss.rig.phase, 2);
  const before = game.bossShotTimer;
  while (!boss.rig.telegraphLocked && game.phase === 'playing') advance(game, 0.05);
  assert.ok(game.bossShotTimer - before < 2.8);
  boss.rig.attackCount = 2;
  boss.rig.telegraphLocked = false;
  game.bossShotTimer = 2.0;
  advance(game, 0.05);
  assert.equal(boss.rig.safeX, 195);
});

test('破音貓可由快速體驗直接試打，身上仍有可打開的寶箱', () => {
  const game = createBossShowcase(73, 2);
  assert.equal(game.preview, true);
  assert.equal(game.bosses.length, 1);
  assert.equal(game.boss.rig.profileId, 'meme-screech-cat');
  assert.ok(game.boss.segments.filter(piece => piece.chest).length >= 2);
});
