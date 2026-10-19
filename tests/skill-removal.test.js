import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, UPGRADE_BY_ID, startRun } from '../dist/src/game.js';
import { META_BY_ID } from '../dist/src/meta.js';

test('廣角噴射不再出現在戰鬥技能池，雙生藥丸武器仍保留', () => {
  assert.equal(UPGRADE_BY_ID.scatter, undefined);
  assert.equal(META_BY_ID.scatter.name, '雙生藥丸');
});

test('裝備雙生藥丸仍會每輪發射兩枚藥丸', () => {
  const game = startRun(101, { equippedWeapon: 'scatter' }, 1);
  game.fireTimer = 0.20;
  advance(game, 0.02, { aimAngle: 0 });

  assert.equal(game.bullets.length, 2);
  assert.ok(game.bullets[0].vx !== game.bullets[1].vx
    || game.bullets[0].vy !== game.bullets[1].vy);
});
