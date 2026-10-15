import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBattleHint } from '../dist/src/tutorial.js';

test('第一關未擊破身體前持續提示側移瞄準', () => {
  const game = { phase: 'playing', chapter: 1, encounter: 'normal', wave: 1, waveTime: 30, normalDestroyed: 0 };
  assert.match(getBattleHint(game), /側移/);
  assert.match(getBattleHint(game), /身體/);
  assert.equal(getBattleHint({ ...game, normalDestroyed: 1 }), '');
});

test('結果按鈕有獨立文字節點與圖示', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="retry-label"[^>]*>再戰一次<\/span>/);
  assert.match(html, /id="retry-button"[^>]*>[\s\S]*?aria-hidden="true"/);
});
