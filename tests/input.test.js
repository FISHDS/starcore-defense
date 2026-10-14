import test from 'node:test';
import assert from 'node:assert/strict';
import { pointerToWorldX } from '../dist/src/input.js';

test('不同手機寬度的觸控位置都能對應到遊戲左右邊界', () => {
  const rect = { left: 20, width: 300 };
  assert.equal(pointerToWorldX(20, rect), 26);
  assert.equal(pointerToWorldX(170, rect), 195);
  assert.equal(pointerToWorldX(320, rect), 364);
});
