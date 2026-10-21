import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';

test('擊破身節後頭部沿路線後退，後段身體不被向前拖', () => {
  const game = startRun(2801, {}, 1);
  game.fireTimer = -100000;
  for (let i = 0; i < 600; i++) advance(game, 0.05);
  const boss = game.boss;
  const group = boss.healthGroups[0];
  const rear = boss.segments[group.members.length + 1];
  const headBefore = boss.segments[0].routeDistance;
  const rearBefore = rear.routeDistance;

  hitSegment(game, boss, group.members[0], group.hp + 1);
  advance(game, 0.1);

  assert.ok(boss.segments[0].routeDistance <= headBefore - 35,
    `頭部只退了 ${(headBefore - boss.segments[0].routeDistance).toFixed(1)} 像素`);
  assert.ok(rear.routeDistance <= rearBefore + 15,
    `後段被往前拖了 ${(rear.routeDistance - rearBefore).toFixed(1)} 像素`);
});
