import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, getRunProgress, hitSegment, startRun } from '../dist/src/game.js';

function enterBoss(chapter = 1) {
  const game = startRun(41, {}, chapter);
  game.encounter = 'boss';
  game.spawnCount = 0;
  advance(game, 0.05);
  return game;
}

test('第一關只有一隻我的刀盾，擊破後可結算勝利', () => {
  assert.ok([1, 2, 3, 5].every(id => CHAPTERS[id - 1].bossCount === 1));
  const game = enterBoss();
  assert.equal(game.bosses.length, 1);
  assert.equal(game.boss.rig.profileId, 'meme-knife-shield');
  game.bossDestroyed = game.boss.originalBodyCount;
  assert.ok(getRunProgress(game) > 0.19);
  game.boss.dead = true;
  advance(game, 0.05);
  assert.equal(game.phase, 'victory');
});

test('刀盾外型的頭目沒有會阻擋傷害的護盾，也不會發射斬擊', () => {
  const game = enterBoss();
  const boss = game.boss;
  const piece = boss.segments.find(segment => segment.index > 0
    && !segment.chest && !segment.weakpoint && !segment.armorHp);
  assert.ok(piece);
  const before = piece.hp;
  hitSegment(game, boss, piece, 200);
  assert.equal(piece.hp, before - 200);
  for (let step = 0; step < 100; step++) advance(game, 0.05);
  assert.equal('enemyBullets' in game, false);
  assert.equal('shielded' in boss, false);
});
