import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, getShotDamage, hitSegment, startRun } from '../dist/src/game.js';
import * as gameplay from '../dist/src/game.js';

test('雙頭關卡進度根據實際清掉的身體而不是經過的時間', () => {
  const game = startRun(40, {}, 10);
  game.runTime = 200;
  assert.equal(typeof gameplay.getRunProgress, 'function');
  assert.equal(gameplay.getRunProgress(game), 0);
  game.normalDestroyed = Math.floor(game.normalTotal / 2);
  assert.ok(gameplay.getRunProgress(game) > 0.35 && gameplay.getRunProgress(game) < 0.45);
  game.encounter = 'boss';
  game.normalDestroyed = game.normalTotal;
  game.bossDestroyed = 41;
  assert.ok(gameplay.getRunProgress(game) > 0.85 && gameplay.getRunProgress(game) < 0.95);
});

test('普通戰鬥只有一顆頭，時間跨區域也不產生新頭', () => {
  const game = startRun(41);
  advance(game, 0.05);
  const first = game.chains[0];
  assert.ok(first.segments.length >= 180);
  assert.ok(first.segments.at(-1).x < 0);
  for (const time of [49, 98, 150, 205, 260]) {
    game.runTime = time;
    advance(game, 0.05);
    assert.equal(game.chains.filter(chain => !chain.dead && !chain.boss).length, 1);
    assert.equal(game.chains[0].id, first.id);
    assert.equal(game.bosses.length, 0);
  }
});

test('同一條身體由前到後增強，刪除前段後原有強度不變', () => {
  const game = startRun(42);
  advance(game, 0.05);
  const chain = game.chains[0];
  const front = chain.segments[1];
  const middle = chain.segments[100];
  const rear = chain.segments.at(-1);
  assert.ok(front.maxHp >= 45 && front.maxHp <= 80, `前段血量 ${front.maxHp}`);
  assert.ok(middle.maxHp > 1000, `中段血量 ${middle.maxHp}`);
  assert.ok(rear.maxHp > 20000, `後段血量 ${rear.maxHp}`);
  const middleHp = middle.maxHp;
  for (const piece of chain.segments.slice(1, 16)) {
    hitSegment(game, chain, piece, piece.hp + 1);
    if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
  }
  assert.equal(middle.maxHp, middleHp);
  assert.ok(middle.index < 100);
});

test('完整長鏈的自然火力成長不超過前段的二十五倍', () => {
  const game = startRun(47);
  const opening = getShotDamage(game);
  game.normalDestroyed = game.normalTotal;
  const late = getShotDamage(game);
  assert.ok(late > opening * 8, `後段火力只成長 ${late / opening} 倍`);
  assert.ok(late < opening * 25, `後段火力暴增 ${late / opening} 倍`);
});

test('一節身體被打爆時頭部先明顯沿路後退', () => {
  const game = startRun(43);
  advance(game, 0.05);
  const chain = game.chains[0];
  const head = chain.segments[0];
  const before = head.routeDistance;
  const piece = chain.segments[12];
  hitSegment(game, chain, piece, piece.hp + 1);
  advance(game, 0.05);
  assert.ok(head.routeDistance < before - 8,
    `頭部只退了 ${(before - head.routeDistance).toFixed(1)} 像素`);
});

test('擊破身體後由頭部收回一節，後段不被往回拖', () => {
  const game = startRun(46);
  advance(game, 0.05);
  const chain = game.chains[0];
  chain.speed = 0;
  game.fireTimer = -100;
  const head = chain.segments[0];
  const rear = chain.segments[3];
  const beforeHead = head.routeDistance;
  const beforeRear = rear.routeDistance;
  const piece = chain.segments[2];
  hitSegment(game, chain, piece, piece.hp + 1);
  for (let i = 0; i < 12; i++) advance(game, 0.05);
  assert.ok(head.routeDistance < beforeHead - 25);
  assert.ok(Math.abs(rear.routeDistance - beforeRear) < 3,
    `後段位移 ${Math.round(rear.routeDistance - beforeRear)} 像素`);
});

test('畫面外等待進場的尾部不會被自動武器提前打掉', () => {
  const game = startRun(45);
  advance(game, 0.05);
  const chain = game.chains[0];
  const hidden = chain.segments.slice(1).filter(piece => piece.x < -35);
  assert.ok(hidden.length > 50);
  for (const piece of chain.segments.slice(1)) {
    if (piece.x >= -35 && piece.x <= 425) piece.hp = 0;
  }
  game.upgrades.drone = 1;
  game.specialTimers.drone = 1.2;
  game.fireTimer = -100;
  const before = new Map(hidden.map(piece => [piece.id, piece.hp]));
  advance(game, 0.05);
  assert.ok(hidden.filter(piece => piece.x < -35)
    .every(piece => piece.hp === before.get(piece.id)));
});

test('補給箱沿整條身體分布，打光後立即進入該關頭目', () => {
  const game = startRun(44);
  advance(game, 0.05);
  const chain = game.chains[0];
  const chests = chain.segments.filter(piece => piece.chest);
  assert.ok(chests.length >= 6);
  assert.ok(chests.some(piece => piece.gold));
  assert.ok(chests.some(piece => piece.index > 120));
  for (const piece of [...chain.segments.slice(1)]) {
    hitSegment(game, chain, piece, piece.hp + 1);
    if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
  }
  assert.equal(chain.dead, true);
  advance(game, 0.05);
  assert.equal(game.chains.filter(item => !item.dead && item.boss).length, 1);
  const boss = game.bosses[0];
  const segment = boss.segments[1];
  hitSegment(game, boss, segment, segment.hp + 1);
  assert.equal(game.bossDestroyed, 1);
  assert.equal(game.normalDestroyed, game.normalTotal);
});
