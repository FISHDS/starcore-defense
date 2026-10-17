import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, hitSegment, startRun } from '../dist/src/game.js';
import { chainSpeed } from '../dist/src/mechanics.js';

function launched(stage) {
  const game = startRun(300 + stage, {}, stage);
  advance(game, 0.05);
  game.fireTimer = -10000;
  return game;
}

test('甲殼節必須先破殼，寶箱本身仍可直接命中', () => {
  const game = launched(4);
  const chain = game.chains[0];
  const armored = chain.segments.find(piece => piece.armorHp > 0);
  assert.ok(armored);
  const hp = armored.hp;
  hitSegment(game, chain, armored, armored.armorHp);
  assert.equal(armored.armorHp, 0);
  assert.equal(armored.hp, hp);
  hitSegment(game, chain, armored, 20);
  assert.ok(armored.hp < hp);
  assert.ok(chain.segments.filter(piece => piece.chest).every(piece => !piece.armorHp));
});

test('護箱節還在時寶箱較耐打，先清護衛能解除保護', () => {
  const game = launched(9);
  const chain = game.chains[0];
  const chest = chain.segments.find(piece => piece.chest);
  const guard = chain.segments.find(piece => piece.guard
    && Math.abs(piece.depth - chest.depth) <= 2);
  assert.ok(guard);
  const hp = chest.hp;
  hitSegment(game, chain, chest, 20);
  const blocked = hp - chest.hp;
  hitSegment(game, chain, guard, guard.hp + guard.armorHp + 1);
  hitSegment(game, chain, chest, 20);
  assert.ok(hp - blocked - chest.hp > blocked);
});

test('磁節會偏折鄰近藥丸，破壞後停止作用', () => {
  const game = launched(11);
  const chain = game.chains[0];
  const magnet = chain.segments.find(piece => piece.magnet && piece.x > 30 && piece.x < 360);
  assert.ok(magnet);
  const bullet = { x: magnet.x + 35, y: magnet.y + 50,
    vx: 0, vy: -520, speed: 520, damage: 1, pierce: 0, hit: [], width: 4 };
  game.bullets.push(bullet);
  advance(game, 0.05);
  assert.ok(bullet.x < magnet.x + 35);
  hitSegment(game, chain, magnet, magnet.hp + 1);
  const second = { ...bullet, x: magnet.x + 35, y: magnet.y + 50, hit: [] };
  game.bullets = [second];
  advance(game, 0.05);
  assert.equal(second.x, magnet.x + 35);
});

test('弱點開窗時承受傷害高於閉合時', () => {
  const game = launched(13);
  const chain = game.chains[0];
  const weak = chain.segments.find(piece => piece.weakpoint);
  assert.ok(weak);
  const hp = weak.hp;
  weak.weakOpen = false;
  hitSegment(game, chain, weak, 20);
  const closedDamage = hp - weak.hp;
  weak.weakOpen = true;
  hitSegment(game, chain, weak, 20);
  assert.ok(hp - closedDamage - weak.hp > closedDamage);
});

test('加速節被擊破後，長鏈的前進速度下降', () => {
  const game = launched(16);
  const chain = game.chains[0];
  const accelerator = chain.segments.find(piece => piece.haste);
  assert.ok(accelerator);
  const before = chainSpeed(chain);
  hitSegment(game, chain, accelerator, accelerator.hp + 1);
  advance(game, 0.05);
  assert.ok(chainSpeed(chain) < before);
});

test('導管關卡不再顯示攻擊預警或向固定玩家發射彈幕', () => {
  const game = launched(17);
  for (let i = 0; i < 180; i++) advance(game, 0.05, 195);
  assert.equal('hazards' in game, false);
  assert.equal('enemyBullets' in game, false);
  assert.equal('core' in game, false);
});

test('補給窗口關卡讓寶箱比同深度一般節點容易打開', () => {
  const game = launched(12);
  const chain = game.chains[0];
  const chest = chain.segments.find(piece => piece.chest);
  const body = chain.segments.find(piece => piece.depth === chest.depth + 1);
  assert.ok(chest.maxHp < body.maxHp * 0.5);
});

test('輪轉頭目兩條長鏈的弱點窗口錯開', () => {
  const game = startRun(15, {}, 15);
  game.encounter = 'boss';
  advance(game, 0.05);
  const [left, right] = game.bosses;
  const a = left.segments.find(piece => piece.weakpoint);
  const b = right.segments.find(piece => piece.depth === a.depth);
  assert.ok(a && b);
  assert.notEqual(a.weakOpen, b.weakOpen);
});

test('終局雙頭目不再輪流套護罩，兩條長鏈都能直接受傷', () => {
  const game = startRun(25, {}, 25);
  game.encounter = 'boss';
  advance(game, 0.05);
  for (const chain of game.bosses) {
    assert.equal('shielded' in chain, false);
    const piece = chain.segments.find(item => item.depth === 3
      && !item.chest && !item.weakpoint && !item.armorHp);
    assert.ok(piece);
    const before = piece.hp;
    hitSegment(game, chain, piece, 100);
    assert.equal(piece.hp, before - 100);
  }
});

test('頭目弱點未開窗仍承受完整基本傷害，不形成假免疫', () => {
  const game = startRun(641, {}, 15);
  game.encounter = 'boss';
  advance(game, 0.05);
  const boss = game.bosses[0];
  const weakpoint = boss.segments.find(piece => piece.index > 0 && piece.weakpoint);
  assert.ok(weakpoint);
  weakpoint.weakOpen = false;
  const hp = weakpoint.hp;
  hitSegment(game, boss, weakpoint, 50);
  assert.equal(weakpoint.hp, hp - 50);
});

test('第24關的高階金箱確實比一般關卡更多', () => {
  const ordinary = launched(23).chains[0];
  const treasure = launched(24).chains[0];
  const countGold = chain => chain.segments.filter(piece => piece.gold).length;
  assert.ok(countGold(treasure) > countGold(ordinary));
});

test('普通長鏈不會發射攻擊或要求玩家閃避', () => {
  const game = startRun(31);
  game.fireTimer = -10000;
  for (let i = 0; i < 260; i++) {
    advance(game, 0.05, 195);
  }
  assert.equal('enemyBullets' in game, false);
  assert.equal('core' in game, false);
});

test('移除敵方彈幕後玩家只需轉向攻擊，毋須迎擊或移動角色', () => {
  const game = startRun(32);
  advance(game, 0.05);
  const origin = { x: game.player.x, y: game.player.y };
  game.bullets = [{ x: 195, y: 724, vx: 0, vy: -520, speed: 520,
    damage: 1, width: 4, hit: [], pierce: 0 }];
  advance(game, 0.05, { aimAngle: -Math.PI / 2 });
  assert.equal('enemyBullets' in game, false);
  assert.deepEqual({ x: game.player.x, y: game.player.y }, origin);
});
