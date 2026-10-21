import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, getRunProgress, getShotDamage, startRun } from '../dist/src/game.js';
import { loadCheckpoint, saveCheckpoint } from '../dist/src/storage.js';

test('第一關有一百組可擊破大身節，寶箱控制在八個並分布到後段', () => {
  const game = startRun(20, {}, 1);
  advance(game, 0.05);
  const boss = game.bosses[0];
  const chests = boss.segments.filter(piece => piece.chest);

  assert.equal(boss.healthGroups.length, 100);
  assert.ok(boss.healthGroups.every(group => group.members.length === 3));
  assert.equal(chests.length, 8);
  assert.deepEqual(chests.map(piece => piece.depth),
    [4, 20, 39, 76, 113, 168, 223, 278]);
  assert.equal(CHAPTERS[1].bossSegments, 409, '第二關開始套用百組長戰');
});

test('第一關延長至一百組不會讓擊破成長額外放大', () => {
  const longBoss = startRun(21, {}, 1);
  const originalLength = startRun(21, {}, 2);

  longBoss.bossDestroyed = 154;
  originalLength.bossDestroyed = 204;
  assert.ok(Math.abs(getShotDamage(longBoss) - getShotDamage(originalLength)) <= 1);

  longBoss.bossDestroyed = 308;
  originalLength.bossDestroyed = 408;
  assert.ok(Math.abs(getShotDamage(longBoss) - getShotDamage(originalLength)) <= 1);
});

test('第一關一百組長鏈存檔後仍可依共用血量續玩', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const game = startRun(22, {}, 1);
  advance(game, 0.05);
  saveCheckpoint(storage, game);

  const resumed = loadCheckpoint(storage);
  assert.equal(resumed.boss.healthGroups.length, 100);
  assert.equal(resumed.boss.segments.filter(piece => piece.chest).length, 8);
  assert.ok(resumed.boss.healthGroups.every(group => group.members.length === 3));
});

test('第一關後段已擊破超過舊長度時，續玩保留正確擊破進度', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const game = startRun(24, {}, 1);
  advance(game, 0.05);
  game.bossDestroyed = 200;
  saveCheckpoint(storage, game);

  assert.equal(loadCheckpoint(storage)?.bossDestroyed, 200);
});

test('舊版第一關進行中的長鏈續玩時保留舊長度的火力與進度', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const game = startRun(23, {}, 1);
  advance(game, 0.05);
  saveCheckpoint(storage, game);

  const key = 'starcore.checkpoint.v5';
  const oldSave = JSON.parse(values.get(key));
  oldSave.bossDestroyed = 46;
  oldSave.chains[0].originalBodyCount = 91;
  oldSave.chains[0].segments = oldSave.chains[0].segments.slice(0, 92);
  values.set(key, JSON.stringify(oldSave));

  const resumed = loadCheckpoint(storage);
  const oldLengthReference = startRun(23, {}, 1);
  oldLengthReference.boss = { originalBodyCount: 91 };
  oldLengthReference.bossDestroyed = 46;
  assert.equal(getShotDamage(resumed), getShotDamage(oldLengthReference));
  assert.ok(Math.abs(getRunProgress(resumed) - 46 / 91) < 0.001);
});
