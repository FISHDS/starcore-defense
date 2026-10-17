import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, startRun } from '../dist/src/game.js';
import { awardRun, buyItem, equipItem, loadCheckpoint, readProfile, saveCheckpoint } from '../dist/src/storage.js';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

test('通過指定關卡會解鎖不同的永久裝備，並能裝備影響下次開局', () => {
  const storage = memory();
  for (const chapter of [5, 10]) {
    const run = startRun(1, {}, chapter);
    run.phase = 'victory';
    awardRun(storage, run);
  }
  let profile = readProfile(storage);
  assert.ok(profile.weapons.includes('scatter'));
  assert.ok(profile.organs.includes('focus-lens'));
  assert.equal(equipItem(storage, 'weapon', 'scatter').success, true);
  assert.equal(equipItem(storage, 'organ', 'focus-lens').success, true);
  profile = readProfile(storage);
  profile.collector = 1;
  const equipped = startRun(2, profile, 11);
  assert.equal(equipped.equippedWeapon, 'scatter');
  assert.ok(equipped.equippedOrgans.includes('focus-lens'));
});

test('研究點可以解鎖不同流派裝備，未解鎖前不能裝備', () => {
  const storage = memory();
  assert.equal(equipItem(storage, 'weapon', 'rail').success, false);
  assert.equal(buyItem(storage, 'rail').success, false);
  storage.setItem('starcore.profile.v2', JSON.stringify({ dna: 500 }));
  assert.equal(buyItem(storage, 'rail').success, true);
  assert.equal(equipItem(storage, 'weapon', 'rail').success, true);
  assert.ok(getShotDamage(startRun(4, readProfile(storage), 1))
    > getShotDamage(startRun(4, {}, 1)));
});

test('第25關通關解鎖無盡模式，雙頭目倒下會接續下一輪', () => {
  const storage = memory();
  const won = startRun(7, {}, 25);
  won.phase = 'victory';
  awardRun(storage, won);
  assert.equal(readProfile(storage).endlessUnlocked, true);
  const game = startRun(7, readProfile(storage), 26);
  assert.equal(game.chapter, 26);
  advance(game, 0.05);
  game.encounter = 'boss';
  game.spawnCount = 2;
  game.chains = [];
  game.bosses = [{ dead: true }, { dead: true }];
  advance(game, 0.05);
  assert.equal(game.phase, 'playing');
  assert.equal(game.endlessTier, 2);
  assert.equal(game.encounter, 'boss');
});

test('續玩保留無盡輪次與裝備，並丟棄舊版攻擊預警', () => {
  const storage = memory();
  const game = startRun(9, { equippedWeapon: 'rail', equippedOrgans: ['tempo'] }, 26);
  game.endlessTier = 4;
  game.hazards = [{ x: 100, phase: 'warning', time: 0.4 }];
  game.enemyBullets = [{ kind: 'spore', x: 195, y: 715, vx: 0, vy: 10 }];
  saveCheckpoint(storage, game);
  const loaded = loadCheckpoint(storage);
  assert.equal(loaded.endlessTier, 4);
  assert.equal(loaded.equippedWeapon, 'rail');
  assert.deepEqual(loaded.equippedOrgans, ['tempo']);
  assert.equal('hazards' in loaded, false);
  assert.equal('enemyBullets' in loaded, false);
});
