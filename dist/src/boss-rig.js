// 魔王共用骨架：戰鬥路徑只決定節點座標；此處只決定可視動作，不改變碰撞。
const STATES = ['idle', 'move', 'telegraph', 'strike', 'hurt', 'dying'];
const SILHOUETTES = ['mantis', 'coral', 'jelly', 'ram', 'core'];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function validateBossProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object') return ['外型資料必須是物件'];
  if (!/^[a-z][a-z0-9-]*$/.test(profile.id || '')) errors.push('id 必須是小寫英文');
  if (!profile.name || typeof profile.name !== 'string') errors.push('缺少名稱');
  if (!SILHOUETTES.includes(profile.silhouette)) errors.push('未知的頭部輪廓');
  for (const key of ['shell', 'shadow', 'glow', 'eye']) {
    if (!HEX.test(profile.colors?.[key] || '')) errors.push(`顏色 ${key} 必須是六位色碼`);
  }
  for (const key of ['headScale', 'bodyScale', 'hornLength', 'jawWidth', 'finLength']) {
    const value = profile.anatomy?.[key];
    if (!Number.isFinite(value) || value <= 0 || value > 60) errors.push(`骨架 ${key} 超出範圍`);
  }
  for (const key of ['sway', 'pulse', 'attackReach', 'hurtKick']) {
    const value = profile.motion?.[key];
    if (!Number.isFinite(value) || value < 0 || value > 30) errors.push(`動作 ${key} 超出範圍`);
  }
  return errors;
}

export function createBossRig(profileId) {
  return { profileId, phase: 1, telegraphFor: 0, strikeFor: 0,
    hurtFor: 0, dyingFor: 0, idle: false, telegraphLocked: false };
}

export function updateBossRig(chain, dt) {
  if (!chain?.boss || !chain.rig) return;
  for (const key of ['telegraphFor', 'strikeFor', 'hurtFor', 'dyingFor']) {
    chain.rig[key] = Math.max(0, (chain.rig[key] || 0) - dt);
  }
  const remaining = Math.max(0, chain.segments.length - 1);
  chain.rig.phase = remaining <= (chain.originalBodyCount || remaining) / 2 ? 2 : 1;
}

// 刀、盾、身體各有獨立的動作量；第二階段把揮刀方向鏡射。
export function resolveBossEquipmentPose(state, phase = 1, time = 0) {
  const weaponSide = phase === 2 ? -1 : 1;
  const motion = Math.sin(time * 5);
  const poses = {
    idle: { shieldLift: 0.08, knifeSwing: -0.25, recoil: 0, fall: 0, bob: motion * 1.2 },
    move: { shieldLift: 0.13, knifeSwing: -0.18 + motion * 0.12, recoil: 0, fall: 0, bob: motion * 2.8 },
    telegraph: { shieldLift: 0.86, knifeSwing: -0.5, recoil: 0, fall: 0, bob: -2 },
    strike: { shieldLift: 0.3, knifeSwing: 1.35, recoil: 0, fall: 0, bob: 3 },
    hurt: { shieldLift: 0.04, knifeSwing: -0.55, recoil: 8, fall: 0, bob: -3 },
    dying: { shieldLift: -0.45, knifeSwing: -1.2, recoil: 5, fall: 1, bob: 9 },
  };
  const current = poses[state] || poses.idle;
  return { ...current, weaponSide, knifeSwing: current.knifeSwing * weaponSide };
}

export function resolveBossPose(chain, profile, time = 0) {
  if (validateBossProfile(profile).length) throw new Error(`魔王外型資料無效：${profile?.id || '?'}`);
  if (!chain?.segments?.length) throw new Error('魔王骨架缺少身體節點');
  const rig = chain.rig || createBossRig(profile.id);
  const state = chain.dead || rig.dyingFor > 0 ? 'dying'
    : rig.hurtFor > 0 ? 'hurt'
      : rig.strikeFor > 0 ? 'strike'
        : rig.telegraphFor > 0 ? 'telegraph'
          : rig.idle ? 'idle' : 'move';
  const head = chain.segments[0];
  const neck = chain.segments[1] || { x: head.x, y: head.y - 25 };
  const angle = Math.atan2(head.y - neck.y, head.x - neck.x) - Math.PI / 2;
  const phaseScale = rig.phase === 2 ? 1.12 : 1;
  const sway = Math.sin(time * (state === 'telegraph' ? 12 : 5))
    * profile.motion.sway * (state === 'hurt' ? 0.4 : 1);
  const forward = state === 'strike' ? profile.motion.attackReach
    : state === 'hurt' ? -profile.motion.hurtKick : 0;
  const normalX = Math.cos(angle);
  const normalY = Math.sin(angle);
  const spine = chain.segments.map((piece, index) => ({
    x: piece.x + (index ? Math.sin(time * 4 - index * 0.65) * profile.motion.sway * 0.45 : sway),
    y: piece.y,
    index,
  }));
  const joints = spine.slice(1).map((piece, index) => ({
    x: (piece.x + spine[index].x) / 2,
    y: (piece.y + spine[index].y) / 2,
    index,
  }));
  return {
    state, phase: rig.phase, angle,
    head: { x: head.x + sway + normalX * forward,
      y: head.y + normalY * forward,
      scale: profile.anatomy.headScale * phaseScale
        * (1 + Math.sin(time * 4) * profile.motion.pulse) },
    spine, joints,
    antenna: [-1, 1].map(side => ({ side,
      length: profile.anatomy.hornLength * (state === 'telegraph' ? 1.24 : 1),
      bend: Math.sin(time * 5 + side) * profile.motion.sway })),
    jaw: profile.anatomy.jawWidth * (state === 'strike' ? 1.35 : 1),
    fin: profile.anatomy.finLength * (state === 'hurt' ? 0.65 : 1),
  };
}

export { STATES as BOSS_STATES, SILHOUETTES as BOSS_SILHOUETTES };
