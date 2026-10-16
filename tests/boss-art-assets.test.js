import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BOSS_PROFILES } from '../dist/src/boss-profiles.js';

test('每隻使用獨立造型素材的頭目都有可載入的頭部、身節與招牌部件', () => {
  const profiles = BOSS_PROFILES.filter(profile => profile.parts?.signature);
  assert.ok(profiles.length >= 11, '至少要接入兩批新頭目造型');
  for (const profile of profiles) {
    for (const part of ['head', 'body', 'signature']) {
      const path = new URL(`../dist/assets/bosses/${profile.parts[part]}`,
        import.meta.url);
      assert.ok(existsSync(path), `${profile.name}缺少${part}素材`);
    }
  }
});
