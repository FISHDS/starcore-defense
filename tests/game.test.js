import test from 'node:test';
import assert from 'node:assert/strict';
import { startRun, advance, chooseUpgrade, chooseRoute, rerollUpgrades, UPGRADES, WAVES, WIDTH } from '../dist/src/game.js';

test('開局先有一條多節敵群，玩家沿底部橫向移動', () => {
  const game = startRun(123);
  advance(game, 0.1, 70);
  assert.equal(game.player.x, 70);
  assert.ok(game.chains.length > 0);
  assert.ok(game.chains[0].segments.length >= 14);
  assert.ok(game.chains[0].segments.every(segment => Number.isFinite(segment.hp)));
});

test('同一條敵群的節點會沿路線前進並保有盤旋間距', () => {
  const game = startRun(4);
  advance(game, 0.1);
  const chain = game.chains[0];
  const before = chain.segments[0].y;
  advance(game, 1);
  assert.ok(chain.segments[0].y > before);
  assert.ok(chain.segments.some((segment, i) => i > 0 && segment.x !== chain.segments[0].x));
  assert.ok(chain.segments[0].y > chain.segments.at(-1).y);
});

test('玩家射擊會傷害敵群單節並顯示傷害數字', () => {
  const game = startRun(5);
  advance(game, 0.01);
  const segment = game.chains[0].segments[1];
  const hp = segment.hp;
  game.bullets.push({ x: segment.x, y: segment.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07, 20);
  assert.ok(segment.hp < hp);
  assert.ok(game.popups.some(popup => popup.value > 0));
});

test('擊中頭節弱點有額外傷害，擊破一節會得分', () => {
  const game = startRun(6);
  advance(game, 0.01);
  const head = game.chains[0].segments[0];
  head.hp = 20;
  game.bullets.push({ x: head.x, y: head.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07, 20);
  assert.ok(game.score > 0);
  assert.equal(head.hp <= 0, true);
});

test('整條敵群越過底線會扣耐久並在歸零時結束', () => {
  const game = startRun(7);
  advance(game, 0.01);
  game.core = 5;
  const chain = game.chains[0];
  chain.travel = 4000;
  advance(game, 0.1);
  assert.equal(game.core, 0);
  assert.equal(game.phase, 'defeat');
});

test('雙頭目迂迴後到達底線會留下持續施壓，玩家仍可反擊', () => {
  const game = startRun(72);
  game.wave = WAVES.length;
  advance(game, 0.01);
  const boss = game.chains.find(chain => chain.boss);
  const ySamples = [];
  for (let distance = 360; distance <= 1900; distance += 35) {
    boss.travel = distance;
    advance(game, 0);
    ySamples.push(boss.segments[0].y);
  }
  assert.ok(ySamples.some((y, index) => index && y < ySamples[index - 1]));
  boss.travel = 5000;
  const before = game.core;
  advance(game, 0.1);
  assert.equal(game.phase, 'playing');
  assert.ok(game.core < before);
  assert.equal(boss.atBase, true);
  assert.ok(boss.segments[0].y > 650 && boss.segments[0].y < 720);
  const afterFirst = game.core;
  advance(game, 3.1);
  assert.ok(game.core < afterFirst);
  assert.equal(boss.atBase, true);
  const head = boss.segments[0];
  head.hp = 10;
  for (const segment of boss.segments.slice(1)) segment.hp = 0;
  game.bullets.push({ x: head.x, y: head.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07);
  assert.ok(head.hp <= 0);
});

test('多路線敵群在十秒內維持於防線上方，保留應對時間', () => {
  for (let wave = 1; wave <= WAVES.length; wave++) {
    const game = startRun(73);
    game.wave = wave;
    advance(game, 10);
    assert.equal(game.phase, 'playing');
    assert.equal(game.core, 100);
    assert.ok(game.chains.every(chain => chain.segments[0].y < 560));
  }
});

test('清完一波可以選擇下一條安全或高風險路線', () => {
  const game = startRun(8);
  advance(game, 0.01);
  game.chains = [];
  game.spawnCount = WAVES[0].chainCount;
  game.waveTime = WAVES[0].duration;
  advance(game, 0.01);
  assert.equal(game.phase, 'route');
  assert.deepEqual(game.routeChoices, ['stable', 'volatile']);
  assert.equal(chooseRoute(game, 'volatile'), true);
  assert.equal(game.routeId, 'volatile');
  assert.ok(game.bonusDNA > 0);
  assert.equal(game.wave, 2);
});

test('高風險路線的敵人會更強，研究點獎勵也更高', () => {
  const stable = startRun(71);
  const volatile = startRun(71);
  for (const game of [stable, volatile]) {
    game.phase = 'route';
    game.routeChoices = ['stable', 'volatile'];
  }
  chooseRoute(stable, 'stable');
  chooseRoute(volatile, 'volatile');
  advance(stable, 0.01);
  advance(volatile, 0.01);
  assert.ok(volatile.chains[0].segments[0].maxHp > stable.chains[0].segments[0].maxHp);
  assert.ok(volatile.bonusDNA > stable.bonusDNA);
});

test('多發射擊與蓄能環會累積為不同武器效果', () => {
  const game = startRun(9);
  game.upgrades = { multi: 2, orbit: 1 };
  for (let i = 0; i < 13; i++) advance(game, 0.1, WIDTH / 2);
  assert.ok(game.bullets.length >= 3);
  assert.ok(game.effects.some(effect => effect.kind === 'orbit'));
});

test('六波敵群採用不同路線，最後有兩隻交疊頭目', () => {
  assert.ok(new Set(WAVES.map(wave => wave.path)).size >= 5);
  const game = startRun(10);
  game.wave = WAVES.length;
  advance(game, 0.01);
  const bosses = game.chains.filter(chain => chain.boss);
  assert.equal(bosses.length, 2);
  assert.ok(bosses.every(boss => boss.segments.length >= 24));
  assert.notEqual(bosses[0].segments[3].x, bosses[1].segments[3].x);
  const head = bosses[0].segments[0];
  head.hp = 10;
  game.bullets.push({ x: head.x, y: head.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07);
  assert.equal(game.phase, 'playing');
  const second = bosses[1].segments[0];
  second.hp = 10;
  game.bullets.push({ x: second.x, y: second.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07);
  assert.equal(game.phase, 'victory');
});

test('同一瞬間擊破頭目與受到攻擊時保留勝利結果', () => {
  const game = startRun(11);
  game.wave = WAVES.length;
  advance(game, 0.01);
  const head = game.boss.segments[0];
  head.hp = 10;
  for (const other of game.chains.filter(chain => chain.boss && chain !== game.boss)) {
    other.segments[0].hp = 0;
  }
  game.core = 5;
  game.bullets.push({ x: head.x, y: head.y + 35, damage: 20, pierce: 0, hit: [] });
  game.enemyBullets.push({ x: game.player.x, y: game.player.y - 5, vx: 0, vy: 0, radius: 8 });
  advance(game, 0.07);
  assert.equal(game.phase, 'victory');
});

test('戰鬥中會出現寶箱，射破後暫停並給三個技能選項', () => {
  const game = startRun(12);
  advance(game, 6.1);
  assert.ok(game.chest);
  const chest = game.chest;
  chest.hp = 10;
  game.bullets.push({ x: chest.x, y: chest.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07, chest.x);
  assert.equal(game.phase, 'upgrade');
  assert.equal(game.upgradeSource, 'chest');
  assert.equal(game.choices.length, 3);
});

test('寶箱技能選完會回到原本戰鬥，保留同波敵群', () => {
  const game = startRun(13);
  advance(game, 6.1);
  const chainIds = game.chains.map(chain => chain.id);
  game.chest.hp = 10;
  game.bullets.push({ x: game.chest.x, y: game.chest.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07, game.chest.x);
  const wave = game.wave;
  const selected = game.choices[0];
  chooseUpgrade(game, selected);
  assert.equal(game.phase, 'playing');
  assert.equal(game.wave, wave);
  assert.deepEqual(game.chains.map(chain => chain.id), chainIds);
  assert.equal(game.upgrades[selected], 1);
});

test('技能有稀有度，寶箱三選一可免費刷新一次', () => {
  assert.deepEqual(new Set(UPGRADES.map(item => item.rarity)), new Set(['common', 'rare', 'epic']));
  const game = startRun(14);
  advance(game, 6.1);
  game.chest.hp = 10;
  game.bullets.push({ x: game.chest.x, y: game.chest.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07, game.chest.x);
  const previous = game.choices;
  assert.equal(game.rerollsLeft, 1);
  assert.equal(rerollUpgrades(game), true);
  assert.equal(game.rerollsLeft, 0);
  assert.equal(game.choices.length, 3);
  assert.ok(game.choices.some(id => !previous.includes(id)));
  assert.equal(rerollUpgrades(game), false);
  assert.equal(chooseUpgrade(game, game.choices[0]), true);
});
