import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, getShotDamage, startRun } from '../dist/src/game.js';

function estimateBossSeconds(chapter) {
  const research = chapter <= 2 ? 0 : chapter <= 5 ? 2 : 4;
  const hasScatter = chapter >= 6;
  const hasTempo = chapter >= 20;
  const game = startRun(17, {
    fire: research,
    equippedWeapon: hasScatter ? 'scatter' : 'capsule',
    equippedOrgans: hasTempo ? ['tempo'] : [],
  }, chapter);
  game.normalDestroyed = game.normalTotal;
  game.encounter = 'boss';
  game.upgrades = { power: 2, rapid: 2, multi: 2, crit: 2, echo: 1, volley: 1 };
  advance(game, 0.01, { aimAngle: -Math.PI / 2 });

  const bossHealth = game.bosses.reduce((total, boss) => {
    const groupedIds = new Set(boss.healthGroups.flatMap(group =>
      group.members.map(piece => piece.id)));
    return total + boss.healthGroups.reduce((sum, group) => sum + group.maxHp, 0)
      + boss.segments.filter(segment => segment.index > 0
        && !groupedIds.has(segment.id)).reduce((sum, segment) => sum + segment.maxHp, 0);
  }, 0);
  const interval = 0.19 / (1 + game.upgrades.rapid * 0.18)
    * (hasTempo ? 0.9 : 1);
  const projectileCount = 1 + game.upgrades.multi + (hasScatter ? 1 : 0)
    + game.upgrades.echo * 0.22;
  const expectedCritical = 1 + game.upgrades.crit * 0.1;
  const expectedVolley = 0.75 + 0.25 * (1.7 + game.upgrades.volley * 0.2);
  const damagePerSecond = getShotDamage(game) * projectileCount
    * (1 + game.upgrades.multi * 0.45) / (1 + game.upgrades.multi) / interval
    * expectedCritical * expectedVolley;
  return bossHealth / damagePerSecond;
}

test('25關頭目純藥丸傷害估算逐關增加，且保留技能輸出的空間', () => {
  const seconds = Array.from({ length: 25 }, (_, index) => estimateBossSeconds(index + 1));
  for (let index = 0; index < seconds.length; index++) {
    assert.ok(seconds[index] >= 45 && seconds[index] <= 140,
      `第${index + 1}關估計 ${seconds[index].toFixed(1)} 秒`);
    if (index > 0) {
      assert.ok(seconds[index] >= seconds[index - 1] * 0.97,
        `第${index + 1}關估計 ${seconds[index].toFixed(1)} 秒，低於前一關 ${seconds[index - 1].toFixed(1)} 秒`);
    }
  }
});
