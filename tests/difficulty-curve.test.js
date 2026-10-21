import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, startRun, CHAPTERS } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from '../scripts/fixed-aim-pilot.mjs';

function simulate(chapter, seed, idle = false) {
  const level = chapter <= 2 ? 0 : 2;
  const game = startRun(seed, {
    fire: level, guard: level, scavenge: level,
    tactics: level, collector: level,
  }, chapter);
  for (let step = 0; step < 9000 && !['victory', 'defeat'].includes(game.phase); step++) {
    if (game.phase === 'upgrade') chooseUpgrade(game, choosePilotUpgrade(game, 'base'));
    advance(game, 0.05, { aimAngle: idle ? -Math.PI / 2 : fixedAimAngle(game) });
  }
  return game;
}

test('首尾五關的HP與速度倍率依關卡階段上升', () => {
  const milestones = [1, 3, 5, 10, 15, 20, 25].map(id => CHAPTERS[id - 1]);
  assert.deepEqual(milestones.map(stage => stage.hpScale),
    [1, 1.38, 1.805, 2.03, 2.255, 2.48, 2.705]);
  assert.deepEqual(milestones.map(stage => Math.round(stage.speedScale * 100) / 100),
    [0.84, 1.09, 1.2, 1.24, 1.28, 1.32, 1.36]);
});

test('第3至5關主動瞄準保有勝率，固定方向仍不穩定通關', () => {
  const seeds = [1, 2, 3, 4, 5, 7, 11, 19, 33, 47];
  for (const chapter of [3, 4, 5]) {
    const activeRuns = seeds.map(seed => simulate(chapter, seed));
    const idleRuns = seeds.map(seed => simulate(chapter, seed, true));
    const activeWins = activeRuns.filter(game => game.phase === 'victory').length;
    const minimumWins = chapter === 5 ? 3 : 4;
    assert.ok(activeWins >= minimumWins,
      `第${chapter}關主動瞄準只通關 ${activeWins}/10`);
    const idleWins = idleRuns.filter(game => game.phase === 'victory').length;
    const activeDestroyed = activeRuns.reduce((sum, game) => sum + game.bossDestroyed, 0);
    const idleDestroyed = idleRuns.reduce((sum, game) => sum + game.bossDestroyed, 0);
    assert.ok(activeWins > idleWins,
      `第${chapter}關主動瞄準 ${activeWins} 勝，固定方向 ${idleWins} 勝`);
    assert.ok(activeDestroyed > idleDestroyed * 1.3,
      `第${chapter}關主動瞄準擊破 ${activeDestroyed} 節，固定方向 ${idleDestroyed} 節`);
  }
});

test('25關敵人耐久與速度都逐步增加，沒有後段倒退', () => {
  for (let index = 1; index < CHAPTERS.length; index++) {
    const previous = CHAPTERS[index - 1];
    const current = CHAPTERS[index];
    assert.ok(current.hpScale > previous.hpScale,
      `第${current.id}關敵人耐久沒有增加`);
    assert.ok(current.speedScale > previous.speedScale,
      `第${current.id}關速度沒有增加`);
  }
});
