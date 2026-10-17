import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advance, CHAPTERS, createBossShowcase, startRun } from '../dist/src/game.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';
import { routeLength, routePosition } from '../dist/src/routes.js';

test('第六關轉圈載入獸沿環圈路線繞過畫面後才收束', () => {
  const stage = CHAPTERS[5];
  const game = createBossShowcase(996, 6);
  assert.equal(bossProfileFor(6, 0).id, 'meme-loading-99');
  assert.equal(stage.positionMode, 'center');
  assert.equal(game.boss.path, 'center-boss-route-5');
  assert.ok(routeLength(game.boss.path, true) > 1800);
  const length = routeLength(game.boss.path, true, 0);
  const points = Array.from({ length: 101 }, (_, index) =>
    routePosition(game.boss.path, true, 0, length * index / 100));
  assert.ok(points.some(point => point.x < 70) && points.some(point => point.x > 320));
  assert.equal(game.bosses.length, 1);
});

test('頭目會直接受傷，沒有掃描彈或護罩', () => {
  const game = startRun(997, {}, 6);
  game.encounter = 'boss';
  for (let step = 0; step < 160; step++) advance(game, 0.05);
  assert.equal(game.enemyBullets.length, 0);
  assert.ok(game.bosses.every(boss => !('shielded' in boss)
    && !('telegraphFor' in boss.rig)));
});

test('快速試打仍可查看載入獸的專屬外型素材', () => {
  const game = createBossShowcase(996, 6);
  assert.equal(game.preview, true);
  assert.equal(game.boss.rig.profileId, 'meme-loading-99');
  assert.ok(game.boss.segments.some(piece => piece.chest));
  const profile = bossProfileFor(6, 0);
  const atlas = readFileSync(new URL('../dist/assets/bosses/loading-99-atlas.svg', import.meta.url), 'utf8');
  assert.equal(profile.parts.head, 'loading-99-atlas.svg');
  for (const id of ['head-art', 'ring-seg', 'bar-seg', 'error-seg', 'chest']) {
    assert.match(atlas, new RegExp(`id="${id}"`));
  }
});
