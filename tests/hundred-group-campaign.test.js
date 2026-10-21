import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, startRun } from '../dist/src/game.js';

test('25 關各有合計一百組可擊破身節與八個寶箱，雙頭同場分攤長度', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(3000 + stage.id, {}, stage.id);
    advance(game, 0.01);
    const groups = game.bosses.flatMap(boss => boss.healthGroups);
    const chests = game.bosses.flatMap(boss =>
      boss.segments.filter(piece => piece.chest));
    const ungrouped = game.bosses.flatMap(boss => boss.segments.filter(piece =>
      piece.index > 0 && !piece.chest && !piece.healthGroupId));

    assert.equal(groups.length, 100, `第 ${stage.id} 關沒有一百組`);
    assert.equal(chests.length, 8, `第 ${stage.id} 關寶箱數量失控`);
    assert.equal(ungrouped.length, 0, `第 ${stage.id} 關有未共用血量的身體`);
    assert.ok(groups.every(group => group.members.length >= 3
      && group.members.length <= 4), `第 ${stage.id} 關分組長度錯誤`);
    assert.equal(game.bosses.length, stage.bossCount);
  }
});
