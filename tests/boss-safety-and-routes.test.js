import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, hitSegment, startRun } from '../dist/src/game.js';
import { routeLength, routePosition } from '../dist/src/routes.js';
import { bossRosterIndexFor } from '../dist/src/boss-profiles.js';

test('頭目繞行完整畫面區域，不沿直線直接衝向底線', () => {
  const path = 'boss-route-0';
  const length = routeLength(path, true, 0);
  const points = Array.from({ length: 101 }, (_, index) =>
    routePosition(path, true, 0, length * index / 100));
  assert.ok(Math.min(...points.map(point => point.x)) < 55);
  assert.ok(Math.max(...points.map(point => point.x)) > 335);
  assert.ok(Math.min(...points.map(point => point.x)) >= 45,
    '頭部不能超出左側畫布');
  assert.ok(Math.max(...points.map(point => point.x)) <= 345,
    '頭部不能超出右側畫布');
  assert.ok(Math.min(...points.map(point => point.y)) < 230);
  assert.ok(Math.max(...points.map(point => point.y)) > 680);
  assert.ok(Math.min(...points.map(point => point.y)) >= 180,
    '盤旋路段不可鑽進頂部 HUD 後方');
  const verticalChanges = points.slice(1).filter((point, index) =>
    (point.y - points[index].y) * (points[index].y - points[index - 1]?.y || 0) < 0);
  assert.ok(verticalChanges.length >= 2, '路線應有前後盤旋而非單向下衝');
});

test('中央守點頭目環繞可戰鬥區域，不被頂部狀態列遮住', () => {
  const path = 'center-boss-route-5';
  const length = routeLength(path, true, 0);
  const points = Array.from({ length: 101 }, (_, index) =>
    routePosition(path, true, 0, length * index / 100));
  assert.ok(Math.min(...points.map(point => point.x)) < 75);
  assert.ok(Math.max(...points.map(point => point.x)) > 315);
  assert.ok(Math.min(...points.map(point => point.x)) >= 45,
    '中央頭目不能被左側畫布切掉');
  assert.ok(Math.max(...points.map(point => point.x)) <= 345,
    '中央頭目不能被右側畫布切掉');
  assert.ok(Math.min(...points.map(point => point.y)) >= 225,
    '頭部半徑需與頂部狀態列留出空隙');
  assert.ok(Math.max(...points.map(point => point.y)) > 620);
  assert.ok(Math.hypot(points.at(-1).x - 195, points.at(-1).y - 422) < 2,
    '頭目路徑最後應抵達核心路線終點');
});

test('25關各自的頭目路線都穿過畫面左右與前後區域後才收向終點', () => {
  for (const stage of CHAPTERS) {
    const prefix = stage.positionMode === 'center' ? 'center-' : '';
    const path = `${prefix}boss-route-${bossRosterIndexFor(stage.id)}`;
    const length = routeLength(path, true, 0);
    const points = Array.from({ length: 101 }, (_, index) =>
      routePosition(path, true, 0, length * index / 100));
    const x = points.map(point => point.x);
    const y = points.map(point => point.y);
    assert.ok(Math.max(...x) - Math.min(...x) > 240,
      `第${stage.id}關應充分使用畫面左右空間`);
    assert.ok(Math.max(...y) - Math.min(...y) > 340,
      `第${stage.id}關應有前後盤旋`);
    assert.ok(Math.min(...y) >= 180, `第${stage.id}關頭部不可被HUD遮住`);
    if (stage.positionMode === 'center') {
      assert.ok(Math.hypot(points.at(-1).x - 195, points.at(-1).y - 422) < 2);
    } else {
      assert.ok(points.at(-1).y >= 758,
        '底線頭目終點應越過畫面外圍');
    }
  }
});

test('頭目戰沒有敵方攻擊、扣血或攻擊預警', () => {
  const game = startRun(43, {}, 1);
  game.encounter = 'boss';
  for (let step = 0; step < 400; step++) advance(game, 0.05);
  assert.equal('bossAttackCount' in game, false);
  assert.equal('enemyBullets' in game, false);
    assert.equal('core' in game, false);
    assert.ok(game.bosses.every(boss => !('telegraphFor' in boss.rig)));
    assert.ok(game.bosses.every(boss => !('shielded' in boss)
      && boss.segments.every(piece => piece.armorHp === 0)));
});

test('終局雙頭目同時直接承受傷害，沒有護盾狀態', () => {
  const game = startRun(59, {}, 25);
  game.encounter = 'boss';
  advance(game, 0.05);
  assert.ok(game.bosses.every(boss => !('shielded' in boss)));
  for (const boss of game.bosses) {
    const piece = boss.segments.find(segment => segment.index > 0 && !segment.chest);
    const before = piece.hp;
    assert.equal(hitSegment(game, boss, piece, 100), true);
    assert.equal(piece.hp, before - 100);
  }
});

test('護甲型頭目身節也會完整扣血，沒有先吸收傷害的護層', () => {
  assert.equal(CHAPTERS[3].bossMode, 'weakpoint');
  const game = startRun(73, {}, 4);
  game.encounter = 'boss';
  advance(game, 0.05);
  const boss = game.bosses[0];
  const piece = boss.segments.find(segment => segment.index > 0
    && !segment.chest);
  assert.equal(piece.armorHp, 0);
  const before = piece.hp;
  hitSegment(game, boss, piece, 100);
  assert.equal(piece.hp, before - 100);
});

test('頭目身上的寶箱不會被護箱節減傷', () => {
  const game = startRun(79, {}, 7);
  game.encounter = 'boss';
  advance(game, 0.05);
  const boss = game.bosses[0];
  const chest = boss.segments.find(segment => segment.chest && segment.depth === 5);
  assert.ok(chest);
  const before = chest.hp;
  hitSegment(game, boss, chest, 100);
  assert.equal(chest.hp, before - 100);
});
