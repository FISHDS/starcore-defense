import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getRunProgress, getShotDamage, hitSegment, startRun } from '../dist/src/game.js';

test('雙頭關卡進度只依實際擊破的頭目身體計算', () => {
  const game = startRun(40, {}, 10);
  game.runTime = 200;
  assert.equal(getRunProgress(game), 0);
  game.normalDestroyed = 10000;
  assert.equal(getRunProgress(game), 0);
  game.bossDestroyed = 41;
  assert.ok(getRunProgress(game) > 0.45 && getRunProgress(game) < 0.55);
});

test('普通長鏈移除後，一關只帶指定頭目數與同場身體', () => {
  for (const chapter of [1, 7, 10, 25]) {
    const game = startRun(41, {}, chapter);
    advance(game, 0.05);
    assert.equal(game.bosses.length, game.chapter === 1 ? 1
      : game.chapter === 7 ? 2 : game.chapter === 10 ? 2 : 2);
    assert.ok(game.chains.every(chain => chain.boss));
    assert.ok(game.chains.every(chain => chain.segments.length > 30));
    assert.equal(game.encounter, 'boss');
  }
});

test('後段頭目的身節耐久成長，擊破頭目身節也提高玩家火力', () => {
  const first = startRun(42, {}, 1);
  const late = startRun(42, {}, 25);
  advance(first, 0.05);
  advance(late, 0.05);
  const firstBoss = first.bosses[0];
  const lateBoss = late.bosses[0];
  assert.ok(lateBoss.segments.at(-1).maxHp > firstBoss.segments.at(-1).maxHp * 2);
  const before = getShotDamage(late);
  const group = lateBoss.healthGroups[0];
  hitSegment(late, lateBoss, group.members[0], group.hp + 1);
  assert.ok(getShotDamage(late) > before);
});

test('身體被擊破後骨架補齊間距，頭部沿行軍路線平順移動', () => {
  const game = startRun(13);
  advance(game, 0.05);
  const boss = game.bosses[0];
  const id = boss.segments[20].id;
  const head = boss.segments[0];
  const beforeTravel = boss.travel;
  const before = { x: head.x, y: head.y };
  const group = boss.healthGroups.find(item => item.members.includes(boss.segments[20]));
  hitSegment(game, boss, boss.segments[20], group.hp + 1);
  assert.ok(!boss.segments.some(segment => segment.id === id));
  assert.ok(boss.segments.every((segment, index) => segment.index === index));
  assert.deepEqual({ x: head.x, y: head.y }, before);
  advance(game, 0.05);
  assert.ok(Math.hypot(head.x - before.x, head.y - before.y) < 20);
  assert.ok(boss.travel > beforeTravel);
});

test('每條頭目長鏈沿身體安排補給寶箱，擊破後仍在同一場戰鬥', () => {
  const game = startRun(44, {}, 25);
  advance(game, 0.05);
  const boss = game.bosses[0];
  const chests = boss.segments.filter(piece => piece.chest);
  assert.ok(chests.length >= 5);
  assert.ok(chests.some(piece => piece.gold));
  const chest = chests[0];
  hitSegment(game, boss, chest, chest.hp + 1);
  assert.equal(game.phase, 'upgrade');
  assert.ok(game.bosses.includes(boss));
});

test('雙頭目在同場並行，擊破一隻不會等候後續分批登場', () => {
  const game = startRun(54, {}, 10);
  advance(game, 0.05);
  const [first, second] = game.bosses;
  assert.ok(first && second);
  const firstBody = first.healthGroups[0];
  hitSegment(game, first, firstBody.members[0], 1000000);
  assert.equal(game.bosses.length, 2);
  assert.ok(!second.dead);
  assert.ok(second.segments.length > 1);
});
