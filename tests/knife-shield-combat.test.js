import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, getRunProgress, hitSegment, startRun } from '../dist/src/game.js';
import { knifeShieldDamageMultiplier, knifeShieldSlash } from '../dist/src/knife-shield.js';

function enterBoss(chapter = 1) {
  const game = startRun(41, {}, chapter);
  game.encounter = 'boss';
  game.spawnCount = 0;
  advance(game, 0.05);
  return game;
}

test('第一關只有一隻我的刀盾，擊破後可結算勝利', () => {
  assert.equal(CHAPTERS[0].bossCount, 1);
  assert.equal(CHAPTERS[1].bossCount, 2);
  const game = enterBoss();
  assert.equal(game.bosses.length, 1);
  const boss = game.bosses[0];
  assert.equal(boss.rig.profileId, 'meme-knife-shield');
  game.bossDestroyed = boss.originalBodyCount;
  assert.ok(getRunProgress(game) > 0.19);
  boss.dead = true;
  advance(game, 0.05);
  assert.equal(game.phase, 'victory');
});

test('舊版第一關若已存入兩隻頭目，進度仍按原有兩隻計算', () => {
  const game = startRun(42);
  game.encounter = 'boss';
  game.spawnCount = 2;
  game.normalDestroyed = game.normalTotal;
  game.bossDestroyed = 41;
  assert.ok(getRunProgress(game) > 0.85 && getRunProgress(game) < 0.95);
});

test('舉盾只擋交錯身體，寶箱與另一側仍可打；揮刀後留下反擊空檔', () => {
  const game = enterBoss();
  const boss = game.bosses[0];
  const chest = boss.segments.find(piece => piece.chest);
  const guarded = boss.segments.find(piece => piece.depth === 2);
  const open = boss.segments.find(piece => piece.depth === 3);
  boss.rig.telegraphFor = 0.6;
  assert.equal(knifeShieldDamageMultiplier(boss, guarded), 0.2);
  assert.equal(knifeShieldDamageMultiplier(boss, open), 1);
  assert.equal(knifeShieldDamageMultiplier(boss, chest), 1);
  const protectedHp = guarded.hp;
  const openHp = open.hp;
  hitSegment(game, boss, guarded, 100);
  hitSegment(game, boss, open, 100);
  assert.ok(protectedHp - guarded.hp < openHp - open.hp);
  boss.rig.telegraphFor = 0;
  boss.rig.strikeFor = 0.5;
  assert.equal(knifeShieldDamageMultiplier(boss, chest), 1.3);
  boss.rig.phase = 2;
  boss.rig.telegraphFor = 0.5;
  boss.rig.strikeFor = 0;
  assert.equal(knifeShieldDamageMultiplier(boss, guarded), 1);
  assert.equal(knifeShieldDamageMultiplier(boss, open), 0.2);
});

test('斜斬有獨立命中區，半血後換手使斬擊方向反轉', () => {
  const first = knifeShieldSlash({ x: 120, y: 300 }, 190, 1);
  const second = knifeShieldSlash({ x: 120, y: 300 }, 190, 2);
  assert.equal(first.kind, 'knifeSlash');
  assert.equal(first.radius, 17);
  assert.ok(first.vx > second.vx);
  assert.equal(first.vy, second.vy);
  assert.ok(first.damage >= 10);
});

test('舉盾和揮刀只各發一次聲音提示，不在每幀重播', () => {
  const game = enterBoss();
  game.bossShotTimer = 2.27;
  advance(game, 0.05);
  assert.deepEqual(game.audioCues, ['guard']);
  advance(game, 0.05);
  assert.deepEqual(game.audioCues, []);
  game.bossShotTimer = 3.08;
  advance(game, 0.05);
  assert.deepEqual(game.audioCues, ['slash']);
  assert.equal(game.enemyBullets.at(-1).kind, 'knifeSlash');
});
