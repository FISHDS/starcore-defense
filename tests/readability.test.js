import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, createBossShowcase, startRun } from '../dist/src/game.js';
import { selectDamagePopups, selectHealthLabels, visibleChests } from '../dist/src/render.js';

test('長鏈密集時只顯示少量彼此分開的血量，寶箱周圍保持淨空', () => {
  const game = startRun(1);
  for (let frame = 0; frame < 260 && game.phase === 'playing'; frame++) {
    if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
    advance(game, 0.05);
  }
  const labels = selectHealthLabels(game.chains);
  const chest = visibleChests(game.chains)[0];

  assert.ok(labels.length > 0);
  assert.ok(labels.length <= 10, `顯示了 ${labels.length} 個血量`);
  assert.ok(labels.every(piece => piece.x >= 20 && piece.x <= 370),
    '畫面外的身體佔用了血量標示名額');
  assert.ok(visibleChests(game.chains).every(piece => piece.x >= 20 && piece.x <= 370));
  assert.ok(game.chains[0].segments.at(-1).maxHp > game.chains[0].segments[1].maxHp * 30,
    '越後面的身體數值應明顯成長');
  assert.ok(labels.every(piece => !piece.chest && piece.index > 0));
  assert.ok(labels.every(piece => Math.hypot(piece.x - chest.x, piece.y - chest.y) >= 48));
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      assert.ok(Math.abs(labels[i].x - labels[j].x) >= 50
        || Math.abs(labels[i].y - labels[j].y) >= 28);
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

  assert.ok(selected.length > 0 && selected.length <= 12);
  assert.ok(selected.every(popup => Math.hypot(popup.x - chest.x, popup.y - chest.y) >= 48));
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      assert.ok(Math.abs(selected[i].x - selected[j].x) >= 34
        || Math.abs(selected[i].y - selected[j].y) >= 24);
    }
  }
});
