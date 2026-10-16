import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advance, chooseUpgrade, createBossShowcase, getRunProgress, hitSegment, startRun } from '../dist/src/game.js';
import { awardRun, loadCheckpoint, readProfile, saveCheckpoint } from '../dist/src/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
}

test('快速體驗立即看見我的刀盾，保留兩個身體寶箱與換手階段', () => {
  const game = createBossShowcase(90);
  assert.equal(game.preview, true);
  assert.equal(game.encounter, 'boss');
  assert.equal(game.bosses.length, 1);
  const boss = game.bosses[0];
  assert.equal(boss.rig.profileId, 'meme-knife-shield');
  assert.ok(boss.segments[0].y > 160 && boss.segments[0].y < 600);
  assert.ok(boss.segments.filter(piece => piece.chest).length >= 2);
  assert.ok(boss.originalBodyCount < 41);
  assert.equal(getRunProgress(game), 0);
  const chest = boss.segments.find(piece => piece.chest);
  assert.equal(hitSegment(game, boss, chest, chest.hp + 1), true);
  assert.equal(game.phase, 'upgrade');
});

test('快速體驗第三關實際生成已讀不回群組長與可打手機', () => {
  const game = createBossShowcase(93, 3);
  const boss = game.bosses[0];
  assert.equal(boss.rig.profileId, 'meme-seen-zone-admin');
  assert.ok(boss.segments.some(piece => piece.weakpoint
    && piece.id === boss.rig.weakpointId));
  assert.equal(game.bosses.length, 1);
});

test('快速體驗第五關實際生成棺材舞領隊與可打抬棺手節', () => {
  const game = createBossShowcase(95, 5);
  const boss = game.bosses[0];
  assert.equal(boss.rig.profileId, 'meme-last-shift-coffin-leader');
  assert.ok(boss.segments.some(piece => piece.weakpoint
    && piece.id === boss.rig.weakpointId));
  assert.equal(game.bosses.length, 1);
});

test('快速體驗無法覆蓋續玩、研究點與關卡解鎖', () => {
  const storage = memoryStorage();
  const regular = startRun(91);
  saveCheckpoint(storage, regular);
  const checkpoint = storage.getItem('starcore.checkpoint.v5');
  const profile = readProfile(storage);
  const preview = createBossShowcase(92);
  saveCheckpoint(storage, preview);
  preview.phase = 'victory';
  const reward = awardRun(storage, preview);
  assert.equal(storage.getItem('starcore.checkpoint.v5'), checkpoint);
  assert.equal(loadCheckpoint(storage).seed, regular.seed);
  assert.deepEqual(readProfile(storage), profile);
  assert.equal(reward.gained, 0);
});

test('試打需要瞄準；主動追擊可過關，原地亂射會輸', () => {
  function trial(active) {
    const game = createBossShowcase(90);
    for (let frame = 0; frame < 2400 && game.phase !== 'victory'
      && game.phase !== 'defeat'; frame++) {
      if (game.phase === 'upgrade') chooseUpgrade(game, game.choices[0]);
      const target = game.boss.segments.filter(piece => piece.index > 0
        && piece.y > 120 && piece.y < 710).sort((a, b) => b.y - a.y)[0];
      advance(game, 0.05, active && target ? target.x : 195);
    }
    return game;
  }
  const idle = trial(false);
  const active = trial(true);
  assert.equal(idle.phase, 'defeat');
  assert.equal(active.phase, 'victory');
  assert.ok(active.runTime < 120);
});

test('首頁及直接連結都能進入快速體驗介紹', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../dist/src/main.js', import.meta.url), 'utf8');
  assert.match(html, /id="showcase-button"/);
  assert.match(html, /id="showcase-screen"/);
  assert.match(html, /id="showcase-play"/);
  assert.match(main, /\$\('showcase-admin'\)\.addEventListener\('click', \(\) => selectShowcase\(3\)\)/);
  assert.match(html, /id="showcase-coffin"/);
  assert.match(html, /last-shift-coffin-leader-showcase\.svg/);
  assert.match(main, /\$\('showcase-coffin'\)\.addEventListener\('click', \(\) => selectShowcase\(5\)\)/);
  assert.match(main, /chapter === 3 \? '已讀不回群組長'/);
  assert.match(main, /showcaseQuery === 'coffin-dance' \? 5/);
  assert.match(main, /game\.preview\s*&&\s*game\.encounter === 'boss'\s*\?\s*encounterName/);
  assert.match(main, /game\.preview \? '頭目'/);
  assert.match(main, /URLSearchParams\(window\.location\.search\)/);
});
