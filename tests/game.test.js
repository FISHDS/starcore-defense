import test from 'node:test';
import assert from 'node:assert/strict';
import { startRun, advance, chooseUpgrade, WAVES, WIDTH } from '../dist/src/game.js';

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
  chain.travel = 2300;
  advance(game, 0.1);
  assert.equal(game.core, 0);
  assert.equal(game.phase, 'defeat');
});

test('清完一波可從三個不同強化中擇一', () => {
  const game = startRun(8);
  advance(game, 0.01);
  game.chains = [];
  game.spawnCount = WAVES[0].chainCount;
  game.waveTime = WAVES[0].duration;
  advance(game, 0.01);
  assert.equal(game.phase, 'upgrade');
  assert.equal(game.choices.length, 3);
  assert.equal(new Set(game.choices).size, 3);
  const selected = game.choices[0];
  assert.equal(chooseUpgrade(game, selected), true);
  assert.equal(game.upgrades[selected], 1);
  assert.equal(game.wave, 2);
});

test('多發射擊與蓄能環會累積為不同武器效果', () => {
  const game = startRun(9);
  game.upgrades = { multi: 2, orbit: 1 };
  for (let i = 0; i < 13; i++) advance(game, 0.1, WIDTH / 2);
  assert.ok(game.bullets.length >= 3);
  assert.ok(game.effects.some(effect => effect.kind === 'orbit'));
});

test('最後一波有大型多節敵群，擊破頭部弱點即可獲勝', () => {
  const game = startRun(10);
  game.wave = WAVES.length;
  advance(game, 0.01);
  const boss = game.chains.find(chain => chain.boss);
  assert.ok(boss);
  assert.ok(boss.segments.length >= 24);
  const head = boss.segments[0];
  head.hp = 10;
  game.bullets.push({ x: head.x, y: head.y + 35, damage: 20, pierce: 0, hit: [] });
  advance(game, 0.07);
  assert.equal(game.phase, 'victory');
});

test('同一瞬間擊破頭目與受到攻擊時保留勝利結果', () => {
  const game = startRun(11);
  game.wave = WAVES.length;
  advance(game, 0.01);
  const head = game.boss.segments[0];
  head.hp = 10;
  game.core = 5;
  game.bullets.push({ x: head.x, y: head.y + 35, damage: 20, pierce: 0, hit: [] });
  game.enemyBullets.push({ x: game.player.x, y: game.player.y - 5, vx: 0, vy: 0, radius: 8 });
  advance(game, 0.07);
  assert.equal(game.phase, 'victory');
});
