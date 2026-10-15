import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, hitSegment, rerollUpgrades, startRun, UPGRADES, WAVES } from '../dist/src/game.js';

test('長鏈頭部不受傷，身體被打爆會使頭部沿路後退', () => {
  const game = startRun(7);
  advance(game, 0.05);
  const chain = game.chains[0];
  assert.ok(chain.segments.length >= 55);
  const head = chain.segments[0];
  const oldTravel = chain.travel;
  hitSegment(game, chain, head, 100000);
  assert.equal(head.hp, head.maxHp);
  assert.equal(chain.segments[0], head);
  const body = chain.segments[1];
  hitSegment(game, chain, body, body.hp + 1);
  assert.ok(chain.segments.length >= 55);
  assert.ok(chain.travel < oldTravel);
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

test('戰鬥持續出怪，區域變換不中斷且路線不同', () => {
  const game = startRun(9);
  game.core = game.maxCore = 100000;
  game.fireTimer = -100000;
  let peakChains = 0;
  const paths = new Set();
  for (let i = 0; i < 1800; i++) {
    advance(game, 0.05);
    peakChains = Math.max(peakChains, game.chains.length);
    for (const chain of game.chains) paths.add(chain.path);
  }
  assert.ok(peakChains >= 3);
  assert.ok(game.wave >= 2);
  assert.equal(game.phase, 'playing');
  assert.ok(paths.size >= 2);
  assert.ok(new Set(WAVES.map(wave => wave.path)).size >= 5);
});

test('頭目第一次碰底線會後退並留下補救時間', () => {
  const game = startRun(10);
  game.runTime = 253;
  game.nextSpawnAt = 253;
  advance(game, 0.05);
  const boss = game.chains.find(chain => chain.boss);
  assert.ok(boss);
  boss.travel = 5000;
  const before = game.core;
  advance(game, 0.05);
  assert.ok(game.core < before);
  assert.equal(game.phase, 'playing');
  assert.ok(boss.travel < 5000);
  assert.ok(game.chains.includes(boss));
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
  const game = startRun(123);
  for (let i = 0; i < 8000 && !['victory', 'defeat'].includes(game.phase); i++) {
    if (game.phase === 'upgrade') {
      const rank = ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce'];
      chooseUpgrade(game, rank.find(id => game.choices.includes(id)) || game.choices[0]);
    }
    advance(game, 0.05, 195);
  }
  assert.equal(game.phase, 'defeat');
});

test('主動追箱並守住迫近敵群，有機會通過完整長局', () => {
  const game = startRun(2);
  for (let i = 0; i < 8500 && !['victory', 'defeat'].includes(game.phase); i++) {
    if (game.phase === 'upgrade') {
      const rank = ['power', 'rapid', 'multi', 'arc', 'orbit', 'drone', 'blast', 'pierce'];
      chooseUpgrade(game, rank.find(id => game.choices.includes(id)) || game.choices[0]);
    }
    const threat = game.chains.filter(chain => !chain.dead && chain.segments[0].y > 580)
      .sort((a, b) => b.segments[0].y - a.segments[0].y)[0];
    const bodies = game.chains.flatMap(chain => chain.segments.slice(1)
      .filter(segment => segment.y > 220 && segment.y < 710));
    const chest = bodies.filter(segment => segment.chest).sort((a, b) => b.y - a.y)[0];
    const near = bodies.sort((a, b) => b.y - a.y)[0];
    const guard = threat?.segments.slice(1, 8).find(segment => segment.y < 710);
    advance(game, 0.05, guard?.x ?? chest?.x ?? near?.x ?? 195);
  }
  assert.equal(game.phase, 'victory');
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
