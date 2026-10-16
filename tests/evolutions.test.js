import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, getShotDamage, hitSegment, startRun, UPGRADES } from '../dist/src/game.js';

test('新增技能與兩種合成招式；合成條件達成才會出現在寶箱選項', () => {
  for (const id of ['bankshot', 'bounce', 'shatter', 'volley', 'combo', 'detonation', 'superconductor']) {
    assert.ok(UPGRADES.some(item => item.id === id));
  }
  const game = startRun(13);
  advance(game, 0.05);
  game.upgrades.poison = 2;
  game.upgrades.burn = 2;
  const chest = game.chains[0].segments.find(piece => piece.chest);
  hitSegment(game, game.chains[0], chest, chest.hp + 1);
  assert.ok(game.choices.includes('detonation'));
  assert.equal(chooseUpgrade(game, 'detonation'), true);
  assert.equal(game.upgrades.detonation, 1);
});

test('技能池不含回血、移動拾取或寶箱傷害加成', () => {
  const forbidden = ['repair', 'secondwind', 'harvest', 'focus', 'magnet', 'bounty'];
  assert.deepEqual(UPGRADES.filter(item => forbidden.includes(item.id)), []);
});

test('擊破身體不會生成需要移動取得的回血或補給物', () => {
  const game = startRun(77);
  advance(game, 0.05);
  const chain = game.chains[0];
  game.upgrades.harvest = 3;
  for (const segment of chain.segments.slice(1, 15)) {
    hitSegment(game, chain, segment, segment.hp + 1);
  }
  assert.equal(game.pickups.length, 0);
  assert.equal(game.core, game.maxCore);
});

test('局內成長改由擊破後直接獲得，不掉落回血或移動拾取物', () => {
  const game = startRun(19);
  advance(game, 0.05);
  const chain = game.chains[0];
  game.upgrades.harvest = 3;
  for (const piece of [...chain.segments.slice(1, 18)]) {
    if (piece.chest) continue;
    hitSegment(game, chain, piece, piece.hp + 1);
  }
  const before = game.core;
  advance(game, 0.05, { aimAngle: 0 });
  assert.equal(game.pickups.length, 0);
  assert.equal(game.core, before);
});

test('高階毒素在長鏈上累積成有感的持續傷害', () => {
  const game = startRun(29);
  advance(game, 0.05);
  game.fireTimer = -10000;
  game.upgrades.poison = 3;
  const chain = game.chains[0];
  const piece = chain.segments.find(item => item.index > 0 && !item.chest
    && item.y > 45 && item.y < 730);
  const before = piece.hp;
  hitSegment(game, chain, piece, 1);
  for (let frame = 0; frame < 150 && game.phase === 'playing'; frame++) {
    advance(game, 0.05, { aimAngle: -Math.PI / 2 });
  }
  assert.ok(before - piece.hp > getShotDamage(game) * 0.6,
    `毒素累積傷害不足，總傷害 ${before - piece.hp}`);
});

test('連鎖電弧必須對準方向；自動技能不會替玩家掃完整畫面', () => {
  const game = startRun(31, {}, 3);
  advance(game, 0.05);
  game.fireTimer = -10000;
  game.upgrades.arc = 2;
  const target = game.chains[0].segments.find(item => item.index > 0
    && !item.chest && item.hp > 0 && item.y > 45 && item.y < 730);
  const before = target.hp;
  game.specialTimers.arc = 2;
  advance(game, 0.05, { aimAngle: -Math.PI / 2 });
  assert.equal(target.hp, before, '目標不在準星前方時不應被電弧擊中');
  game.specialTimers.arc = 2;
  const angle = Math.atan2(target.y - game.player.y, target.x - game.player.x);
  advance(game, 0.05, { aimAngle: angle });
  assert.ok(target.hp < before, '轉向目標後電弧應造成傷害');
});
