import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_PROFILES, bossProfileFor } from '../dist/src/boss-profiles.js';
import { validateBossProfile } from '../dist/src/boss-rig.js';

test('五區雙頭目各有可用且不同的外型', () => {
  assert.equal(BOSS_PROFILES.length, 10);
  assert.equal(new Set(BOSS_PROFILES.map(item => item.id)).size, 10);
  for (let zone = 0; zone < 5; zone++) {
    const left = bossProfileFor(zone * 5 + 1, 0);
    const right = bossProfileFor(zone * 5 + 1, 1);
    assert.deepEqual(validateBossProfile(left), []);
    assert.deepEqual(validateBossProfile(right), []);
    assert.notEqual(left.silhouette, right.silhouette);
    assert.notEqual(left.colors.shell, right.colors.shell);
  }
});
