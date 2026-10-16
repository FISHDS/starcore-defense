import { advance, chooseUpgrade, startRun } from '../dist/src/game.js';

// 以同一套追箱、守線、閃飛彈策略橫跑全部正式關卡。
function pilot(game) {
  const threat = game.chains.filter(chain => !chain.dead && chain.segments[0].y > 580)
    .sort((a, b) => b.segments[0].y - a.segments[0].y)[0];
  const bodies = game.chains.flatMap(chain => chain.segments.slice(1)
    .filter(piece => piece.y > 220 && piece.y < 710));
  const chest = bodies.filter(piece => piece.chest).sort((a, b) => b.y - a.y)[0];
  const near = bodies.sort((a, b) => b.y - a.y)[0];
  const guard = threat?.segments.slice(1, 8).find(piece => piece.y < 710);
  let x = guard?.x ?? chest?.x ?? near?.x ?? 195;
  const incoming = game.enemyBullets.find(shot => {
    const landingX = shot.x + shot.vx * ((game.player.y - shot.y) / shot.vy);
    return shot.y > 400 && shot.y < 735 && Math.abs(landingX - x) < 48;
  });
  if (incoming) {
    const landingX = incoming.x + incoming.vx
      * ((game.player.y - incoming.y) / incoming.vy);
    x = landingX < 195 ? Math.min(366, landingX + 85)
      : Math.max(24, landingX - 85);
  }
  const hazard = game.hazards.find(item =>
    item.phase === 'warning' && item.time < 0.25 && Math.abs(item.x - x) < 60);
  if (hazard) x = hazard.x < 195
    ? Math.min(366, hazard.x + 100) : Math.max(24, hazard.x - 100);
  const screechCat = game.bosses.find(boss => !boss.dead
    && boss.rig?.profileId === 'meme-screech-cat');
  if (screechCat?.rig.safeX != null && (screechCat.rig.telegraphFor > 0
    || game.enemyBullets.some(shot => shot.kind === 'sonicWave')))
    x = screechCat.rig.safeX;
  return x;
}

function simulate(chapter, seed, idle = false, build = 'base') {
  const level = chapter <= 2 ? 0 : chapter <= 5 ? 2 : 4;
  const profile = { fire: level, guard: level, scavenge: level,
    tactics: level, collector: level,
    equippedWeapon: chapter >= 15 ? 'rail' : 'capsule',
    equippedOrgans: chapter >= 20 ? ['guard-membrane', 'tempo']
      : chapter >= 10 ? ['guard-membrane'] : [] };
  const game = startRun(seed, profile, chapter);
  const priority = build === 'new'
    ? ['detonation', 'superconductor', 'power', 'rapid', 'poison', 'burn',
      'arc', 'frost', 'multi', 'bankshot', 'harvest', 'combo', 'focus', 'pierce']
    : ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce',
      'focus', 'bankshot', 'combo', 'shield'];
  for (let step = 0; step < 9000 && !['victory', 'defeat'].includes(game.phase); step++) {
    if (game.phase === 'upgrade') {
      const skill = priority.find(id => game.choices.includes(id)) || game.choices[0];
      chooseUpgrade(game, skill);
    }
    advance(game, 0.05, idle ? 195 : pilot(game));
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
