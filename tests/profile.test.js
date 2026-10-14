import test from 'node:test';
import assert from 'node:assert/strict';
import { startRun, advance } from '../dist/src/game.js';
import { awardRun, buyResearch, readProfile, saveCheckpoint, loadCheckpoint } from '../dist/src/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
}

test('研究點只由結算取得，無課金或廣告欄位', () => {
  const storage = memoryStorage();
  const game = startRun(21);
  game.wave = 3;
  game.score = 960;
  const result = awardRun(storage, game);
  assert.ok(result.gained > 0);
  assert.equal(readProfile(storage).dna, result.gained);
  assert.deepEqual(Object.keys(readProfile(storage)).sort(), ['dna', 'fire', 'guard', 'scavenge']);
});

test('可用研究點購買永久火力、耐久與寶箱能力', () => {
  const storage = memoryStorage();
  const game = startRun(22);
  game.wave = 6;
  game.score = 3000;
  awardRun(storage, game);
  assert.equal(buyResearch(storage, 'fire').success, true);
  assert.equal(buyResearch(storage, 'guard').success, true);
  assert.equal(buyResearch(storage, 'scavenge').success, false);
  const profile = readProfile(storage);
  const run = startRun(23, profile);
  assert.ok(run.baseDamage > 20);
  assert.ok(run.maxCore > 100);
  advance(run, 6.1);
  assert.ok(run.chest);
});

test('未有足夠研究點不能提升，續玩保留開局的永久能力', () => {
  const storage = memoryStorage();
  assert.equal(buyResearch(storage, 'fire').success, false);
  const run = startRun(24, { dna: 0, fire: 2, guard: 1, scavenge: 1 });
  saveCheckpoint(storage, run);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.baseDamage, run.baseDamage);
  assert.equal(restored.maxCore, run.maxCore);
  assert.equal(restored.chestMaxHp, run.chestMaxHp);
});
