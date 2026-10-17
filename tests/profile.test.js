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
  assert.ok(!Object.keys(readProfile(storage)).some(key => /ad|purchase|payment/i.test(key)));
});

test('可用研究點購買永久傷害與寶箱能力', () => {
  const storage = memoryStorage();
  const game = startRun(22);
  game.wave = 6;
  game.score = 3000;
  awardRun(storage, game);
  assert.equal(buyResearch(storage, 'fire').success, true);
  assert.equal(buyResearch(storage, 'precision').success, true);
  assert.equal(buyResearch(storage, 'scavenge').success, false);
  const profile = readProfile(storage);
  const run = startRun(23, profile);
  assert.ok(run.baseDamage > 40);
  assert.ok(run.profileLevels.precision > 0);
  advance(run, 0.05);
  assert.ok(run.chains[0].segments.some(segment => segment.chest));
});

test('未有足夠研究點不能提升，續玩保留開局的永久能力', () => {
  const storage = memoryStorage();
  assert.equal(buyResearch(storage, 'fire').success, false);
  const run = startRun(24, { dna: 0, fire: 2, precision: 1, scavenge: 1 });
  saveCheckpoint(storage, run);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.baseDamage, run.baseDamage);
  assert.equal(restored.profileLevels.precision, run.profileLevels.precision);
  assert.equal(restored.chestMaxHp, run.chestMaxHp);
});

test('舊版韌性研究會轉成精準訓練，角色不再帶著耐久成長', () => {
  const storage = memoryStorage();
  storage.setItem('starcore.profile.v2', JSON.stringify({ dna: 0, guard: 3,
    organs: ['guard-membrane'], equippedOrgans: ['guard-membrane'] }));
  const profile = readProfile(storage);
  assert.equal(profile.precision, 3);
  assert.ok(profile.organs.includes('focus-lens'));
  const game = startRun(91, profile);
  assert.equal('core' in game, false);
  assert.equal('maxCore' in game, false);
  assert.ok(game.equippedOrgans.includes('focus-lens'));
});

test('長局戰鬥的續玩會保留已經經過的時間', () => {
  const storage = memoryStorage();
  const run = startRun(25);
  run.runTime = 121;
  run.wave = 3;
  saveCheckpoint(storage, run);
  const restored = loadCheckpoint(storage);
  assert.ok(restored.runTime >= 121);
  assert.equal(restored.wave, 3);
});
