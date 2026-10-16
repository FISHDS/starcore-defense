import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advance, CHAPTERS, createBossShowcase, hitSegment } from '../dist/src/game.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';
import { routeLength, routePosition } from '../dist/src/routes.js';

function startLoadingBoss() {
  const game = createBossShowcase(996, 6);
  game.bullets = [];
  game.enemyBullets = [];
  game.fireTimer = -10000;
  game.bossShotTimer = 0;
  // 第六關實戰為中央守點；此處切到測試用底線場地檢查招式資料。
  game.chapter = 1;
  return game;
}

test('第六關以轉圈載入獸沿核心螺旋路線單頭守關', () => {
  const stage = CHAPTERS[5];
  const game = startLoadingBoss();
  assert.equal(bossProfileFor(6, 0).id, 'meme-loading-99');
  assert.equal(stage.positionMode, 'center');
  assert.equal(stage.paths.at(-1), 'coil');
  assert.equal(game.boss.path, 'center-boss-route-5');
  assert.ok(routeLength(game.boss.path, true) > 1800);
  assert.notDeepEqual(routePosition(game.boss.path, true, 0, 600),
    routePosition(game.boss.path, true, 0, 900));
  assert.equal(game.bosses.length, 1);
});

test('預警亮出卡住節，打破後取消載入掃描', () => {
  const game = startLoadingBoss();
  const boss = game.boss;
  const weakpoint = boss.segments.find(piece => piece.id === boss.rig.weakpointId);
  assert.ok(weakpoint);
  game.bossShotTimer = 3.05 - 0.9;
  advance(game, 0.02);
  assert.equal(weakpoint.weakOpen, true);
  assert.ok(boss.rig.telegraphFor > 0);
  weakpoint.hp = 1;
  assert.equal(hitSegment(game, boss, weakpoint, 100), true);
  assert.equal(boss.rig.attackCancelled, true);
  game.bossShotTimer = 3.05 - 0.01;
  advance(game, 0.02);
  assert.equal(game.enemyBullets.length, 0);
});

test('未被打斷時射出可辨識的狹幅載入掃描彈', () => {
  const game = startLoadingBoss();
  game.bossShotTimer = 3.05 - 0.9;
  advance(game, 0.02);
  game.bossShotTimer = 3.05 - 0.01;
  advance(game, 0.02);
  assert.equal(game.enemyBullets.length, 3);
  assert.ok(game.enemyBullets.every(bullet => bullet.kind === 'loadingScan'));
});

test('半血後頭部反向旋轉，主掃描後會延遲補一發反向掃描', () => {
  const game = startLoadingBoss();
  const boss = game.boss;
  boss.segments = boss.segments.slice(0, 12);
  boss.originalBodyCount = 23;
  advance(game, 0.02);
  assert.equal(boss.rig.phase, 2);
  game.enemyBullets = [];
  game.bossShotTimer = 2.45 - 0.9;
  advance(game, 0.02);
  game.bossShotTimer = 2.45 - 0.01;
  advance(game, 0.02);
  const firstAngle = Math.atan2(game.enemyBullets[1].vy, game.enemyBullets[1].vx);
  assert.ok(boss.rig.loadingFollowup);
  game.enemyBullets = [];
  for (let frame = 0; frame < 5; frame++) advance(game, 0.1);
  assert.equal(boss.rig.loadingFollowup, null);
  assert.equal(boss.rig.loadingFollowupCount, 1);
  const second = game.enemyBullets.find(bullet => bullet.kind === 'loadingScan');
  assert.ok(second);
  const secondAngle = Math.atan2(second.vy, second.vx);
  const difference = Math.atan2(Math.sin(secondAngle - firstAngle),
    Math.cos(secondAngle - firstAngle));
  assert.ok(Math.abs(difference) > 0.25, '第二發掃描應從另一側逼來');
});

test('快速試打可直接進入轉圈載入獸，並顯示專屬外型資產', () => {
  const game = createBossShowcase(996, 6);
  assert.equal(game.preview, true);
  assert.equal(game.boss.rig.profileId, 'meme-loading-99');
  assert.ok(game.boss.segments.some(piece => piece.chest));
  const profile = bossProfileFor(6, 0);
  assert.equal(profile.parts.head, 'loading-99-atlas.svg');
  const atlas = readFileSync(new URL('../dist/assets/bosses/loading-99-atlas.svg', import.meta.url), 'utf8');
  for (const id of ['head-art', 'ring-seg', 'bar-seg', 'error-seg', 'chest']) {
    assert.match(atlas, new RegExp(`id="${id}"`));
  }
});

test('手機快速體驗可選轉圈載入獸並讀到專屬玩法提示', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../dist/src/main.js', import.meta.url), 'utf8');
  assert.match(html, /class="showcase-loading99"/);
  assert.match(html, /loading-99-showcase\.svg/);
  assert.match(main, /'loading-99': 6/);
  assert.match(main, /bossMode === 'loading-99'/);
  assert.equal(bossProfileFor(6, 0).name, '百分之九十九・轉圈載入獸');
  assert.match(main, /chapter === 6/);
});
