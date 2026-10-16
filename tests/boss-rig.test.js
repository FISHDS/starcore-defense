import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossRig, updateBossRig, resolveBossPose, validateBossProfile } from '../dist/src/boss-rig.js';
import { advance, CHAPTERS, startRun } from '../dist/src/game.js';

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
  const game = startRun(7, {}, 10);
  game.encounter = 'boss';
  advance(game, 0.1);
  assert.equal(game.bosses.length, 2);
  assert.ok(game.bosses.every(boss => boss.rig && boss.originalBodyCount > 0));
  game.bossShotTimer = 2.2;
  advance(game, 0.02);
  assert.ok(game.bosses.some(boss => boss.rig.telegraphFor > 0));
});

test('中央守點頭目不會發射攻擊或累積攻擊預警，底線頭目仍照常攻擊', () => {
  const centerChapters = CHAPTERS.filter(stage => stage.positionMode === 'center');
  for (const stage of centerChapters) {
    const center = startRun(81 + stage.id, {}, stage.id);
    center.encounter = 'boss';
    center.fireTimer = -100000;
    advance(center, 0.05);
    center.enemyBullets = [];
    center.bossShotTimer = 20;
    advance(center, 0.05);
    assert.equal(center.enemyBullets.length, 0, `第${stage.id}關不能發射頭目攻擊`);
    assert.ok(center.bosses.every(boss => boss.rig.telegraphFor === 0),
      `第${stage.id}關不能顯示頭目攻擊預警`);
    assert.ok(center.bosses.every(boss => !boss.rig.telegraphLocked));
    assert.ok(center.bosses.every(boss => !boss.rig.loadingFollowup));
  }

  const bottom = startRun(82, {}, 1);
  bottom.encounter = 'boss';
  advance(bottom, 0.05);
  bottom.bosses[0].segments[0].y = 300;
  bottom.bossShotTimer = 2.2;
  advance(bottom, 0.05);
  assert.ok(bottom.bosses.some(boss => boss.rig.telegraphFor > 0));
});

test('頭目預警鎖定固定核心，玩家最後一刻轉向也不會改變彈道', () => {
  const game = startRun(29, {}, 10);
  game.encounter = 'boss';
  advance(game, 0.1, { aimAngle: Math.PI / 2 });
  const boss = game.bosses[1];
  game.bossShotTimer = 2.2;
  advance(game, 0.02, { aimAngle: Math.PI / 2 });
  const locked = { x: boss.rig.targetX, y: boss.rig.targetY, angle: boss.rig.targetAngle };
  const fixedPlayer = { x: game.player.x, y: game.player.y };
  game.bossShotTimer = 2.69;
  advance(game, 0.02, { aimAngle: 0 });
  assert.equal(locked.x, fixedPlayer.x);
  assert.equal(locked.y, fixedPlayer.y);
  const genericShots = game.enemyBullets.filter(shot => shot.kind !== 'knifeSlash');
  assert.ok(genericShots.length >= 2);
  assert.ok(genericShots.some(shot => Math.abs(Math.atan2(shot.vy, shot.vx)
    - locked.angle) < 0.03));
  assert.deepEqual({ x: game.player.x, y: game.player.y }, fixedPlayer);
});
