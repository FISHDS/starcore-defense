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

test('舉盾、揮刀、受擊和死亡有可辨識的不同姿勢', () => {
  const idle = resolveBossEquipmentPose('idle', 1, 0);
  const telegraph = resolveBossEquipmentPose('telegraph', 1, 0);
  const strike = resolveBossEquipmentPose('strike', 1, 0);
  const hurt = resolveBossEquipmentPose('hurt', 1, 0);
  const dying = resolveBossEquipmentPose('dying', 1, 0);
  assert.ok(telegraph.shieldLift > idle.shieldLift);
  assert.ok(strike.knifeSwing > idle.knifeSwing + 0.4);
  assert.ok(hurt.recoil > idle.recoil);
  assert.ok(dying.fall > hurt.fall);
  assert.notDeepEqual(idle, telegraph);
});

test('半血後換手，攻擊視覺方向翻轉', () => {
  const first = resolveBossEquipmentPose('strike', 1, 0);
  const second = resolveBossEquipmentPose('strike', 2, 0);
  assert.equal(first.weaponSide, -second.weaponSide);
  assert.equal(first.knifeSwing, -second.knifeSwing);
});
