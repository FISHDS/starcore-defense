import { advance, chooseUpgrade, startRun } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from './fixed-aim-pilot.mjs';
import { simulateProgression } from './simulate-progression.mjs';

function simulate(chapter, seed, profile, idle = false, build = 'base') {
  const equippedWeapon = profile.weapons.includes('rail') ? 'rail'
    : profile.weapons.includes('scatter') ? 'scatter' : 'capsule';
  const equippedOrgans = ['focus-lens', 'tempo', 'anchor-organ']
    .filter(id => profile.organs.includes(id)).slice(0, 2);
  const game = startRun(seed, { ...profile, equippedWeapon, equippedOrgans }, chapter);
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
const progression = simulateProgression();
for (let chapter = 1; chapter <= 25; chapter++) {
  const profile = progression.profiles[chapter - 1];
  const active = [5, 19, 33].map(seed => simulate(chapter, seed, profile));
  const newBuild = [5, 19, 33].map(seed => simulate(chapter, seed, profile, false, 'new'));
  const idle = chapter <= 5 ? simulate(chapter, 5, profile, true) : null;
  rows.push({ chapter,
    baseWins: active.filter(result => result.phase === 'victory').length,
    newWins: newBuild.filter(result => result.phase === 'victory').length,
    baseBest: Math.max(...active.map(result => result.killed)),
    baseSec: Math.round(active.reduce((sum, result) => sum + result.sec, 0) / active.length),
    idle: idle?.phase || '-', idleKilled: idle?.killed ?? '-' });
}
console.table(rows);
if (progression.failed || rows.some(row => row.idle === 'victory')) process.exitCode = 1;
if (rows.some(row => row.baseWins + row.newWins === 0)) process.exitCode = 1;
