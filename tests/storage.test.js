import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, startRun } from '../dist/src/game.js';
import { saveCheckpoint, loadCheckpoint, updateBest, readBest } from '../dist/src/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
}

test('長局戰鬥可從進行中的區域續玩', () => {
  const storage = memoryStorage();
  const game = startRun(31);
  game.wave = 3;
  game.waveTime = 11;
  game.runTime = 107;
  game.core = 63;
  game.score = 140;
  game.upgrades = { rapid: 2, shield: 1 };
  saveCheckpoint(storage, game);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.wave, 3);
  assert.equal(restored.runTime, 107);
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

test('舊版波次存檔不會混入新版連續戰鬥', () => {
  const storage = memoryStorage();
  storage.setItem('starcore.checkpoint.v1', JSON.stringify({ version: 1, wave: 4 }));
  assert.equal(loadCheckpoint(storage), null);
});

test('續玩保留選擇的關卡與當時長鏈的剩餘身體', () => {
  const storage = memoryStorage();
  const game = startRun(48, {}, 3);
  game.runTime = 70;
  advance(game, 0.05);
  const original = game.chains[0];
  original.segments.splice(12, 1);
  original.segments.forEach((segment, index) => { segment.index = index; });
  const count = original.segments.length;
  saveCheckpoint(storage, game);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.chapter, 3);
  assert.equal(restored.chains[0].segments.length, count);
  assert.equal(restored.chains[0].travel, original.travel);
  assert.equal(restored.nextSpawnAt, game.nextSpawnAt);
});
