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

test('第1至25關一開始看得到頭目，長身體仍由畫外逐段進場', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(303, {}, stage.id);
    game.encounter = 'boss';
    game.wave = WAVES.length;
    advance(game, 0.001);
    assert.equal(game.bosses.length, stage.bossCount, `第${stage.id}關生成頭目數`);
    for (const boss of game.bosses) {
      const head = boss.segments[0];
      const visible = head.x >= -20 && head.x <= 410 && head.y >= 70 && head.y <= 774;
      assert.ok(visible, `第${stage.id}關開場看不到頭目 (${head.x.toFixed(0)}, ${head.y.toFixed(0)})`);
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

test('每關開場只有頭部可見，身體仍由畫外逐段進場', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(606 + stage.id, {}, stage.id);
    game.encounter = 'boss';
    game.wave = WAVES.length;
    game.fireTimer = -100000;
    advance(game, 0.001);
    const boss = game.bosses[0];
    const visibleCount = () => boss.segments.filter(piece => piece.index > 0
      && piece.y > 196 && piece.y < 730 && piece.x > 0 && piece.x < 390).length;
    assert.ok(boss.segments[0].x >= -20 && boss.segments[0].x <= 410
      && boss.segments[0].y >= 70 && boss.segments[0].y <= 774,
    `第${stage.id}關開場應立刻看得到頭目`);
    assert.equal(visibleCount(), 0, `第${stage.id}關開場已有一整段身體`);
    for (let frame = 0; frame < 800; frame++) advance(game, 0.05);
    assert.ok(visibleCount() > 0, `第${stage.id}關頭目一直沒有進場`);
    assert.ok(visibleCount() < boss.segments.length - 1,
      `第${stage.id}關頭目開場後過快整條灌入畫面`);
  }
});

test('第1與第2關真正開始作戰時，只生成頭目並立刻可見', () => {
  for (const chapter of [1, 2]) {
    const game = startRun(808 + chapter, {}, chapter);
    advance(game, 0.001);
    const chain = game.chains[0];
    const visibleCount = () => chain.segments.filter(piece => piece.index > 0
      && piece.y > 196 && piece.y < 730 && piece.x > 0 && piece.x < 390).length;
    const head = chain.segments[0];
    assert.ok(head.x >= -20 && head.x <= 410 && head.y >= 70 && head.y <= 774,
      `第${chapter}關開局看不到頭目 (${head.x.toFixed(0)}, ${head.y.toFixed(0)})`);
    assert.ok(visibleCount() < 8,
      `第${chapter}關開局已有太多身體節點在畫面內`);
    for (let frame = 0; frame < 400; frame++) {
      if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
      advance(game, 0.05);
    }
    assert.ok(visibleCount() > 0, `第${chapter}關長鏈一直沒有進場`);
    assert.ok(visibleCount() < chain.segments.length - 1,
      `第${chapter}關長鏈整條過快進場`);
  }
});

test('第1與第2關開場直接生成頭目，身節不會被兩發基礎藥丸打爆', () => {
  for (const chapter of [1, 2]) {
    const game = startRun(818 + chapter, {}, chapter);
    advance(game, 0.001);
    const firstBody = game.chains[0].segments[1];
    assert.ok(firstBody.maxHp >= 50,
      `第${chapter}關第一節只有 ${firstBody.maxHp} 耐久`);
  }
});

test('正式關卡都以頭目長鏈開場，後段頭目身節耐久高於前段', () => {
  const samples = [1, 2, 5, 25].map(chapter => {
    const game = startRun(828 + chapter, {}, chapter);
    advance(game, 0.001);
    const chain = game.chains[0];
    return { chapter, length: chain.segments.length,
      tailHp: chain.segments.at(-1).maxHp,
      firstHp: chain.segments[1].maxHp };
  });
  assert.ok(samples.every(sample => sample.length > 30));
  assert.ok(samples.every(sample => sample.tailHp > sample.firstHp));
  assert.ok(samples[3].tailHp > samples[0].tailHp * 2,
    '第25關尾段應比第1關明顯耐打');
});

test('連續擊破頭目身體保留短暫回彈，行軍距離不會永久倒退', () => {
  const game = startRun(909, {}, 1);
  game.encounter = 'boss';
  game.wave = WAVES.length;
  game.fireTimer = -100000;
  advance(game, 0.001);
  const boss = game.bosses[0];
  for (let count = 0; count < 3; count++) {
    const group = boss.healthGroups.find(item => item.members.length >= 3);
    const before = boss.travel;
    const beforeHead = boss.segments[0].routeDistance;
    const body = group.members[0];
    assert.ok(body, '頭目身節應該還有可破壞目標');
    hitSegment(game, boss, body, group.hp + body.armorHp + 1);
    assert.equal(boss.travel, before,
      '永久行軍距離不能隨擊破倒退');
    advance(game, 0.05);
    assert.ok(boss.segments[0].routeDistance < beforeHead + boss.speed * 0.05,
      '整組破壞後只應有短暫、可見的回彈');
    for (let frame = 0; frame < 99; frame++) advance(game, 0.05);
    assert.ok(boss.travel > before,
      '回彈結束後頭目應持續前進');
  }
});

test('第1、2、5關頭目每3至4節共享一個血量池', () => {
  for (const chapter of [1, 2, 5]) {
    const game = startRun(919 + chapter, {}, chapter);
    game.encounter = 'boss';
    game.wave = WAVES.length;
    game.fireTimer = -100000;
    advance(game, 0.001);
    const boss = game.bosses[0];
    const groups = boss.healthGroups.filter(group => group.members.length >= 3);
    assert.ok(groups.length > 0, `第${chapter}關沒有共用血量的頭目身體段`);
    assert.ok(groups.every(group => group.members.length <= 4),
      `第${chapter}關有超過4節共用一個血量池`);

    const group = groups[0];
    const before = group.hp;
    const beforeTravel = boss.travel;
    assert.equal(hitSegment(game, boss, group.members[0], 100), true);
    assert.equal(group.hp, before - 100);
    assert.ok(group.members.every(member => member.hp === group.hp),
      `第${chapter}關同組節點沒有同步顯示共用耐久`);
    assert.equal(boss.travel, beforeTravel,
      '同組尚未打破前不能造成整組回拉');

    const segmentCount = boss.segments.length;
    const destroyedCount = group.members.length;
    assert.equal(hitSegment(game, boss, group.members[0], group.hp + 1), true);
    assert.equal(boss.segments.length, segmentCount - destroyedCount,
      `第${chapter}關共用血量歸零後沒有整組破壞`);
    assert.equal(game.bossDestroyed, destroyedCount,
      `第${chapter}關破壞進度沒有按整組節點計算`);
    assert.equal(boss.travel, beforeTravel,
      `第${chapter}關整組破壞後永久行軍距離不應倒退`);
  }
});

test('正常開局不經過普通長鏈階段，直接生成頭目且沒有敵方攻擊', () => {
  const game = startRun(404, {}, 1);
  advance(game, 0.05);
  assert.equal(game.encounter, 'boss');
  assert.equal(game.normalTotal, 0);
  assert.ok(game.chains.every(chain => chain.boss));
  assert.equal(game.encounter, 'boss');
  assert.equal(game.phase, 'playing');
  assert.equal('enemyBullets' in game, false);
  assert.equal('hazards' in game, false);
});
