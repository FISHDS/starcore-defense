import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, hitSegment, startRun } from '../dist/src/game.js';
import * as mechanics from '../dist/src/mechanics.js';

test('共享血量身節在技能範圍攻擊中只代表一個目標', () => {
  const chain = { id: 'boss-a' };
  const members = [
    { id: 'a', healthGroupId: 'pool-1', hp: 100 },
    { id: 'b', healthGroupId: 'pool-1', hp: 100 },
    { id: 'c', healthGroupId: 'pool-1', hp: 100 },
    { id: 'd', healthGroupId: 'pool-2', hp: 100 },
  ];
  const targets = members.map(segment => ({ chain, segment }));

  assert.equal(typeof mechanics.uniqueHealthTargets, 'function');
  assert.deepEqual(mechanics.uniqueHealthTargets(targets).map(item => item.segment.id), ['a', 'd']);
  assert.equal(mechanics.healthPoolKey(chain, members[0]), mechanics.healthPoolKey(chain, members[2]));
});

test('彈射目標略過已命中的共享血量組，優先選附近另一組', () => {
  const chain = { id: 'boss-b' };
  const bodies = [
    { chain, segment: { id: 'same-a', healthGroupId: 'pool-a', hp: 100, x: 8, y: 0 } },
    { chain, segment: { id: 'same-b', healthGroupId: 'pool-a', hp: 100, x: 10, y: 0 } },
    { chain, segment: { id: 'next', healthGroupId: 'pool-b', hp: 100, x: 32, y: 0 } },
    { chain, segment: { id: 'far', healthGroupId: 'pool-c', hp: 100, x: 90, y: 0 } },
  ];

  assert.equal(typeof mechanics.selectNextHealthPoolTarget, 'function');
  const target = mechanics.selectNextHealthPoolTarget(bodies, { x: 0, y: 0 },
    new Set([mechanics.healthPoolKey(chain, bodies[0].segment)]), 115);

  assert.equal(target.segment.id, 'next');
});

test('毒素與脈衝場的最高級效果不再低到近乎看不見', () => {
  assert.equal(typeof mechanics.poisonDamageRatio, 'function');
  assert.equal(mechanics.poisonDamageRatio(1), 0.22);
  assert.ok(Math.abs(mechanics.poisonDamageRatio(3) - 0.42) < 1e-9);
  assert.equal(mechanics.pulseDamageRatio(1), 0.4);
  assert.equal(mechanics.pulseDamageRatio(3), 0.7);
});

test('多重發射增加覆蓋面但不把同一方向的總傷害放大五倍', () => {
  const game = startRun(812, {}, 1);
  game.upgrades.multi = 4;
  game.fireTimer = 0.20;
  advance(game, 0.02, { aimAngle: -Math.PI / 2 });

  assert.equal(game.bullets.length, 5);
  const shotDamage = game.bullets.reduce((total, bullet) => total + bullet.damage, 0);
  assert.ok(shotDamage > getShotDamage(game) * 2.7);
  assert.ok(shotDamage < getShotDamage(game) * 2.9);
});

test('重力錨實際拖慢敵群，效果結束後行軍恢復', () => {
  const game = startRun(811, {}, 1);
  game.encounter = 'boss';
  game.fireTimer = -10000;
  game.upgrades.anchor = 3;
  advance(game, 0.05);
  const chain = game.bosses[0];
  const group = chain.healthGroups.find(item => item.members.length >= 3);
  assert.ok(group);

  hitSegment(game, chain, group.members[0], group.hp + 1);
  assert.ok(chain.anchorFor > 0);
  const anchoredTravel = chain.travel;
  advance(game, 0.05);
  assert.equal(chain.travel, anchoredTravel, '錨定期間敵群應暫停推進');

  chain.anchorFor = 0;
  const releasedTravel = chain.travel;
  advance(game, 0.05);
  assert.ok(chain.travel > releasedTravel, '錨定結束後敵群應恢復行軍');
});
