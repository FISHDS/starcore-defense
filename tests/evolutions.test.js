import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, hitSegment, startRun, UPGRADES } from '../dist/src/game.js';

test('新增技能與兩種合成招式；合成條件達成才會出現在寶箱選項', () => {
  for (const id of ['bankshot', 'harvest', 'combo', 'detonation', 'superconductor']) {
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

test('擊破身體有掉落物，必須移到其所在位置才可取得增益', () => {
  const game = startRun(19);
  advance(game, 0.05);
  const chain = game.chains[0];
  const body = chain.segments.find(piece => piece.index > 0 && !piece.chest);
  game.upgrades.harvest = 3;
  for (const piece of [...chain.segments.slice(1, 18)]) {
    if (piece.chest) continue;
    hitSegment(game, chain, piece, piece.hp + 1);
  }
  assert.ok(game.pickups.length > 0);
  const pickup = game.pickups[0];
  pickup.y = 718;
  const before = game.core;
  advance(game, 0.05, pickup.x < 195 ? 366 : 24);
  assert.equal(game.pickups.includes(pickup), true);
  advance(game, 0.05, pickup.x);
  assert.equal(game.pickups.includes(pickup), false);
  assert.ok(game.core > before || game.chargeFor > 0);
});
