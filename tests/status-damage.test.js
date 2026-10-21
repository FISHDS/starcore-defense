import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';

function exposedBoss(seed) {
  const game = startRun(seed, {}, 1);
  game.fireTimer = -100000;
  for (let frame = 0; frame < 600; frame++) advance(game, 0.05);
  return { game, boss: game.boss, group: game.boss.healthGroups[0] };
}

test('一級灼燒三秒能削去首關共享血量約百分之八，且不連續洗出數字', () => {
  const { game, boss, group } = exposedBoss(1801);
  game.upgrades.burn = 1;
  const target = group.members[0];
  hitSegment(game, boss, target, 1);
  const before = group.hp;
  for (let frame = 0; frame < 60; frame++) advance(game, 0.05);

  const ratio = (before - group.hp) / group.maxHp;
  assert.ok(ratio >= 0.07 && ratio <= 0.11,
    `灼燒三秒只削去 ${(ratio * 100).toFixed(1)}%`);
  assert.ok(game.popups.length <= 2, '持續傷害不應每個更新影格跳一個數字');
});

test('一級毒素會持續侵蝕共享血量，且按秒數累積而非每影格保底傷害', () => {
  const { game, boss, group } = exposedBoss(1802);
  game.upgrades.poison = 1;
  hitSegment(game, boss, group.members[0], 1);
  const before = group.hp;
  for (let frame = 0; frame < 110; frame++) advance(game, 0.05);

  const ratio = (before - group.hp) / group.maxHp;
  assert.ok(ratio >= 0.08 && ratio <= 0.13,
    `毒素全程只削去 ${(ratio * 100).toFixed(1)}%`);
});
