import { advance, chooseUpgrade, startRun } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from './fixed-aim-pilot.mjs';

function simulate(chapter, seed, idle = false, build = 'base') {
  const level = chapter <= 2 ? 0 : chapter <= 5 ? 2 : 4;
  const profile = { fire: level, guard: level, scavenge: level,
    tactics: level, collector: level,
    equippedWeapon: chapter >= 15 ? 'rail' : 'capsule',
    equippedOrgans: chapter >= 20 ? ['guard-membrane', 'tempo']
      : chapter >= 10 ? ['guard-membrane'] : [] };
  const game = startRun(seed, profile, chapter);
  for (let step = 0; step < 9000 && !['victory', 'defeat'].includes(game.phase); step++) {
    if (game.phase === 'upgrade') {
      chooseUpgrade(game, choosePilotUpgrade(game, build));
    }
    advance(game, 0.05, { aimAngle: idle ? -Math.PI / 2 : fixedAimAngle(game) });
  }
  return { phase: game.phase, sec: Math.round(game.runTime),
    killed: game.normalDestroyed, core: Math.round(game.core),
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
    idle: idle?.phase || '-', idleKilled: idle?.killed ?? '-' });
}
console.table(rows);
if (rows.some(row => row.idle === 'victory')) process.exitCode = 1;
if (rows.some(row => row.baseWins + row.newWins === 0)) process.exitCode = 1;
