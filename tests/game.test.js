import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, hitSegment, rerollUpgrades, startRun, UPGRADES, WAVES } from '../dist/src/game.js';
import { routeLength } from '../dist/src/routes.js';
import { choosePilotUpgrade, fixedAimAngle } from '../scripts/fixed-aim-pilot.mjs';

test('長鏈頭部不受傷，身體被打爆會使頭部沿路後退', () => {
  const game = startRun(7);
  advance(game, 0.05);
  const chain = game.chains[0];
  assert.ok(chain.segments.length >= 55);
  const head = chain.segments[0];
  const oldTravel = head.routeDistance;
  hitSegment(game, chain, head, 100000);
  assert.equal(head.hp, head.maxHp);
  assert.equal(chain.segments[0], head);
  const body = chain.segments[1];
  hitSegment(game, chain, body, body.hp + 1);
  assert.ok(chain.segments.length >= 55);
  advance(game, 0.05);
  assert.ok(head.routeDistance < oldTravel);
  assert.equal(chain.segments[0], head);
});

test('寶箱是身體節點，擊破後三選一並返回同一個戰場', () => {
  const game = startRun(8);
  advance(game, 0.05);
  const chain = game.chains[0];
  const chest = chain.segments.find(segment => segment.chest);
  assert.ok(chest);
  assert.equal(game.chest, null);
  const before = { x: chest.x, y: chest.y };
  advance(game, 0.5);
  assert.notDeepEqual({ x: chest.x, y: chest.y }, before);
  hitSegment(game, chain, chest, chest.hp + 1);
  assert.equal(game.phase, 'upgrade');
  assert.equal(game.choices.length, 3);
  assert.equal(chooseUpgrade(game, game.choices[0]), true);
  assert.equal(game.phase, 'playing');
  assert.ok(game.chains.includes(chain));
});

test('每條正式長鏈都帶有普通與金色寶箱', () => {
  const game = startRun(8);
  advance(game, 0.05);
  const chests = game.chains[0].segments.filter(segment => segment.chest);
  assert.ok(chests.length >= 3);
  assert.ok(chests.some(segment => segment.gold));
  assert.ok(chests.some(segment => !segment.gold));
});

test('單頭長鏈持續施壓，固定不射擊會在下一階段前失敗', () => {
  const game = startRun(9);
  game.fireTimer = -100000;
  let peakChains = 0;
  for (let i = 0; i < 1800 && game.phase === 'playing'; i++) {
    advance(game, 0.05);
    peakChains = Math.max(peakChains, game.chains.length);
  }
  assert.equal(peakChains, 1);
  assert.equal(game.phase, 'defeat');
  assert.ok(game.runTime > 30, `只撐了 ${game.runTime} 秒`);
  assert.ok(new Set(WAVES.map(wave => wave.path)).size >= 5);
});

test('擊破進度會改變感染區，但普通怪保持同一顆頭', () => {
  const game = startRun(9);
  advance(game, 0.05);
  const chain = game.chains[0];
  for (const piece of [...chain.segments.slice(1, 48)]) {
    hitSegment(game, chain, piece, piece.hp + 1);
    if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
  }
  assert.equal(game.wave, 2);
  assert.equal(game.chains.length, 1);
  assert.equal(game.chains[0].id, chain.id);
});

test('任何頭部碰到底線立刻失敗，不會整條瞬移退回', () => {
  for (const bossFight of [false, true]) {
    const game = startRun(10);
    if (bossFight) { game.encounter = 'boss'; game.wave = 6; }
    advance(game, 0.05);
    const chain = game.chains.find(item => item.boss === bossFight);
    assert.ok(chain);
    chain.travel = routeLength(chain.path, chain.boss, chain.lane) + 5;
    chain.segments[0].routeDistance = chain.travel;
    const before = chain.travel;
    advance(game, 0.05);
    assert.equal(game.phase, 'defeat');
    assert.ok(chain.travel >= before);
  }
});

test('中央守點與底線迎擊都固定角色座標，只接受瞄準角度', () => {
  for (const chapter of [1, 3]) {
    const game = startRun(72, {}, chapter);
    const origin = { x: game.player.x, y: game.player.y };
    advance(game, 0.05, { aimAngle: Math.PI / 3 });
    assert.deepEqual({ x: game.player.x, y: game.player.y }, origin);
    assert.ok(Math.abs(game.player.aimAngle - Math.PI / 3) < 0.001);
  }
});

test('藥丸沿原地瞄準方向發射', () => {
  const game = startRun(73);
  game.player.aimAngle = 0;
  game.fireTimer = 1;
  advance(game, 0.01, { aimAngle: 0 });
  assert.ok(game.bullets.length > 0);
  assert.ok(game.bullets[0].vx > 0);
  assert.ok(Math.abs(game.bullets[0].vy) < 0.001);
});

test('技能三選一可免費刷新，實際效果涵蓋不同流派', () => {
  assert.ok(UPGRADES.length >= 24);
  assert.ok(new Set(UPGRADES.map(item => item.category)).size >= 4);
  const game = startRun(11);
  advance(game, 0.05);
  const chain = game.chains[0];
  const chest = chain.segments.find(segment => segment.chest);
  hitSegment(game, chain, chest, chest.hp + 1);
  const previous = game.choices;
  assert.equal(rerollUpgrades(game), true);
  assert.equal(game.rerollsLeft, 0);
  assert.ok(game.choices.some(id => !previous.includes(id)));
});

test('範圍技能無法代替瞄準打開寶箱', () => {
  const game = startRun(55);
  advance(game, 0.05);
  const chain = game.chains[0];
  const chest = chain.segments.find(segment => segment.chest);
  const hp = chest.hp;
  hitSegment(game, chain, chest, 100000, { special: true });
  assert.equal(chest.hp, hp);
  assert.equal(game.phase, 'playing');
});

test('固定站在中央亂射不足以通關', () => {
  let victories = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const game = startRun(seed);
    for (let i = 0; i < 8000 && !['victory', 'defeat'].includes(game.phase); i++) {
      if (game.phase === 'upgrade') {
        const rank = ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce'];
        chooseUpgrade(game, rank.find(id => game.choices.includes(id)) || game.choices[0]);
      }
      advance(game, 0.05, { aimAngle: -Math.PI / 2 });
    }
    if (game.phase === 'victory') victories++;
  }
  assert.ok(victories <= 2, `固定站樁在 20 次中竟通關 ${victories} 次`);
});

test('固定角色主動轉向打箱並攔截來彈，可通過完整長局', () => {
  const game = startRun(5);
  for (let i = 0; i < 8500 && !['victory', 'defeat'].includes(game.phase); i++) {
    if (game.phase === 'upgrade') chooseUpgrade(game, choosePilotUpgrade(game));
    advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
  }
  assert.equal(game.phase, 'victory', `敗在 ${game.encounter}，${game.runTime.toFixed(1)} 秒，耐久 ${game.core}，清掉 ${game.normalDestroyed} 節`);
});

test('三個可選關卡具有不同進攻路線與難度', () => {
  const games = [1, 2, 3].map(chapter => startRun(20, {}, chapter));
  for (const game of games) advance(game, 0.05);
  assert.equal(new Set(games.map(game => game.chains[0].path)).size, 3);
  assert.ok(games[0].chains[0].segments[1].maxHp
    < games[1].chains[0].segments[1].maxHp);
  assert.ok(games[1].chains[0].segments[1].maxHp
    < games[2].chains[0].segments[1].maxHp);
});

test('完成局外研究後，最難關卡仍有可通關路徑', () => {
  const game = startRun(19, { fire: 4, guard: 4, scavenge: 4 }, 3);
  for (let i = 0; i < 8500 && !['victory', 'defeat'].includes(game.phase); i++) {
    if (game.phase === 'upgrade') chooseUpgrade(game, choosePilotUpgrade(game));
    advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
  }
  assert.equal(game.phase, 'victory');
});
