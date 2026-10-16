import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';

function enterGroupAdmin() {
  const game = startRun(307, {}, 3);
  game.encounter = 'boss';
  advance(game, 0.05);
  game.enemyBullets = [];
  game.bullets = [];
  return game;
}

test('第三關由單頭「已讀不回群組長」守關，手機是可破壞弱點', () => {
  const game = enterGroupAdmin();
  assert.equal(game.bosses.length, 1);
  const boss = game.bosses[0];
  assert.equal(boss.rig.profileId, 'meme-seen-zone-admin');
  const phone = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
  assert.ok(phone?.weakpoint);
});

test('群組長先預警紅色通知彈；擊破亮起的手機可取消整輪攻擊', () => {
  const game = enterGroupAdmin();
  const boss = game.bosses[0];
  const phone = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
  game.bossShotTimer = 3.1 - 1.1 - 0.05;
  advance(game, 0.05);
  assert.ok(boss.rig.telegraphFor > 0);
  assert.equal(phone.weakOpen, true);
  assert.equal(hitSegment(game, boss, phone, phone.hp + 1, { projectile: true }), true);
  assert.equal(boss.rig.telegraphFor, 0);
  assert.equal(boss.rig.attackCancelled, true);
  game.bossShotTimer = 3.1 - 0.05;
  game.enemyBullets = [];
  advance(game, 0.05);
  assert.equal(game.enemyBullets.length, 0);
});

test('未取消時會發射可被藥丸打掉的紅色通知彈，半血後增加彈數', () => {
  const game = enterGroupAdmin();
  const boss = game.bosses[0];
  game.bossShotTimer = 3.1;
  advance(game, 0.05);
  assert.equal(game.enemyBullets.length, 3);
  assert.ok(game.enemyBullets.every(shot => shot.kind === 'notification'));
  game.enemyBullets = [];
  boss.segments.splice(7);
  game.bossShotTimer = 2.35;
  advance(game, 0.05);
  assert.equal(game.enemyBullets.length, 5);
  assert.ok(game.enemyBullets.every(shot => shot.damage > 0));
});
