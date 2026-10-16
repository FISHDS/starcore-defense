import test from 'node:test';
import assert from 'node:assert/strict';
import { pointerToAimAngle } from '../dist/src/input.js';

test('固定站位的觸控方向可轉成四個方向的瞄準角度', () => {
  const rect = { left: 0, top: 0, width: 390, height: 844 };
  const origin = { x: 195, y: 700 };
  const angleAt = (x, y) => pointerToAimAngle(x, y, rect, origin);
  assert.ok(Math.abs(angleAt(195, 100) + Math.PI / 2) < 0.001);
  assert.ok(Math.abs(angleAt(300, 700)) < 0.001);
  assert.ok(Math.abs(angleAt(195, 800) - Math.PI / 2) < 0.001);
  assert.ok(Math.abs(Math.abs(angleAt(90, 700)) - Math.PI) < 0.001);
});
