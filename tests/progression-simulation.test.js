import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateProgression } from '../scripts/simulate-progression.mjs';
import { researchCost } from '../dist/src/storage.js';

test('永久研究前期買得起、後期仍有可追求的成長', () => {
  assert.deepEqual([0, 1, 2, 3].map(researchCost), [45, 120, 215, 330]);
});

test('從新存檔連續通關25關，按實際獎勵購買研究並裝備成長', () => {
  const { rows, failed } = simulateProgression();
  assert.equal(failed, false);
  assert.equal(rows.length, 25);
  assert.ok(rows.every(row => row.result === 'victory'),
    `未能逐關通關：${rows.filter(row => row.result !== 'victory')
      .map(row => `${row.chapter}關:${row.result}`).join(', ')}`);
  assert.ok(rows.every(row => row.attempts <= 4));
  assert.ok(rows[4].weapon === 'scatter', '第5關通關後應裝上里程碑武器');
  assert.ok(rows[9].organs.includes('focus-lens'), '第10關後應裝上弱點透鏡');
  assert.ok(rows[14].weapon === 'rail', '第15關後應換上穿骨針');
  assert.ok(rows[19].organs.includes('tempo'), '第20關後應裝上速搏心');
  assert.ok(rows[24].fire === 4 && rows[24].precision === 4,
    '後期火力和精準研究應完成成長');
  assert.ok(rows[24].thermal >= 2 && rows[24].momentum >= 2
    && rows[24].ricochet >= 2,
  '後期應買得到多種特殊戰鬥研究');
  assert.ok(rows[24].research < 500,
    '後期研究點不應因能力太少而大量閒置');
  assert.ok(rows[9].seconds >= 120, '第10關不能在火力成長後被瞬間清空');
  assert.ok(rows[24].seconds >= 130, '最後一關需有足夠的後期長戰節奏');
});
