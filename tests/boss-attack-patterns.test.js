import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTERS } from '../dist/src/campaign.js';
import { bossProfileFor } from '../dist/src/boss-profiles.js';

test('每個頭目都有獨立的繞場行軍描述，沒有攻擊招式資料', () => {
  const profiles = CHAPTERS.map(stage => bossProfileFor(stage.id, 0));
  assert.ok(profiles.every(profile => profile.routeStyle));
  assert.ok(new Set(profiles.slice(0, 20).map(profile => profile.routeStyle)).size >= 16);
  assert.ok(profiles.every(profile => !('attackStyle' in profile) && !('attackHint' in profile)));
  assert.ok(profiles.every(profile => !('attackReach' in profile.motion)
    && !('warning' in profile.parts)));
});

test('頭目戰鬥程式不載入彈幕攻擊模組', () => {
  const game = readFileSync(new URL('../dist/src/game.js', import.meta.url), 'utf8');
  assert.doesNotMatch(game, /boss-attacks\.js|bossVolleyFor|updateBossShots/);
  assert.doesNotMatch(game, /bossAttackCount|bossShotTimer|telegraphFor/);
});
