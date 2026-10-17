import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';
import { lastShiftPartForIndex } from '../dist/src/boss-art.js';

test('頭目共享血量組承受傷害，擊破時短暫回彈後繼續向前', () => {
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
  assert.equal(boss.travel, travel,
    '擊破身體不能永久扣回頭目已走過的距離');
  advance(game, 0.05);
  assert.ok(boss.segments[0].routeDistance < beforeHead + boss.speed * 0.05,
    '頭部保留短暫回彈，但不可倒退一整組距離');
});

test('棺材舞領隊的身節仍呈現手套、棺材與舞鞋循環造型', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, index) =>
    lastShiftPartForIndex(index + 1)), ['hand', 'coffin', 'shoe',
    'hand', 'coffin', 'shoe']);
});
