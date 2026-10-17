import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, createBossShowcase, startRun } from '../dist/src/game.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';

test('第二關破音貓是原創單頭目，快速試打可看到專屬頭部與寶箱', () => {
  assert.equal(CHAPTERS[1].bossCount, 1);
  assert.equal(bossProfileFor(2, 0).id, 'meme-screech-cat');
  const game = createBossShowcase(73, 2);
  assert.equal(game.preview, true);
  assert.equal(game.bosses.length, 1);
  assert.equal(game.boss.rig.profileId, 'meme-screech-cat');
  assert.ok(game.boss.segments.filter(piece => piece.chest).length >= 2);
});

test('破音貓以繞道與逐節受擊帶來挑戰，不對固定角色發射音波', () => {
  const game = startRun(74, {}, 2);
  game.encounter = 'boss';
  for (let step = 0; step < 120; step++) advance(game, 0.05);
  assert.equal(game.enemyBullets.length, 0);
  assert.equal(game.core, game.maxCore);
  assert.equal('telegraphFor' in game.boss.rig, false);
});
