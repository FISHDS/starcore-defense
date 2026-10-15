import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, hitSegment, startRun } from '../dist/src/game.js';

test('後段血量與傷害達到千位數，成長不只靠開局數值', () => {
  const game = startRun(12);
  game.runTime = 250;
  game.nextSpawnAt = 250;
  advance(game, 0.05);
  const chain = game.chains.at(-1);
  assert.ok(chain.segments[1].maxHp > 5000);
  assert.ok(getShotDamage(game) > 500);
});

test('被擊破的身體會補齊間距，尾巴仍連成一條', () => {
  const game = startRun(13);
  advance(game, 0.05);
  const chain = game.chains[0];
  const id = chain.segments[20].id;
  hitSegment(game, chain, chain.segments[20], 100000);
  assert.ok(!chain.segments.some(segment => segment.id === id));
  assert.ok(chain.segments.every((segment, index) => segment.index === index));
  assert.ok(chain.segments[19].y > chain.segments[20].y);
});
