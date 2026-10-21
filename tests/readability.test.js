import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, createBossShowcase, startRun } from '../dist/src/game.js';
import { breachPressure, selectDamagePopups, selectHealthLabels, visibleChests } from '../dist/src/render.js';
import { routeLength } from '../dist/src/routes.js';

test('頭目走近守點才出現危險光環，後退時會同步減弱', () => {
  const game = startRun(8, {}, 1);
  advance(game, 0.05);
  const head = game.bosses[0].segments[0];
  const length = routeLength(game.bosses[0].path, true, 0);
  head.routeDistance = length * 0.5;
  assert.equal(breachPressure(game), 0);
  head.routeDistance = length * 0.85;
  assert.ok(breachPressure(game) > 0.6);
  head.routeDistance = length * 0.7;
  assert.ok(breachPressure(game) < 0.2);
});

test('頭目身體較密時只顯示少量分開的血量，寶箱周圍保持淨空', () => {
  const game = startRun(1);
  game.fireTimer = -100000;
  for (let frame = 0; frame < 1000 && game.phase === 'playing'
    && visibleChests(game.chains).length === 0; frame++) {
    if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
    advance(game, 0.05);
  }
  const labels = selectHealthLabels(game.chains);
  const chest = visibleChests(game.chains)[0];

  assert.ok(chest, '寶箱應隨長鏈行軍進入可見戰場');
  assert.ok(labels.length > 0);
  assert.ok(labels.length <= 4, `顯示了 ${labels.length} 個血量`);
  assert.ok(labels.every(piece => piece.x >= 20 && piece.x <= 370),
    '畫面外的身體佔用了血量標示名額');
  assert.ok(visibleChests(game.chains).every(piece => piece.x >= 20 && piece.x <= 370));
  assert.ok(game.chains[0].segments.at(-1).maxHp > game.chains[0].segments[1].maxHp,
    '頭目尾段耐久應高於前段');
  assert.ok(labels.every(piece => !piece.chest && piece.index > 0));
  assert.ok(labels.every(piece => Math.hypot(piece.x - chest.x, piece.y - chest.y) >= 48));
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      assert.ok(Math.abs(labels[i].x - labels[j].x) >= 65
        || Math.abs(labels[i].y - labels[j].y) >= 80);
    }
  }
});

test('頭目每個共享血量組只顯示一個血量標籤', () => {
  const game = createBossShowcase(2, 1);
  const boss = game.bosses[0];
  const labels = selectHealthLabels(game.chains);
  assert.ok(boss.healthGroups.length > 0);
  assert.ok(labels.length > 0, '預覽場上的頭目應顯示共享血量');
  assert.ok(labels.every(piece => piece.sharedHealth));
  const visibleGroupIds = labels.map(piece => piece.healthGroupId);
  assert.equal(new Set(visibleGroupIds).size, visibleGroupIds.length,
    '同一組頭目身體不能重複顯示血量標籤');
});

test('傷害數字不覆蓋寶箱，也不在同一位置堆疊', () => {
  const chest = { x: 200, y: 200, hp: 50, chest: true, radius: 23 };
  const popups = Array.from({ length: 30 }, (_, index) => ({
    x: index < 10 ? 200 : 40 + (index % 5) * 70,
    y: index < 10 ? 200 : 100 + Math.floor(index / 5) * 65,
    value: 100, life: 0.5, weak: false,
  }));
  const selected = selectDamagePopups(popups, [chest]);

  assert.ok(selected.length > 0 && selected.length <= 6);
  assert.ok(selected.every(popup => Math.hypot(popup.x - chest.x, popup.y - chest.y) >= 48));
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      assert.ok(Math.abs(selected[i].x - selected[j].x) >= 34
        || Math.abs(selected[i].y - selected[j].y) >= 24);
    }
  }
});

test('尚未進入戰場的長鏈不把血量與寶箱標記畫進上方介面', () => {
  const chain = { dead: false, boss: true, segments: [
    { index: 0, x: 300, y: 170, hp: 100 },
    { index: 1, x: 300, y: 190, hp: 100, healthGroupLeader: true },
    { index: 2, x: 300, y: 210, hp: 100, chest: true },
    { index: 3, x: 300, y: 250, hp: 100, chest: true },
    { index: 4, x: 200, y: 280, hp: 100, healthGroupLeader: true },
  ] };
  assert.deepEqual(visibleChests([chain]).map(piece => piece.index), [3]);
  assert.deepEqual(selectHealthLabels([chain]).map(piece => piece.index), [4]);
  assert.deepEqual(selectDamagePopups([
    { x: 300, y: 120, value: 10, life: 1 },
    { x: 300, y: 270, value: 10, life: 1 },
  ], []).map(piece => piece.y), [270]);
});
