import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossRig, updateBossRig, resolveBossPose, validateBossProfile } from '../dist/src/boss-rig.js';
import { advance, startRun } from '../dist/src/game.js';

const profile = {
  id: 'test', name: '測試母體', silhouette: 'mantis',
  colors: { shell: '#aa4455', shadow: '#552233', glow: '#ffee99', eye: '#ffffff' },
  anatomy: { headScale: 1, bodyScale: 1, hornLength: 18, jawWidth: 13, finLength: 16 },
  motion: { sway: 2, pulse: 0.06, attackReach: 9, hurtKick: 7 },
};

test('魔王外型資料需包含骨架與動作所需的有效參數', () => {
  assert.deepEqual(validateBossProfile(profile), []);
  assert.ok(validateBossProfile({ ...profile, anatomy: { ...profile.anatomy, headScale: 0 } }).length);
  assert.ok(validateBossProfile({ ...profile, colors: { ...profile.colors, shell: 'red' } }).length);
});

test('骨架關節沿現有長鏈排列，並隨移動與受擊改變姿勢', () => {
  const chain = { boss: true, dead: false, originalBodyCount: 4, segments: [
    { x: 100, y: 250, index: 0 }, { x: 100, y: 210, index: 1 },
    { x: 96, y: 170, index: 2 }, { x: 90, y: 130, index: 3 },
    { x: 80, y: 90, index: 4 },
  ], rig: createBossRig('test') };
  const moving = resolveBossPose(chain, profile, 0);
  assert.equal(moving.state, 'move');
  assert.equal(moving.spine.length, 5);
  assert.equal(moving.joints.length, 4);
  chain.rig.hurtFor = 0.3;
  const hurt = resolveBossPose(chain, profile, 0);
  assert.equal(hurt.state, 'hurt');
  assert.notDeepEqual(hurt.head, moving.head);
  updateBossRig(chain, 0.31);
  assert.equal(chain.rig.hurtFor, 0);
});

test('半數身體擊破後進第二階段；預警、攻擊、死亡有獨立狀態', () => {
  const chain = { boss: true, dead: false, originalBodyCount: 4,
    segments: [{ x: 100, y: 250 }, { x: 100, y: 210 }, { x: 96, y: 170 }],
    rig: createBossRig('test') };
  updateBossRig(chain, 0.1);
  assert.equal(chain.rig.phase, 2);
  chain.rig.telegraphFor = 0.5;
  assert.equal(resolveBossPose(chain, profile, 1).state, 'telegraph');
  chain.rig.telegraphFor = 0;
  chain.rig.strikeFor = 0.3;
  assert.equal(resolveBossPose(chain, profile, 1).state, 'strike');
  chain.dead = true;
  assert.equal(resolveBossPose(chain, profile, 1).state, 'dying');
});

test('實戰雙頭目各帶共用骨架，發射前會明顯預警', () => {
  const game = startRun(7, {}, 2);
  game.encounter = 'boss';
  advance(game, 0.1);
  assert.equal(game.bosses.length, 2);
  assert.ok(game.bosses.every(boss => boss.rig && boss.originalBodyCount > 0));
  for (let step = 0; step < 26; step++) advance(game, 0.1);
  assert.ok(game.bosses.some(boss => boss.rig.telegraphFor > 0));
});

test('頭目預警開始即鎖定落點，最後一刻移動也不會被重新追蹤', () => {
  const game = startRun(29, {}, 2);
  game.encounter = 'boss';
  for (let step = 0; step < 40; step++) advance(game, 0.1, 195);
  const boss = game.bosses[1];
  // 等待下一次預警；前一次飛彈可能仍在空中。
  game.enemyBullets = [];
  while (boss.rig.telegraphFor <= 0) advance(game, 0.1, 195);
  const lockedX = boss.rig.targetX;
  while (boss.rig.telegraphFor > 0) advance(game, 0.1, 300);
  assert.equal(lockedX, 195);
  const genericShots = game.enemyBullets.filter(shot => shot.kind !== 'knifeSlash');
  assert.ok(genericShots.length >= 2);
  const landing = genericShots.slice(0, 2)
    .map(shot => shot.x + shot.vx * ((game.player.y - shot.y) / shot.vy))
    .sort((a, b) => a - b);
  assert.ok(Math.abs(landing[0] - 155) < 4, `左彈落點 ${landing[0]}`);
  assert.ok(Math.abs(landing[1] - 235) < 4, `右彈落點 ${landing[1]}`);
});
