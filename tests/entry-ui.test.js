import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBattleHint } from '../dist/src/tutorial.js';

test('第一關提示固定站位並轉向瞄準', () => {
  const game = { phase: 'playing', chapter: 1, encounter: 'normal', wave: 1, waveTime: 30, normalDestroyed: 0 };
  assert.match(getBattleHint(game), /固定在底線/);
  assert.match(getBattleHint(game), /轉向瞄準/);
  assert.match(getBattleHint(game), /身體/);
  assert.match(getBattleHint(game), /弱點亮起/);
  assert.doesNotMatch(getBattleHint(game), /打斷攻擊|敵方攻擊/);
  assert.equal(getBattleHint({ ...game, normalDestroyed: 1 }), '');
});

test('結果按鈕有獨立文字節點與圖示', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="retry-label"[^>]*>再戰一次<\/span>/);
  assert.match(html, /id="retry-button"[^>]*>[\s\S]*?aria-hidden="true"/);
});

test('首頁失敗提示適用中央守點與底線迎擊', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /頭部碰到守點即敗/);
  assert.doesNotMatch(html, /頭部碰底線即敗/);
});

test('戰鬥畫面不顯示遮住戰場的常駐頭目提示', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../dist/src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../dist/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="boss-warning"/);
  assert.doesNotMatch(main, /boss-warning|頭目正在繞場行軍/);
  assert.doesNotMatch(css, /\.boss-warning\{/);
  assert.match(html, /id="hint"/);
  assert.doesNotMatch(css, /\.gesture-hint\{top:54%;bottom:auto/);
  assert.doesNotMatch(css, /\.gesture-hint\.persistent-tutorial\{/);
});
