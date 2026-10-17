import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, chooseUpgrade, getShotDamage, hitSegment, rerollUpgrades, startRun, UPGRADES } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from '../scripts/fixed-aim-pilot.mjs';

test('關卡一開始就有頭目長鏈，沒有普通怪物前置階段', () => {
  const game = startRun(7);
  assert.equal(game.encounter, 'boss');
  advance(game, 0.05);
  assert.equal(game.bosses.length, 1);
  assert.equal(game.chains.length, 1);
  assert.equal(game.chains[0].boss, true);
  assert.equal(game.normalTotal, 0);
});

test('頭部不受傷，身節共用血量組被擊破時只短暫回彈', () => {
  const game = startRun(7);
  advance(game, 0.05);
  const boss = game.bosses[0];
  const head = boss.segments[0];
  const headHp = head.hp;
  assert.equal(hitSegment(game, boss, head, 100000), false);
  assert.equal(head.hp, headHp);
  const group = boss.healthGroups[0];
  const beforeTravel = boss.travel;
  hitSegment(game, boss, group.members[0], group.hp + 1);
  assert.equal(boss.travel, beforeTravel);
  assert.ok(boss.recoil > 0);
  const routeBefore = boss.segments[0].routeDistance;
  advance(game, 0.1);
  assert.ok(boss.travel > beforeTravel);
  assert.ok(boss.segments[0].routeDistance < routeBefore + boss.speed * 0.1);
});

test('寶箱是頭目身體節點，打破後出現三選一並返回原戰場', () => {
  const game = startRun(8);
  advance(game, 0.05);
  const boss = game.bosses[0];
  const chest = boss.segments.find(segment => segment.chest);
  assert.ok(chest);
  hitSegment(game, boss, chest, chest.hp + 1);
  assert.equal(game.phase, 'upgrade');
  assert.equal(game.choices.length, 3);
  assert.equal(chooseUpgrade(game, game.choices[0]), true);
  assert.equal(game.phase, 'playing');
  assert.ok(game.bosses.includes(boss));
});

test('固定位置只接受瞄準輸入，不會移動主角', () => {
  for (const chapter of [1, 3]) {
    const game = startRun(72, {}, chapter);
    const origin = { x: game.player.x, y: game.player.y };
    advance(game, 0.05, { aimAngle: Math.PI / 3 });
    assert.deepEqual({ x: game.player.x, y: game.player.y }, origin);
    assert.ok(Math.abs(game.player.aimAngle - Math.PI / 3) < 0.001);
  }
});

test('藥丸沿玩家原地選擇的方向發射', () => {
  const game = startRun(73);
  game.player.aimAngle = 0;
  game.fireTimer = 1;
  advance(game, 0.01, { aimAngle: 0 });
  assert.ok(game.bullets.length > 0);
  assert.ok(game.bullets[0].vx > 0);
  assert.ok(Math.abs(game.bullets[0].vy) < 0.001);
});

test('技能可有限次刷新，卡池包含多種打法', () => {
  assert.ok(UPGRADES.length >= 24);
  assert.ok(new Set(UPGRADES.map(item => item.category)).size >= 4);
  const game = startRun(11);
  advance(game, 0.05);
  const chest = game.bosses[0].segments.find(segment => segment.chest);
  hitSegment(game, game.bosses[0], chest, chest.hp + 1);
  const previous = game.choices;
  assert.equal(rerollUpgrades(game), true);
  assert.equal(game.rerollsLeft, 0);
  assert.ok(game.choices.some(id => !previous.includes(id)));
});

test('完全不操作不會自動通關', () => {
  for (const chapter of [1, 5, 25]) {
    const game = startRun(700 + chapter, {}, chapter);
    for (let frame = 0; frame < 12000 && game.phase === 'playing'; frame++) {
      advance(game, 0.05);
    }
    assert.notEqual(game.phase, 'victory', `第${chapter}關在完全無輸入下自行通關`);
  }
});

test('持續追蹤頭目可完成首關，不靠傷害把頭目壓在入口', () => {
  const game = startRun(5);
  for (let frame = 0; frame < 7000 && !['victory', 'defeat'].includes(game.phase); frame++) {
    if (game.phase === 'upgrade') chooseUpgrade(game, choosePilotUpgrade(game));
    advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
  }
  assert.equal(game.phase, 'victory', `結果 ${game.phase}，${game.runTime.toFixed(1)} 秒`);
});

test('局內擊破頭目身體後，藥丸傷害會隨進度成長而非隨等待成長', () => {
  const game = startRun(100);
  const damage = getShotDamage(game);
  game.bossDestroyed = 35;
  const grown = getShotDamage(game);
  game.runTime = 400;
  assert.ok(grown > damage);
  assert.equal(getShotDamage(game), grown);
});
