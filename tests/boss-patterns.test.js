import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';
import { lastShiftPartForIndex } from '../dist/src/boss-art.js';

test('頭目共享血量組承受傷害，整組擊破後頭部沿路回拉', () => {
  const game = startRun(15, {}, 10);
  game.encounter = 'boss';
  advance(game, 0.05);
  const boss = game.bosses[0];
  const piece = boss.segments.find(segment => segment.index > 0
    && !segment.chest && !segment.weakpoint && !segment.armorHp);
  assert.ok(piece);
  const group = boss.healthGroups.find(item => item.members.includes(piece));
  assert.ok(group, '頭目身體應屬於共享血量組');
  const health = group.hp;
  const travel = boss.travel;
  assert.equal(hitSegment(game, boss, piece, 5000), true);
  assert.equal(group.hp, health - 5000);
  assert.ok(group.members.every(member => member.hp === group.hp));
  const beforeHead = boss.segments[0].routeDistance;
  assert.equal(hitSegment(game, boss, group.members[0], group.hp + 1), true);
  assert.equal(boss.travel, travel - group.members.length * boss.spacing,
    '整組身體移除後，頭部應沿路回拉相同長度');
  advance(game, 0.05);
  assert.ok(boss.segments[0].routeDistance < beforeHead - 8);
});

test('棺材舞領隊的身節仍呈現手套、棺材與舞鞋循環造型', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, index) =>
    lastShiftPartForIndex(index + 1)), ['hand', 'coffin', 'shoe',
    'hand', 'coffin', 'shoe']);
});
