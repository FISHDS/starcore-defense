import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_PROFILES, bossProfileFor } from '../dist/src/boss-profiles.js';
import { bossVolleyFor } from '../dist/src/boss-attacks.js';
import { advance, startRun } from '../dist/src/game.js';

test('前20關頭目具備可執行且彼此不同的招牌彈幕', () => {
  const profiles = Array.from({ length: 20 }, (_, index) => bossProfileFor(index + 1));
  const volleys = profiles.map(profile => bossVolleyFor(profile.attackStyle,
    { x: 100, y: 160 }, 0.8, 1, 2));
  assert.ok(volleys.every(volley => volley.length > 0));
  const fingerprints = volleys.map(volley => JSON.stringify(volley.map(shot => [
    shot.kind, Number(shot.vx.toFixed(2)), Number(shot.vy.toFixed(2)),
    shot.radius, shot.ricochets || 0,
  ])));
  assert.equal(new Set(fingerprints).size, 20, '換名字不能共用同一種彈幕');
});

test('所有頭目外型都有對應的招式實作，弱點與彈幕均可檢查', () => {
  for (const profile of BOSS_PROFILES) {
    const volley = bossVolleyFor(profile.attackStyle, { x: 195, y: 180 }, 1.1, 1, 0);
    assert.ok(volley.length, `${profile.name} 沒有招式`);
    assert.ok(volley.every(shot => Number.isFinite(shot.vx) && Number.isFinite(shot.vy)
      && shot.radius >= 5 && shot.damage > 0), `${profile.name} 的招式資料無效`);
  }
});

test('鏡羽夜梟的光線碰到左右邊界會折返，且只折返有限次數', () => {
  const game = startRun(20, {}, 20);
  game.enemyBullets = [{ kind: 'mirrorReturn', x: 370, y: 180,
    vx: 120, vy: 0, radius: 9, damage: 15, ricochets: 1 }];
  advance(game, 0.1, { aimAngle: -Math.PI / 2 });
  assert.equal(game.enemyBullets.length, 1);
  assert.ok(game.enemyBullets[0].vx < 0, '碰到右側後速度方向應反轉');
  assert.equal(game.enemyBullets[0].ricochets, 0);
});
