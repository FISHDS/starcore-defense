import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_PROFILES, bossProfileFor } from '../dist/src/boss-profiles.js';
import { validateBossProfile } from '../dist/src/boss-rig.js';

test('五區雙頭目各有可用且不同的外型', () => {
  assert.equal(BOSS_PROFILES.length, 14);
  assert.equal(new Set(BOSS_PROFILES.map(item => item.id)).size, 14);
  for (let zone = 0; zone < 5; zone++) {
    const left = bossProfileFor(zone * 5 + 1, 0);
    const right = bossProfileFor(zone * 5 + 1, 1);
    assert.deepEqual(validateBossProfile(left), []);
    assert.deepEqual(validateBossProfile(right), []);
    assert.notEqual(left.silhouette, right.silhouette);
    assert.notEqual(left.colors.shell, right.colors.shell);
  }
});

test('已讀不回群組長的專屬手機弱點只在第三關出現', () => {
  assert.equal(bossProfileFor(3, 0).id, 'meme-seen-zone-admin');
  for (let chapter = 4; chapter <= 25; chapter++) {
    assert.notEqual(bossProfileFor(chapter, 0).id, 'meme-seen-zone-admin');
    assert.notEqual(bossProfileFor(chapter, 1).id, 'meme-seen-zone-admin');
  }
});

test('第五關棺材舞領隊是獨立單頭目，使用專屬外型', () => {
  assert.equal(bossProfileFor(5, 0).id, 'meme-last-shift-coffin-leader');
  assert.deepEqual(validateBossProfile(bossProfileFor(5, 0)), []);
});

test('第六關轉圈載入獸使用獨立可驗證的迷因造型', () => {
  const profile = bossProfileFor(6, 0);
  assert.equal(profile.id, 'meme-loading-99');
  assert.equal(profile.name, '百分之九十九・轉圈載入獸');
  assert.deepEqual(validateBossProfile(profile), []);
  assert.equal(profile.parts.head, 'loading-99-atlas.svg');
  for (let chapter = 7; chapter <= 25; chapter++)
    assert.notEqual(bossProfileFor(chapter, 0).id, 'meme-loading-99');
});
