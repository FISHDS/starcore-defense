import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('前兩關頭目採用與其餘關卡一致的向量輪廓', () => {
  const source = readFileSync(new URL('../dist/src/boss-art.js', import.meta.url), 'utf8');
  assert.ok(source.includes("head: 'shiba-prototype-head.svg'"));
  assert.ok(source.includes("body: 'shiba-body.svg'"));
  assert.ok(source.includes('screech-cat-prototype-${part}.svg'));
});
