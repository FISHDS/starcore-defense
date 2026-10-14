import test from 'node:test';
import assert from 'node:assert/strict';
import { startRun } from '../dist/src/game.js';
import { saveCheckpoint, loadCheckpoint, updateBest, readBest } from '../dist/src/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
}

test('波次結束後的存檔可從該波開頭繼續', () => {
  const storage = memoryStorage();
  const game = startRun(31);
  game.wave = 3;
  game.waveTime = 11;
  game.core = 63;
  game.score = 140;
  game.upgrades = { rapid: 2, shield: 1 };
  saveCheckpoint(storage, game);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.wave, 3);
  assert.equal(restored.waveTime, 0);
  assert.equal(restored.core, 63);
  assert.equal(restored.score, 140);
  assert.deepEqual(restored.upgrades, { rapid: 2, shield: 1 });
  assert.equal(restored.chains.length, 0);
});

test('最佳成績只會提高，不會被較低成績覆蓋', () => {
  const storage = memoryStorage();
  updateBest(storage, 200);
  updateBest(storage, 50);
  assert.equal(readBest(storage), 200);
});
