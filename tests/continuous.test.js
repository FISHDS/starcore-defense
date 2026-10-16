import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, hitSegment, startRun } from '../dist/src/game.js';
import { routeLength, routePosition } from '../dist/src/routes.js';

test('同一條長鏈後段達數萬血，玩家火力隨進度成長', () => {
  const game = startRun(12);
  game.normalDestroyed = 150;
  advance(game, 0.05);
  const chain = game.chains[0];
  assert.ok(chain.segments.at(-1).maxHp > 20000);
  assert.ok(getShotDamage(game) > 500);
});

test('被擊破的身體會補齊間距，尾巴仍連成一條', () => {
  const game = startRun(13);
  advance(game, 0.05);
  const chain = game.chains[0];
  const id = chain.segments[20].id;
  const head = chain.segments[0];
  const before = { x: head.x, y: head.y };
  hitSegment(game, chain, chain.segments[20], 100000);
  assert.ok(!chain.segments.some(segment => segment.id === id));
  assert.ok(chain.segments.every((segment, index) => segment.index === index));
  assert.deepEqual({ x: head.x, y: head.y }, before, '擊破當下不能讓頭部跳格');
  advance(game, 0.05);
  assert.ok(Math.hypot(head.x - before.x, head.y - before.y) < 20,
    '下一影格仍須連續移動');
  for (let i = 0; i < 14; i++) advance(game, 0.05);
  assert.ok(chain.segments[19].routeDistance > chain.segments[20].routeDistance);
  assert.ok(Math.abs(head.routeDistance - chain.travel) < 12,
    '頭部與預定位置不能拖出明顯的卡頓距離');
});

test('範圍攻擊連續擊破多節時，頭部仍逐格後退', () => {
  const game = startRun(14);
  advance(game, 0.05);
  const chain = game.chains[0];
  const before = { x: chain.segments[0].x, y: chain.segments[0].y };
  const targets = chain.segments.slice(20, 26);
  for (const target of targets) hitSegment(game, chain, target, target.hp + 1);
  advance(game, 0.05);
  const head = chain.segments[0];
  assert.ok(Math.hypot(head.x - before.x, head.y - before.y) <= 22,
    '連續擊破讓頭部單格跳太遠');
});

test('寶箱在前段有可直接射擊的空隙，長鏈行列不大面積重疊', () => {
  const game = startRun(17);
  let accessible = false;
  let crowding = 0;
  for (let frame = 0; frame < 500 && game.phase === 'playing'; frame++) {
    advance(game, 0.05, 24);
    const chain = game.chains[0];
    if (!chain) continue;
    const bodies = chain.segments.filter(piece => piece.y > 120 && piece.y < 710);
    const chests = bodies.filter(piece => piece.chest);
    for (const chest of chests) {
      const blockers = bodies.filter(piece => piece !== chest && piece.y > chest.y + 5
        && Math.abs(piece.x - chest.x) < piece.radius + 4);
      if (blockers.length === 0) accessible = true;
    }
    const separated = bodies.filter(piece => bodies.some(other => other !== piece
      && Math.abs(other.index - piece.index) > 3
      && Math.hypot(other.x - piece.x, other.y - piece.y) < 28));
    crowding = Math.max(crowding, separated.length / Math.max(1, bodies.length));
  }
  assert.ok(accessible, '前段寶箱始終沒有從下往上的射擊空隙');
  assert.ok(crowding < 0.35, `不相鄰的身體重疊率 ${crowding}`);
});

test('開局長鏈已進入可見戰場且寶箱可直接瞄準', () => {
  for (const chapter of [1, 2, 3]) {
    const game = startRun(19, {}, chapter);
    advance(game, 0.05);
    const chain = game.chains[0];
    const anchorDistance = Math.hypot(chain.segments[0].x - game.player.x,
      chain.segments[0].y - game.player.y);
    assert.ok(anchorDistance > 120 && anchorDistance < 430,
      `第 ${chapter} 關頭部與固定角色距離 ${anchorDistance.toFixed(0)} 不合理`);
    const visible = chain.segments.filter(piece => piece.x > 20 && piece.x < 370
      && piece.y > 120 && piece.y < 720);
    assert.ok(visible.length >= 25, `第 ${chapter} 關開局只有 ${visible.length} 節可見`);
    assert.ok(visible.some(piece => piece.chest));
  }
});

test('岔路路線同時覆蓋畫面左右側，玩家可原地轉向迎擊', () => {
  const length = routeLength('fork', false, 0);
  const points = Array.from({ length: 10000 }, (_, index) =>
    routePosition('fork', false, 0, length * index / 10000));
  assert.ok(Math.min(...points.map(point => point.x)) < 80);
  assert.ok(Math.max(...points.map(point => point.x)) > 310);
});

test('實際藥丸可以在開局打開身體上的寶箱', () => {
  for (const chapter of [1, 2, 3]) {
    const game = startRun(31, {}, chapter);
    for (let i = 0; i < 120 && game.phase === 'playing'; i++) {
      const chest = game.chains.flatMap(chain => chain.segments)
        .filter(piece => piece.chest && piece.y > 70 && piece.y < 760
          && piece.x > 0 && piece.x < 390)
        .sort((a, b) => Math.hypot(a.x - game.player.x, a.y - game.player.y)
          - Math.hypot(b.x - game.player.x, b.y - game.player.y))[0];
      const aimAngle = chest
        ? Math.atan2(chest.y - game.player.y, chest.x - game.player.x)
        : game.player.aimAngle;
      advance(game, 0.05, { aimAngle });
    }
    assert.equal(game.phase, 'upgrade', `第 ${chapter} 關的寶箱打不開`);
  }
});

test('雙頭目有交錯掩護的身體節點', () => {
  const distance = 1400;
  const left = Array.from({ length: 45 }, (_, index) =>
    routePosition('cross', true, 0, distance - index * 31));
  const right = Array.from({ length: 45 }, (_, index) =>
    routePosition('cross', true, 1, distance - index * 31));
  assert.ok(left.some(a => right.some(b => Math.hypot(a.x - b.x, a.y - b.y) < 40)));
});
