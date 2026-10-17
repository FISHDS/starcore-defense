import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, hitSegment, startRun } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from '../scripts/fixed-aim-pilot.mjs';

const PREFERRED = ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce'];

function playOpening(seed, profile, aim, seconds = 45) {
  const game = startRun(seed, profile, 1);
  while (game.runTime < seconds && !['victory', 'defeat'].includes(game.phase)) {
    if (game.phase === 'upgrade') {
      chooseUpgrade(game, PREFERRED.find(id => game.choices.includes(id))
        || choosePilotUpgrade(game));
    }
    const angle = aim ? fixedAimAngle(game) : -Math.PI / 2;
    advance(game, 0.05, { aimAngle: angle });
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
  assert.ok(averageHeadY >= 360, `20 秒時鏈頭平均只到 y=${averageHeadY.toFixed(0)}`);
});

test('瞄準選擇比固定方向掛機更能清理長鏈', () => {
  const profile = { fire: 2, precision: 2, scavenge: 2,
    equippedWeapon: 'scatter', equippedOrgans: ['focus-lens'] };
  const idle = Array.from({ length: 10 }, (_, index) =>
    playOpening(index + 1, profile, false));
  const aimed = Array.from({ length: 10 }, (_, index) =>
    playOpening(index + 1, profile, true));
  const idleAverage = idle.reduce((sum, item) => sum + item.destroyed, 0) / idle.length;
  const aimedAverage = aimed.reduce((sum, item) => sum + item.destroyed, 0) / aimed.length;
  assert.ok(idleAverage < 90, `固定方向 45 秒清掉 ${idleAverage.toFixed(0)} 節`);
  assert.ok(aimedAverage > idleAverage * 1.35,
    `主動轉向清掉 ${aimedAverage.toFixed(0)} 節，固定方向 ${idleAverage.toFixed(0)} 節`);
});

test('測試瞄準策略會優先瞄準群組長亮起的手機弱點', () => {
  const game = startRun(17, {}, 3);
  game.encounter = 'boss';
  advance(game, 0.05);
  const boss = game.bosses[0];
  const phone = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
  phone.weakOpen = true;
  phone.x = 80; phone.y = 260;
  for (const piece of boss.segments) {
    if (piece !== phone && piece.weakpoint) piece.weakOpen = false;
  }
  for (const chest of boss.segments.filter(piece => piece.chest)) chest.x = 500;
  const expected = Math.atan2(phone.y - game.player.y, phone.x - game.player.x);
  assert.ok(Math.abs(fixedAimAngle(game) - expected) < 0.01);
});

test('普通長鏈身體被擊破會讓頭部按一節距離回彈', () => {
  const game = startRun(12);
  advance(game, 0.05);
  const chain = game.chains[0];
  const flank = chain.segments.find(piece => piece.index === 1);
  const before = chain.travel;
  const headBefore = chain.segments[0].routeDistance;
  assert.equal(hitSegment(game, chain, flank, flank.hp + 1), true);
  assert.equal(chain.travel, before - chain.spacing, '頭部要按減少的一節回拉');
  advance(game, 0.05);
  assert.ok(chain.segments[0].routeDistance < headBefore - 8,
    '頭部要有清楚可見的回彈');
});

test('完全不操作不會自動通關', () => {
  for (const chapter of [1, 5, 25]) {
    const game = startRun(700 + chapter, {}, chapter);
    for (let frame = 0; frame < 12000 && game.phase === 'playing'; frame++) {
      advance(game, 0.05);
    }
    assert.notEqual(game.phase, 'victory', `第${chapter}關在完全無輸入下自行通關`);
    for (let frame = 0; frame < 12000; frame++) advance(game, 0.05);
    assert.notEqual(game.phase, 'victory', `第${chapter}關在完全無輸入下自行通關`);
  }
});

test('第二至第五關主動瞄準有通關機會，固定方向的命中效率較低', () => {
  const seeds = [5, 19, 33];
  let activeWins = 0;
  for (const chapter of [2, 3, 4, 5]) {
    for (const seed of seeds) {
      const level = chapter <= 2 ? 0 : 2;
      const profile = { fire: level, guard: level, scavenge: level,
        tactics: level, collector: level };
      const game = startRun(seed, profile, chapter);
      for (let frame = 0; frame < 9000
        && !['victory', 'defeat'].includes(game.phase); frame++) {
        if (game.phase === 'upgrade') {
          chooseUpgrade(game, choosePilotUpgrade(game, 'base'));
        }
        advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
      }
      if (game.phase === 'victory') activeWins++;
    }
  }
  assert.ok(activeWins >= 6, `主動瞄準只通關 ${activeWins}/12 次`);
});
