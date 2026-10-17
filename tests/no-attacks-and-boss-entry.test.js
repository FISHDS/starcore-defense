import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advance, CHAPTERS, chooseUpgrade, hitSegment, startRun, WAVES } from '../dist/src/game.js';
import { UPGRADES } from '../dist/src/content.js';
import { bossRosterIndexFor } from '../dist/src/boss-profiles.js';

test('固定守點不再有核心耐久或敵方攻擊系統', () => {
  const game = startRun(101, {}, 1);
  assert.equal('core' in game, false);
  assert.equal('maxCore' in game, false);
  assert.equal('enemyBullets' in game, false);
  assert.equal('hazards' in game, false);
});

test('戰鬥畫面不顯示耐久條，技能池沒有失去用途的防禦卡', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /星核耐久|id="core-value"|id="core-progress"/);
  assert.ok(UPGRADES.every(item => item.category !== 'survival'));
  assert.ok(!UPGRADES.some(item => ['shield', 'fury'].includes(item.id)));
});

test('普通長鏈和頭目都不會向固定玩家發射攻擊', () => {
  for (const encounter of ['normal', 'boss']) {
    const game = startRun(202, {}, 17);
    game.encounter = encounter;
    for (let frame = 0; frame < 500; frame++) {
      if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
      advance(game, 0.05);
    }
    assert.equal('enemyBullets' in game, false);
    assert.equal('hazards' in game, false);
  }
});

test('第1至25關的頭目都從可視範圍外逐步進場', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(303, {}, stage.id);
    game.encounter = 'boss';
    game.wave = WAVES.length;
    advance(game, 0.001);
    assert.equal(game.bosses.length, stage.bossCount, `第${stage.id}關生成頭目數`);
    for (const boss of game.bosses) {
      const head = boss.segments[0];
      const outside = head.x < -30 || head.x > 420 || head.y < 100 || head.y > 870;
      assert.ok(outside, `第${stage.id}關頭目一出場就在畫面內 (${head.x.toFixed(0)}, ${head.y.toFixed(0)})`);
    }
  }
});

test('25關頭目突破時只判定路線失守，不攻擊玩家或扣除核心耐久', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(505 + stage.id, {}, stage.id);
    game.encounter = 'boss';
    game.wave = WAVES.length;
    game.fireTimer = -100000;
    advance(game, 0.001);
    for (let frame = 0; frame < 6000 && game.phase === 'playing'; frame++) {
      advance(game, 0.05);
    }
    assert.equal(game.phase, 'defeat', `第${stage.id}關頭目路線未能抵達外圍終點`);
    assert.equal(game.effects.some(effect => effect.kind === 'breach'), false,
      `第${stage.id}關仍播放撞擊玩家特效`);
    assert.ok(game.bosses.every(boss => Math.hypot(
      boss.segments[0].x - game.player.x, boss.segments[0].y - game.player.y) >= 60),
    `第${stage.id}關頭目判敗前已碰到玩家`);
    assert.equal('core' in game, false);
  }
});

test('每一關的頭目都由畫面外逐段進場，開場不會鋪滿整條身體', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(606 + stage.id, {}, stage.id);
    game.encounter = 'boss';
    game.wave = WAVES.length;
    game.fireTimer = -100000;
    advance(game, 0.001);
    const boss = game.bosses[0];
    const visibleCount = () => boss.segments.filter(piece => piece.index > 0
      && piece.y > 40 && piece.y < 730 && piece.x > -20 && piece.x < 410).length;
    assert.ok(boss.segments[0].x < 0 || boss.segments[0].x > 390
      || boss.segments[0].y < 0 || boss.segments[0].y > 844,
    `第${stage.id}關頭目開場已在畫面內`);
    assert.equal(visibleCount(), 0, `第${stage.id}關開場已有一整段身體`);
    for (let frame = 0; frame < 800; frame++) advance(game, 0.05);
    assert.ok(visibleCount() > 0, `第${stage.id}關頭目一直沒有進場`);
    assert.ok(visibleCount() < boss.segments.length - 1,
      `第${stage.id}關頭目開場後過快整條灌入畫面`);
  }
});

test('普通長鏈轉頭目戰時不會把舊攻擊帶進來', () => {
  const game = startRun(404, {}, 1);
  advance(game, 0.05);
  const normal = game.chains[0];
  while (normal.segments.length > 1) {
    const body = normal.segments[1];
    hitSegment(game, normal, body, body.hp + body.armorHp + 1);
    if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
  }
  assert.equal(game.encounter, 'boss', '清空普通長鏈後應接續頭目戰');
  advance(game, 0.05);
  assert.equal(game.encounter, 'boss');
  assert.equal(game.phase, 'playing');
  assert.equal('enemyBullets' in game, false);
  assert.equal('hazards' in game, false);
});
