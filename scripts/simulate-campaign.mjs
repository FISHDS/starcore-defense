import { advance, chooseUpgrade, startRun } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from './fixed-aim-pilot.mjs';

function simulate(chapter, seed, idle = false, build = 'base') {
  const level = chapter <= 2 ? 0 : chapter <= 5 ? 2 : 4;
  const profile = { fire: level, guard: level, scavenge: level,
    tactics: level, collector: level,
    equippedWeapon: chapter >= 15 ? 'rail' : 'capsule',
    equippedOrgans: chapter >= 20 ? ['focus-lens', 'tempo']
      : chapter >= 10 ? ['focus-lens'] : [] };
  const game = startRun(seed, profile, chapter);
  for (let step = 0; step < 9000 && !['victory', 'defeat'].includes(game.phase); step++) {
    if (game.phase === 'upgrade') {
      // 真正的零輸入測試不會替玩家自動選技能；停在技能選擇畫面才是正確結果。
      if (idle) break;
      chooseUpgrade(game, choosePilotUpgrade(game, build));
    }
    advance(game, 0.05, { aimAngle: idle ? -Math.PI / 2 : fixedAimAngle(game) });
  }
  return { phase: game.phase, sec: Math.round(game.runTime),
    killed: game.bossDestroyed,
    boss: game.bossDestroyed };
}

const rows = [];
for (let chapter = 1; chapter <= 25; chapter++) {
  const active = [5, 19, 33].map(seed => simulate(chapter, seed));
  const newBuild = [5, 19, 33].map(seed => simulate(chapter, seed, false, 'new'));
  const idle = chapter <= 5 ? simulate(chapter, 5, true) : null;
  rows.push({ chapter,
    baseWins: active.filter(result => result.phase === 'victory').length,
    newWins: newBuild.filter(result => result.phase === 'victory').length,
    baseBest: Math.max(...active.map(result => result.killed)),
    baseSec: Math.round(active.reduce((sum, result) => sum + result.sec, 0) / active.length),
    idle: idle?.phase || '-', idleKilled: idle?.killed ?? '-' });
}
console.table(rows);
if (rows.some(row => row.idle === 'victory')) process.exitCode = 1;
if (rows.some(row => row.baseWins + row.newWins === 0)) process.exitCode = 1;
