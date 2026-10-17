import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bossProfileFor } from '../dist/src/boss-profiles.js';
import { resolveBossEquipmentPose } from '../dist/src/boss-rig.js';

test('第一區出現「我的刀盾」，並指定可動的原創部件', () => {
  const boss = bossProfileFor(1, 0);
  assert.equal(boss.id, 'meme-knife-shield');
  assert.equal(boss.name, '我的刀盾');
  assert.deepEqual(Object.keys(boss.parts).sort(), ['body', 'head', 'knife', 'shield']);
  for (const file of new Set(Object.values(boss.parts))) {
    const data = readFileSync(new URL(`../dist/assets/bosses/${file}`, import.meta.url));
    if (file.endsWith('.svg')) {
      assert.match(data.toString(), /<svg\b/);
      assert.match(data.toString(), /viewBox=/);
    } else {
      assert.deepEqual([...data.subarray(0, 4)], [137, 80, 78, 71]);
    }
  }
});

test('移動、受擊和死亡姿勢有差異，舊攻擊狀態不會套用', () => {
  const idle = resolveBossEquipmentPose('idle', 1, 0);
  const moving = resolveBossEquipmentPose('move', 1, 0);
  const hurt = resolveBossEquipmentPose('hurt', 1, 0);
  const dying = resolveBossEquipmentPose('dying', 1, 0);
  assert.notDeepEqual(moving, idle);
  assert.ok(hurt.recoil > idle.recoil);
  assert.ok(dying.fall > hurt.fall);
  assert.deepEqual(resolveBossEquipmentPose('telegraph', 1, 0), idle);
  assert.deepEqual(resolveBossEquipmentPose('strike', 1, 0), idle);
});

test('半血後刀盾換到另一側，仍只作為角色外型', () => {
  const first = resolveBossEquipmentPose('move', 1, 0);
  const second = resolveBossEquipmentPose('move', 2, 0);
  assert.equal(first.weaponSide, -second.weaponSide);
  assert.equal(first.knifeSwing, -second.knifeSwing);
});
