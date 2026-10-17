import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, startRun } from '../dist/src/game.js';

function chapterSample(chapter) {
  const game = startRun(17, {}, chapter);
  advance(game, 0.01);
  const boss = game.bosses[0];
  const body = boss.segments.find(segment => segment.index > 0 && !segment.chest);
  const totalHp = game.bosses.reduce((total, enemy) => total
    + enemy.healthGroups.reduce((sum, group) => sum + group.maxHp, 0)
    + enemy.segments.filter(segment => segment.index > 0 && !segment.healthGroupId)
      .reduce((sum, segment) => sum + segment.maxHp, 0), 0);
  return { bodyHp: body.maxHp, totalHp, damage: getShotDamage(game) };
}

test('25關頭目身節耐久與整場總耐久逐關提高，留下技能搭配的傷害空間', () => {
  const samples = Array.from({ length: 25 }, (_, index) => chapterSample(index + 1));
  for (let index = 0; index < samples.length; index++) {
    assert.ok(samples[index].bodyHp > 0 && samples[index].totalHp > samples[index].bodyHp,
      `第${index + 1}關必須有可辨識的頭目身體與總耐久`);
    if (index > 0) {
      assert.ok(samples[index].bodyHp > samples[index - 1].bodyHp,
        `第${index + 1}關單節耐久沒有高於前一關`);
    }
  }
  assert.ok(samples[24].totalHp > samples[0].totalHp * 4,
    '終局應明顯高於首關，但由技能與瞄準搭配仍有取勝空間');
});
