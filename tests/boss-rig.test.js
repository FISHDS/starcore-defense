import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_STATES, createBossRig, updateBossRig, resolveBossPose, validateBossProfile } from '../dist/src/boss-rig.js';
import { advance, CHAPTERS, startRun } from '../dist/src/game.js';

const profile = {
  id: 'test', name: '測試母體', silhouette: 'mantis',
  colors: { shell: '#aa4455', shadow: '#552233', glow: '#ffee99', eye: '#ffffff' },
  anatomy: { headScale: 1, bodyScale: 1, hornLength: 18, jawWidth: 13, finLength: 16 },
  motion: { sway: 2, pulse: 0.06, hurtKick: 7 },
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

test('半數身體擊破後進第二階段，骨架仍支援受擊與死亡姿勢', () => {
  const chain = { boss: true, dead: false, originalBodyCount: 4,
    segments: [{ x: 100, y: 250 }, { x: 100, y: 210 }, { x: 96, y: 170 }],
    rig: createBossRig('test') };
  updateBossRig(chain, 0.1);
  assert.equal(chain.rig.phase, 2);
  chain.rig.hurtFor = 0.3;
  assert.equal(resolveBossPose(chain, profile, 1).state, 'hurt');
  chain.dead = true;
  assert.equal(resolveBossPose(chain, profile, 1).state, 'dying');
});

test('所有關卡的頭目只沿路行軍，不發射彈幕或累積攻擊預警', () => {
  for (const stage of CHAPTERS) {
    const game = startRun(80 + stage.id, {}, stage.id);
    game.encounter = 'boss';
    for (let frame = 0; frame < 80 && game.phase === 'playing'; frame++) advance(game, 0.05);
    assert.ok(game.bosses.length > 0, `第${stage.id}關應生成頭目`);
    assert.equal('enemyBullets' in game, false, `第${stage.id}關不可生成敵方彈幕`);
    assert.ok(game.bosses.every(boss => !('telegraphFor' in boss.rig)),
      `第${stage.id}關不可顯示頭目攻擊預警`);
    assert.ok(game.bosses.every(boss => !boss.rig.loadingFollowup));
  }
});

test('正式頭目骨架不再有攻擊或預警姿勢', () => {
  assert.deepEqual(BOSS_STATES, ['idle', 'move', 'hurt', 'dying']);
  const chain = { boss: true, dead: false, segments: [{ x: 100, y: 250 },
    { x: 100, y: 210 }], rig: createBossRig('test') };
  chain.rig.telegraphFor = 1;
  chain.rig.strikeFor = 1;
  assert.equal(resolveBossPose(chain, profile, 0).state, 'move');
});
