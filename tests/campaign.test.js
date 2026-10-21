import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, chooseUpgrade, getRunProgress, getShotDamage, startRun } from '../dist/src/game.js';
import { routeLength, routePosition } from '../dist/src/routes.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';
import { awardRun, readProfile } from '../dist/src/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

test('戰役有 25 個正式關卡，分成五區且每關有自己的機制配置', () => {
  assert.equal(CHAPTERS.length, 25);
  assert.equal(new Set(CHAPTERS.map(stage => stage.name)).size, 25);
  assert.deepEqual([...new Set(CHAPTERS.map(stage => stage.zone))], [0, 1, 2, 3, 4]);
  assert.ok(CHAPTERS.every(stage => Array.isArray(stage.mechanics)));
  assert.ok(new Set(CHAPTERS.map(stage => stage.mechanics.join(','))).size >= 14);
  assert.equal(startRun(25, {}, 25).chapter, 25);
});

test('守關頭目編制會在單頭與雙頭之間變化，雙頭集中在區域決戰', () => {
  assert.deepEqual(CHAPTERS.map(stage => stage.bossCount), [
    1, 1, 1, 1, 1, 1, 2, 1, 2, 2, 1, 2, 1,
    2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 1, 2,
  ]);
  for (const id of [10, 15, 20, 25]) assert.equal(CHAPTERS[id - 1].bossCount, 2);
  assert.ok(CHAPTERS.filter(stage => stage.bossCount === 1).length >= 10);
});

test('相鄰關卡會輪換行進路線，五區都至少出現三種實際路徑', () => {
  assert.ok(CHAPTERS.slice(1).every((stage, index) =>
    stage.path !== CHAPTERS[index].path), '相鄰關卡不可沿用同一路線');
  for (let zone = 0; zone < 5; zone++) {
    const routes = new Set(CHAPTERS.filter(stage => stage.zone === zone)
      .map(stage => stage.path));
    assert.ok(routes.size >= 3, `第 ${zone + 1} 區路線只有 ${routes.size} 種`);
  }
});

test('不同關卡的頭目有自己的行軍路線，不共用同一條交叉路線', () => {
  const bossPaths = CHAPTERS.map(stage => stage.paths.at(-1));
  assert.ok(new Set(bossPaths).size >= 8);
  assert.equal(bossPaths[2], 'weave');
  assert.equal(bossPaths[3], 'mirror');
  assert.equal(bossPaths[4], 'spiral');
});

test('第五關改由棺材舞單頭長鏈守關', () => {
  assert.equal(CHAPTERS[4].bossCount, 1);
  assert.equal(CHAPTERS[4].bossSegments, 409);
  assert.equal(CHAPTERS[4].name, '最後一班');
  assert.equal(CHAPTERS[4].bossMode, 'coffin-dance');
  assert.equal(bossProfileFor(5, 0).id, 'meme-last-shift-coffin-leader');
});

test('單頭決戰有較長身體，進度條會依該關實際頭目長度計算', () => {
  const solo = startRun(31, {}, 4);
  solo.encounter = 'boss';
  advance(solo, 0.05);
  assert.equal(solo.bosses.length, 1);
  assert.equal(solo.bosses[0].segments.length - 1, CHAPTERS[3].bossSegments - 1);
  solo.normalDestroyed = solo.normalTotal;
  solo.bossDestroyed = CHAPTERS[3].bossSegments - 1;
  assert.equal(getRunProgress(solo), 1);

  const duo = startRun(32, {}, 10);
  duo.encounter = 'boss';
  advance(duo, 0.05);
  assert.equal(duo.bosses.length, 2);
  assert.equal(duo.bosses[0].segments.length - 1, CHAPTERS[9].bossSegments - 1);
});

test('相鄰關卡的頭目外型不會重複，雙頭關各有不同輪廓', () => {
  const signatures = CHAPTERS.map(stage => Array.from(
    { length: stage.bossCount }, (_, lane) => bossProfileFor(stage.id, lane).id,
  ).sort().join('|'));
  assert.ok(signatures.slice(1).every((signature, index) =>
    signature !== signatures[index]), '相鄰關卡應讓玩家遇到不同頭目組合');
  assert.ok(CHAPTERS.filter(stage => stage.bossCount === 2).every(stage =>
    bossProfileFor(stage.id, 0).id !== bossProfileFor(stage.id, 1).id));
});

test('同一擊破進度下，空等不會增加武器傷害', () => {
  const game = startRun(100);
  game.bossDestroyed = 35;
  const damage = getShotDamage(game);
  game.runTime = 400;
  assert.equal(getShotDamage(game), damage);
  game.bossDestroyed = 100;
  assert.ok(getShotDamage(game) > damage);
});

test('第二關短路線不再因速度縮小而比第一關爭取更多時間', () => {
  const first = startRun(101, {}, 1);
  const second = startRun(101, {}, 2);
  advance(first, 0.05);
  advance(second, 0.05);
  assert.ok(second.chains[0].speed >= first.chains[0].speed);
});

test('窄道與左右岔路有不同實際路線，不只換關卡名稱', () => {
  const paths = [CHAPTERS[1].path, CHAPTERS[5].path, CHAPTERS[6].path];
  assert.equal(new Set(paths).size, 3);
  const positions = paths.map(path => routePosition(path, false, 0, 600).x);
  assert.equal(new Set(positions.map(Math.round)).size, 3);
  assert.ok(paths.every(path => routeLength(path) > 1800));
});

test('擊破前段後，長鏈不能長時間縮到畫面外', () => {
  const game = startRun(5);
  let sparse = 0;
  let current = 0;
  let longest = 0;
  for (let i = 0; i < 18000 && !['victory', 'defeat'].includes(game.phase); i++) {
    if (game.phase === 'upgrade') {
      const rank = ['power', 'multi', 'rapid', 'rail', 'arc', 'drone',
        'pierce', 'blast', 'frost', 'poison', 'burn'];
      chooseUpgrade(game, rank.find(id => game.choices.includes(id)) || game.choices[0]);
    }
    const chains = game.chains.filter(chain => !chain.dead);
    const bodies = chains.flatMap(chain => chain.segments.slice(1)
      .filter(piece => piece.y > 220 && piece.y < 710));
    const threat = chains.filter(chain => chain.segments[0].y > 580)
      .sort((a, b) => b.segments[0].y - a.segments[0].y)[0];
    const chest = bodies.filter(piece => piece.chest).sort((a, b) => b.y - a.y)[0];
    const near = bodies.sort((a, b) => b.y - a.y)[0];
    const guard = threat?.segments.slice(1, 8).find(piece => piece.y < 710);
    let x = guard?.x ?? chest?.x ?? near?.x ?? 195;
    advance(game, 0.05, x);
    const chain = game.chains.find(item => !item.boss && !item.dead);
    const visible = chain?.segments.filter(piece => piece.y > 40 && piece.y < 730
      && piece.x > -20 && piece.x < 410).length || 0;
    if (chain && chain.segments.length > 30 && visible < 8) {
      sparse += 0.05;
      current += 0.05;
      longest = Math.max(longest, current);
    } else current = 0;
  }
  assert.ok(sparse < 50, `長鏈畫面稀疏 ${sparse.toFixed(1)} 秒`);
  assert.ok(longest < 12, `連續稀疏 ${longest.toFixed(1)} 秒`);
});

test('勝利依序解鎖下一關，重玩不重複領首次通關獎勵', () => {
  const storage = memoryStorage();
  assert.equal(readProfile(storage).unlockedStage, 1);
  const game = startRun(102);
  game.phase = 'victory';
  const first = awardRun(storage, game);
  assert.equal(readProfile(storage).unlockedStage, 2);
  assert.equal(first.firstClear, true);
  const second = awardRun(storage, game);
  assert.equal(second.firstClear, false);
  assert.equal(readProfile(storage).unlockedStage, 2);
});
