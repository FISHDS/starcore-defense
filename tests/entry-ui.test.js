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
  assert.match(html, /id="retry-label"[^>]*>返回主畫面<\/span>/);
  assert.match(html, /id="retry-button"[^>]*>[\s\S]*?aria-hidden="true"/);
});

test('首頁明確告知頭目不會攻擊且沒有守點耐久判敗', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /頭目不發動攻擊/);
  assert.match(html, /突破外圍終點，任務即告失敗/);
  assert.doesNotMatch(html, /星核耐久|碰到守點即敗|碰底線即敗|星核仍在等你/);
});

test('正式關卡結算後先回主畫面培養，不直接接下一關', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../dist/src/main.js', import.meta.url), 'utf8');
  assert.match(html, /id="retry-label"[^>]*>返回主畫面<\/span>/);
  assert.doesNotMatch(main, /挑戰下一關/);
  assert.doesNotMatch(main, /game\?\.preview \? beginShowcase\(\) : beginNew\(\)/);
});

test('切換分頁只保存進度，不自行打開暫停畫面', () => {
  const main = readFileSync(new URL('../dist/src/main.js', import.meta.url), 'utf8');
  const visibilityHandler = main.match(/document\.addEventListener\('visibilitychange', \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(visibilityHandler);
  assert.match(visibilityHandler[1], /saveCheckpoint/);
  assert.doesNotMatch(visibilityHandler[1], /paused\s*=\s*true|syncScreen/);
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
