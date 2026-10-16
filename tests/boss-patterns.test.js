import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, startRun } from '../dist/src/game.js';

function enterBoss(chapter, seed = chapter) {
  const game = startRun(seed, {}, chapter);
  game.encounter = 'boss';
  advance(game, 0.05);
  game.enemyBullets = [];
  return game;
}

function triggerAttack(game, interval) {
  game.bossShotTimer = interval;
  advance(game, 0.05);
  return game.enemyBullets;
}

test('甲殼型頭目用三向扇形彈迫使玩家改變站位', () => {
  const game = enterBoss(4);
  const shots = triggerAttack(game, 3.1);
  assert.equal(shots.length, 3);
  assert.ok(shots.every(shot => shot.vy > 0));
  assert.equal(new Set(shots.map(shot => Math.round(shot.vx / shot.vy * 100))).size, 3);
});

test('護衛型雙頭目各自鎖定玩家，集中射擊留出彈幕空隙', () => {
  const game = enterBoss(9);
  const shots = triggerAttack(game, 2.7);
  assert.equal(shots.length, 2);
  assert.ok(shots.every(shot => shot.radius >= 8));
});

test('輪替型雙頭目分次出手，玩家有機會看清並避開另一側攻擊', () => {
  const game = enterBoss(15);
  const first = triggerAttack(game, 2.2);
  assert.equal(first.length, 2);
  const firstSource = first[0].x;
  const firstTarget = game.bosses.findIndex(boss =>
    Math.abs(boss.segments[0].x - firstSource) < 4);
  assert.equal(firstTarget, 0);

  game.enemyBullets = [];
  const second = triggerAttack(game, 2.2);
  assert.equal(second.length, 2);
  const secondSource = second[0].x;
  const secondTarget = game.bosses.findIndex(boss =>
    Math.abs(boss.segments[0].x - secondSource) < 4);
  assert.equal(secondTarget, 1);
});
