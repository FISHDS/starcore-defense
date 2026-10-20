import { advance, chooseUpgrade, startRun } from '../dist/src/game.js';
import { routeLength } from '../dist/src/routes.js';
import { choosePilotUpgrade, fixedAimAngle } from './fixed-aim-pilot.mjs';

const SEEDS = [5, 19, 33, 47, 101, 202, 303, 404, 505, 606];

function simulate(seed, style) {
  const game = startRun(seed, {}, 1);
  let boss;
  let skillChoices = 0;
  const chestTimes = [];
  for (let frame = 0; frame < 9000 && !['victory', 'defeat'].includes(game.phase); frame++) {
    if (game.phase === 'upgrade') {
      skillChoices++;
      chestTimes.push(Math.round(game.runTime));
      if (style === 'no-skills') {
        game.phase = 'playing';
        game.choices = [];
      } else chooseUpgrade(game, choosePilotUpgrade(game));
    }
    advance(game, 0.05, {
      aimAngle: style === 'fixed' ? -Math.PI / 2 : fixedAimAngle(game),
    });
    boss ||= game.bosses[0];
  }
  return {
    seed, style, result: game.phase, seconds: Math.round(game.runTime),
    skillChoices, chestTimes,
    routePercent: Math.round(boss.travel / routeLength(boss.path, true, boss.lane) * 100),
  };
}

const rows = ['active', 'fixed', 'no-skills'].flatMap(style =>
  SEEDS.map(seed => simulate(seed, style)));
console.table(rows.map(({ seed, style, result, seconds, skillChoices, routePercent }) =>
  ({ seed, style, result, seconds, skillChoices, routePercent })));
const summary = Object.fromEntries(['active', 'fixed', 'no-skills'].map(style => {
  const runs = rows.filter(row => row.style === style);
  return [style, {
    wins: runs.filter(row => row.result === 'victory').length,
    averageSeconds: Math.round(runs.reduce((sum, row) => sum + row.seconds, 0)
      / runs.length),
  }];
}));
console.log(JSON.stringify({ summary, activeChestTimes: rows.filter(row =>
  row.style === 'active').map(row => ({ seed: row.seed, times: row.chestTimes })) }, null, 2));

// 主動瞄準應有勝算；固定方向與不選技能不應成為穩定通關方法。
if (summary.active.wins < 8 || summary.fixed.wins > 5
  || summary['no-skills'].wins > 0 || rows.some(row => row.skillChoices > 8)
  || rows.filter(row => row.style === 'active' && row.result === 'victory')
    .some(row => row.seconds < 120 || row.seconds > 190 || row.routePercent < 60)) {
  process.exitCode = 1;
}
