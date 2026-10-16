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
  return game.phase;
}

test('首尾五關的HP與速度倍率依關卡階段上升', () => {
  const milestones = [1, 3, 5, 10, 15, 20, 25].map(id => CHAPTERS[id - 1]);
  assert.deepEqual(milestones.map(stage => stage.hpScale),
    [1, 1.38, 1.55, 1.775, 2.0, 2.225, 2.45]);
  assert.deepEqual(milestones.map(stage => Math.round(stage.speedScale * 100) / 100),
    [0.84, 1.09, 1.2, 1.24, 1.28, 1.32, 1.36]);
});

test('第3至5關主動瞄準保有勝率，固定方向不能穩定通關', () => {
  const seeds = [1, 2, 3, 4, 5, 7, 11, 19, 33, 47];
  for (const chapter of [3, 4, 5]) {
    const activeWins = seeds.filter(seed => simulate(chapter, seed) === 'victory').length;
    const idleWins = seeds.filter(seed => simulate(chapter, seed, true) === 'victory').length;
    assert.ok(activeWins >= 6, `第${chapter}關主動瞄準只通關 ${activeWins}/10`);
    assert.ok(idleWins <= 1, `第${chapter}關固定方向通關 ${idleWins}/10`);
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

test('第3關降低固定方向通關，第19與25關調低雙頭目耐久', () => {
  assert.equal(CHAPTERS[2].bossHpScale, 1.6);
  assert.equal(CHAPTERS[18].bossHpScale, 0.6);
  assert.equal(CHAPTERS[24].bossHpScale, 0.6);
});
