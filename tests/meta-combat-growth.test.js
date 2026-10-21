import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, hitSegment, startRun } from '../dist/src/game.js';
import { awardRun, buyResearch, readProfile } from '../dist/src/storage.js';

function memoryStorage(profile = {}) {
  const values = new Map([['starcore.profile.v2', JSON.stringify(profile)]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('局外研究增加三種戰鬥成長，舊研究等級保留但不再專攻寶箱', () => {
  const storage = memoryStorage({ dna: 1000, scavenge: 2, tactics: 3 });
  for (const id of ['thermal', 'momentum', 'ricochet']) {
    assert.equal(buyResearch(storage, id).success, true, `${id} 應可購買`);
  }
  const profile = readProfile(storage);
  const game = startRun(1101, profile, 2);
  assert.equal(profile.scavenge, 2);
  assert.equal(profile.tactics, 3);
  assert.equal(game.chestMaxHp, startRun(1101, {}, 2).chestMaxHp);
  game.fireTimer = -100000;
  advance(game, 0.05);
  const target = game.boss.healthGroups[3];
  const neighbor = game.boss.healthGroups[4];
  const before = neighbor.hp;
  hitSegment(game, game.boss, target.members[0], target.hp + 1);
  assert.ok(neighbor.hp < before, '舊補給研究改為擊破身節時擴散傷害');
});

test('舊寶箱重抽研究改為射速成長，技能三選一仍保有一次刷新', () => {
  const base = startRun(1102, {}, 2);
  const trained = startRun(1102, { tactics: 4 }, 2);
  for (let i = 0; i < 20; i++) {
    advance(base, 0.05);
    advance(trained, 0.05);
  }
  assert.ok(trained.shotCount > base.shotCount);
  const chest = trained.boss.segments.find(piece => piece.chest);
  hitSegment(trained, trained.boss, chest, chest.hp + 1);
  assert.equal(trained.rerollsLeft, 1);
});

test('永久熱能、連擊與折射研究帶來可見的特殊打法', () => {
  const game = startRun(1103, { thermal: 2, momentum: 4, ricochet: 4 }, 2);
  game.fireTimer = -100000;
  advance(game, 0.05);
  const group = game.boss.healthGroups[0];
  hitSegment(game, game.boss, group.members[0], 1);
  assert.ok(group.members[0].burnFor > 0, '熱能研究要能讓一般命中點燃身節');
  const base = getShotDamage(game);
  game.comboCount = 10;
  assert.ok(getShotDamage(game) > base * 1.4,
    '連擊研究要讓連續擊破時火力上升');

  const shot = startRun(1104, { ricochet: 4 }, 2);
  shot.shotCount = 3;
  shot.fireTimer = 0.2;
  advance(shot, 0.02, { aimAngle: 0 });
  assert.ok(shot.bullets.some(bullet => bullet.bounces >= 1),
    '折射研究要定期讓藥丸彈向另一組');
});

test('舊拾荒囊改為戰鬥中的追加射擊，不再額外加研究點', () => {
  const storage = memoryStorage({ organs: ['salvage'], equippedOrgans: ['salvage'] });
  const profile = readProfile(storage);
  const game = startRun(1105, profile, 2);
  assert.equal(game.chestMaxHp, startRun(1105, {}, 2).chestMaxHp);
  game.shotCount = 3;
  game.fireTimer = 0.2;
  advance(game, 0.02, { aimAngle: 0 });
  assert.equal(game.bullets.length, 2);
  const reward = awardRun(storage, game);
  assert.equal(readProfile(storage).dna, reward.gained);
});
