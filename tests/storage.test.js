import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';
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
  game.player.x = 35;
  saveCheckpoint(storage, game);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.wave, 3);
  assert.equal(restored.runTime, 107);
  assert.equal(restored.core, 63);
  assert.equal(restored.score, 140);
  assert.deepEqual(restored.upgrades, { rapid: 2, shield: 1 });
  assert.equal(restored.player.x, 35);
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

test('舊路線存檔不會被當成新路線載入，研究點仍保留', () => {
  const storage = memoryStorage();
  storage.setItem('starcore.checkpoint.v3', JSON.stringify({ version: 3, wave: 2 }));
  storage.setItem('starcore.profile.v1', JSON.stringify({ dna: 88, fire: 1 }));
  assert.equal(loadCheckpoint(storage), null);
  const game = startRun(48);
  saveCheckpoint(storage, game);
  assert.equal(JSON.parse(storage.getItem('starcore.checkpoint.v5')).version, 5);
  assert.equal(storage.getItem('starcore.profile.v1') !== null, true);
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
  assert.equal(restored.normalDestroyed, game.normalDestroyed);
});

test('開箱後未選技能或已刷新時也能原樣續玩', () => {
  const storage = memoryStorage();
  const game = startRun(83);
  advance(game, 0.05);
  const chain = game.chains[0];
  const chest = chain.segments.find(piece => piece.chest);
  hitSegment(game, chain, chest, chest.hp + 1);
  assert.equal(game.phase, 'upgrade');
  const choices = [...game.choices];
  game.rerollsLeft = 0;
  saveCheckpoint(storage, game);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.phase, 'upgrade');
  assert.deepEqual(restored.choices, choices);
  assert.equal(restored.rerollsLeft, 0);
  assert.equal(restored.chains[0].segments.some(piece => piece.id === chest.id), false);
});

test('第一隻頭目死後續玩，第二隻死亡仍會判定勝利', () => {
  const storage = memoryStorage();
  const game = startRun(82, {}, 2);
  game.encounter = 'boss';
  game.wave = 6;
  advance(game, 0.05);
  assert.equal(game.bosses.length, 2);
  game.bosses[0].dead = true;
  advance(game, 0.05);
  saveCheckpoint(storage, game);
  const restored = loadCheckpoint(storage);
  assert.equal(restored.bosses.length, 1);
  restored.bosses[0].dead = true;
  advance(restored, 0.05);
  assert.equal(restored.phase, 'victory');
});
