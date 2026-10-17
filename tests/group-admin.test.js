import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';

test('第三關由單頭「已讀不回群組長」守關，手機仍是可破壞弱點', () => {
  const game = startRun(307, {}, 3);
  game.encounter = 'boss';
  advance(game, 0.05);
  assert.equal(game.bosses.length, 1);
  const boss = game.bosses[0];
  assert.equal(boss.rig.profileId, 'meme-seen-zone-admin');
  const phone = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
  assert.ok(phone?.weakpoint);
  phone.weakOpen = true;
  const before = phone.hp;
  hitSegment(game, boss, phone, 100, { projectile: true });
  assert.equal(phone.hp, before - 160);
});

test('群組長頭目不送通知彈、沒有攻擊預警或護罩', () => {
  const game = startRun(308, {}, 3);
  game.encounter = 'boss';
  advance(game, 0.05);
  for (let step = 0; step < 100; step++) advance(game, 0.05);
  assert.equal('enemyBullets' in game, false);
  assert.equal('telegraphFor' in game.bosses[0].rig, false);
  assert.equal('shielded' in game.bosses[0], false);
});
