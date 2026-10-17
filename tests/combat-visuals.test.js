import test from 'node:test';
import assert from 'node:assert/strict';
import { addBlastEffect, startRun } from '../dist/src/game.js';

test('同一區域連續觸發震盪彈只保留一個清楚的波紋提示', () => {
  const game = startRun(81);
  for (let hit = 0; hit < 20; hit++) addBlastEffect(game, 195 + hit % 2, 420, 3);

  const blasts = game.effects.filter(effect => effect.kind === 'blast');
  assert.equal(blasts.length, 1);
  assert.equal(blasts[0].radius, 73);
  assert.ok(blasts[0].life <= 0.24);
});
