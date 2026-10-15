import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, hitSegment, startRun } from '../dist/src/game.js';

const PREFERRED = ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce'];

function playOpening(seed, profile, move, seconds = 45) {
  const game = startRun(seed, profile, 1);
  while (game.runTime < seconds && !['victory', 'defeat'].includes(game.phase)) {
    if (game.phase === 'upgrade') {
      chooseUpgrade(game, PREFERRED.find(id => game.choices.includes(id)) || game.choices[0]);
    }
    const bodies = game.chains.flatMap(chain => chain.segments.slice(1)
      .filter(piece => piece.y > 220 && piece.y < 710));
    const chest = bodies.filter(piece => piece.chest).sort((a, b) => b.y - a.y)[0];
    const closest = bodies.sort((a, b) => b.y - a.y)[0];
    const x = move ? chest?.x ?? closest?.x ?? 195 : 195;
    advance(game, 0.05, x);
  }
  return {
    destroyed: game.normalDestroyed,
    headY: game.chains.find(chain => !chain.boss && !chain.dead)?.segments[0].y ?? 744,
  };
}

test('第一關敵群不會在開場持續被壓在畫面最上方', () => {
  const samples = Array.from({ length: 10 }, (_, index) =>
    playOpening(index + 1, {}, false, 20));
  const averageHeadY = samples.reduce((sum, item) => sum + item.headY, 0) / samples.length;
  assert.ok(averageHeadY >= 450, `20 秒時鏈頭平均只到 y=${averageHeadY.toFixed(0)}`);
});

test('第一關有局外成長仍需要移動追擊，掛機不能快速清空前半條', () => {
  const profile = { fire: 2, guard: 2, scavenge: 2,
    equippedWeapon: 'scatter', equippedOrgans: ['guard-membrane'] };
  const idle = Array.from({ length: 10 }, (_, index) =>
    playOpening(index + 1, profile, false));
  const moving = Array.from({ length: 10 }, (_, index) =>
    playOpening(index + 1, profile, true));
  const idleAverage = idle.reduce((sum, item) => sum + item.destroyed, 0) / idle.length;
  const movingAverage = moving.reduce((sum, item) => sum + item.destroyed, 0) / moving.length;
  assert.ok(idleAverage < 90, `掛機 45 秒清掉 ${idleAverage.toFixed(0)} 節`);
  assert.ok(movingAverage > idleAverage * 1.35,
    `移動追擊 ${movingAverage.toFixed(0)} 節，掛機 ${idleAverage.toFixed(0)} 節`);
});

test('中央交會護膜會擋藥丸，側邊身體仍可擊破並拉回鏈頭', () => {
  const game = startRun(12);
  advance(game, 0.05);
  const chain = game.chains[0];
  const crossing = chain.segments.find(piece => piece.transitShield && !piece.chest);
  const flank = chain.segments.find(piece => piece.index > 0 && !piece.transitShield
    && !piece.chest && piece.y > 220 && piece.y < 700);
  assert.ok(crossing && flank);
  const crossingHp = crossing.hp;
  assert.equal(hitSegment(game, chain, crossing, crossingHp + 1, { projectile: true }), false);
  assert.equal(crossing.hp, crossingHp);
  const before = chain.travel;
  assert.equal(hitSegment(game, chain, flank, flank.hp + 1, { projectile: true }), true);
  assert.ok(chain.travel < before);
});
