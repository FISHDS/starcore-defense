import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';
import { lastShiftPartForIndex } from '../dist/src/boss-art.js';

test('頭目身節承受原始傷害，擊破後頭部沿路回拉', () => {
  const game = startRun(15, {}, 10);
  game.encounter = 'boss';
  advance(game, 0.05);
  const boss = game.bosses[0];
  const piece = boss.segments.find(segment => segment.index > 0
    && !segment.chest && !segment.weakpoint && !segment.armorHp);
  assert.ok(piece);
  const health = piece.hp;
  const travel = boss.travel;
  assert.equal(hitSegment(game, boss, piece, 5000), true);
  assert.equal(piece.hp, health - 5000);
  const lethal = boss.segments.find(segment => segment.index > 0
    && !segment.chest && !segment.weakpoint && !segment.armorHp);
  assert.ok(lethal);
  const secondTravel = boss.travel;
  assert.equal(hitSegment(game, boss, lethal, 1e9), true);
  assert.ok(boss.travel < secondTravel && boss.travel < travel);
});

test('棺材舞領隊的身節仍呈現手套、棺材與舞鞋循環造型', () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, index) =>
    lastShiftPartForIndex(index + 1)), ['hand', 'coffin', 'shoe',
    'hand', 'coffin', 'shoe']);
});
