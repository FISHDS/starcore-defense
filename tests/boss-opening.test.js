import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, hitSegment, startRun } from '../dist/src/game.js';

test('作戰第一刻就是頭目戰，不生成普通長鏈', () => {
  for (const chapter of [1, 2, 7, 25]) {
    const game = startRun(1200 + chapter, {}, chapter);
    assert.equal(game.encounter, 'boss', `第${chapter}關開場遭遇類型`);
    advance(game, 0.01);
    assert.equal(game.bosses.length, CHAPTERS[chapter - 1].bossCount,
      `第${chapter}關頭目數`);
    assert.ok(game.chains.every(chain => chain.boss),
      `第${chapter}關不應生成小怪長鏈`);
  }
});

test('雙頭關的頭目在同一個開場更新中一起登場', () => {
  const game = startRun(1207, {}, 7);
  advance(game, 0.01);
  assert.equal(game.bosses.length, 2);
  assert.ok(game.bosses.every(boss => boss.segments.length > 1));
  assert.ok(game.bosses.every(boss => boss.travel === game.bosses[0].travel));
});

test('快速連續擊破會拉回頭部，但最低推進壓力仍持續累積', () => {
  const game = startRun(1202, {}, 2);
  advance(game, 0.01);
  const boss = game.bosses[0];
  const initialTravel = boss.travel;
  const initialPressure = boss.pressureTravel;
  for (let count = 0; count < 8; count++) {
    const group = boss.healthGroups.find(item => item.members.some(piece => piece.index > 0));
    assert.ok(group, `第${count + 1}次應有可擊破身體組`);
    assert.equal(hitSegment(game, boss, group.members[0], group.hp + 1), true);
    assert.ok(boss.pressureTravel >= initialPressure,
      `第${count + 1}次擊破後，最低推進壓力倒退`);
  }
  for (let frame = 0; frame < 100; frame++) advance(game, 0.05);
  assert.ok(boss.travel > initialTravel,
    '擊破後頭目仍須沿路推進，不能停在入口陪玩家刷擊破');
});

test('頭目身體擊破仍保留可見的短暫回彈', () => {
  const game = startRun(2202, {}, 2);
  advance(game, 0.01);
  const boss = game.bosses[0];
  const group = boss.healthGroups[0];
  const before = boss.travel;
  hitSegment(game, boss, group.members[0], group.hp + 1);
  assert.ok(boss.recoil > 0);
  assert.ok((boss.recoilDistance || 0) > 0);
  assert.ok(boss.travel < before);
  advance(game, 0.1);
  assert.ok(boss.segments[0].routeDistance < before,
    '回彈期間頭部必須沿路線向後退');
});
