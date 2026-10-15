import test from 'node:test';
import assert from 'node:assert/strict';
import { effectVisualProgress } from '../dist/src/render.js';

test('最後一隻魔王倒下後，死亡特效按畫面時間播完', () => {
  const effect = { kind: 'bossDeath', life: 0.75, maxLife: 0.8 };
  assert.equal(effectVisualProgress(effect, 10), 1);
  assert.ok(effectVisualProgress(effect, 10.4) > 0.49);
  assert.equal(effectVisualProgress(effect, 10.8), 0);
});
