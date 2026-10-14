import { advance, chooseUpgrade, HEIGHT, startRun, UPGRADE_BY_ID, WAVES, WIDTH } from './game.js';
import { pointerToWorldX } from './input.js';
import { render } from './render.js';
import { clearCheckpoint, loadCheckpoint, readBest, saveCheckpoint, updateBest } from './storage.js';

const $ = id => document.getElementById(id);
const canvas = $('arena');
const ctx = canvas.getContext('2d', { alpha: false });
const shell = document.querySelector('.game-shell');
const menu = $('menu');
const hud = $('hud');
const hint = $('hint');
const upgradeScreen = $('upgrade-screen');
const pauseScreen = $('pause-screen');
const resultScreen = $('result-screen');

const fallbackData = new Map();
const fallbackStorage = {
  getItem: key => fallbackData.get(key) ?? null,
  setItem: (key, value) => fallbackData.set(key, value),
  removeItem: key => fallbackData.delete(key),
};
let storage;
try { storage = window.localStorage; } catch { storage = fallbackStorage; }

let game = null;
let paused = false;
let dragging = false;
let targetX = WIDTH / 2;
let lastTime = 0;
let handledResult = false;
const keys = { left: false, right: false };

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(shell.clientWidth * ratio);
  canvas.height = Math.round(shell.clientHeight * ratio);
}
window.addEventListener('resize', resize);
resize();

function refreshHud() {
  if (!game) return;
  hint.hidden = game.phase !== 'playing' || paused || game.wave > 1 || game.waveTime > 5;
  const wave = WAVES[game.wave - 1];
  $('wave-number').textContent = String(game.wave).padStart(2, '0');
  $('wave-name').textContent = wave.name;
  $('core-value').textContent = String(Math.ceil(game.core));
  $('score-value').textContent = game.score.toLocaleString('zh-TW');
  const head = game.boss?.segments[0];
  const progress = wave.boss && head
    ? 1 - Math.max(0, head.hp) / head.maxHp
    : Math.min(1, game.waveTime / wave.duration);
  $('wave-progress').style.width = `${Math.max(0, progress) * 100}%`;
  $('core-progress').style.width = `${game.core}%`;
}

function makeCards() {
  const holder = $('upgrade-cards');
  holder.replaceChildren();
  for (const id of game.choices) {
    const item = UPGRADE_BY_ID[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `upgrade-card tone-${item.tone}`;
    button.setAttribute('aria-label', `${item.name}：${item.description}`);
    const icon = document.createElement('span');
    icon.className = 'upgrade-icon'; icon.textContent = item.icon;
    const text = document.createElement('span');
    text.className = 'upgrade-text';
    const name = document.createElement('span');
    name.className = 'upgrade-name'; name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'upgrade-desc'; desc.textContent = item.description;
    const level = document.createElement('span');
    level.className = 'upgrade-level';
    level.textContent = `目前等級 ${game.upgrades[id] || 0} · 選後等級 ${(game.upgrades[id] || 0) + 1}`;
    text.append(name, desc, level);
    const arrow = document.createElement('span');
    arrow.className = 'upgrade-arrow'; arrow.textContent = '↗';
    button.append(icon, text, arrow);
    button.addEventListener('click', () => {
      if (!chooseUpgrade(game, id)) return;
      saveCheckpoint(storage, game);
      targetX = game.player.x;
      syncScreen();
    });
    holder.append(button);
  }
}

function setResult() {
  if (!game || handledResult) return;
  handledResult = true;
  clearCheckpoint(storage);
  const best = updateBest(storage, game.score);
  const won = game.phase === 'victory';
  resultScreen.classList.toggle('is-defeat', !won);
  $('result-kicker').textContent = won ? 'MISSION COMPLETE' : 'SIGNAL LOST';
  $('result-emblem').textContent = won ? '✦' : '◇';
  $('result-title').textContent = won ? '星核守住了' : '防線失守';
  $('result-copy').textContent = won ? '你讓這片星空繼續發光。' : '重新調整火力，下一次守住它。';
  $('final-score').textContent = game.score.toLocaleString('zh-TW');
  $('best-score').textContent = best.toLocaleString('zh-TW');
}

function syncScreen() {
  menu.hidden = !!game;
  hud.hidden = !game;
  hint.hidden = !game || game.phase !== 'playing' || paused;
  upgradeScreen.hidden = !game || game.phase !== 'upgrade';
  pauseScreen.hidden = !game || !paused || game.phase !== 'playing';
  resultScreen.hidden = !game || !['victory', 'defeat'].includes(game.phase);
  if (!game) $('continue-button').hidden = !loadCheckpoint(storage);
  if (game?.phase === 'upgrade') makeCards();
  if (game && ['victory', 'defeat'].includes(game.phase)) setResult();
  refreshHud();
}

function beginNew() {
  clearCheckpoint(storage);
  game = startRun(Math.floor(Math.random() * 0xffffffff));
  paused = false;
  handledResult = false;
  targetX = game.player.x;
  saveCheckpoint(storage, game);
  syncScreen();
}

function continueRun() {
  const loaded = loadCheckpoint(storage);
  if (!loaded) return;
  game = loaded;
  paused = false;
  handledResult = false;
  targetX = game.player.x;
  syncScreen();
}

$('start-button').addEventListener('click', beginNew);
$('retry-button').addEventListener('click', beginNew);
$('continue-button').addEventListener('click', continueRun);
$('pause-button').addEventListener('click', () => { paused = true; syncScreen(); });
$('resume-button').addEventListener('click', () => { paused = false; syncScreen(); });
$('menu-button').addEventListener('click', () => { game = null; paused = false; syncScreen(); });

canvas.addEventListener('pointerdown', event => {
  if (!game || game.phase !== 'playing' || paused) return;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  targetX = pointerToWorldX(event.clientX, canvas.getBoundingClientRect());
});
canvas.addEventListener('pointermove', event => {
  if (dragging) targetX = pointerToWorldX(event.clientX, canvas.getBoundingClientRect());
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });

window.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
  if (event.key === 'Escape' && game?.phase === 'playing') { paused = !paused; syncScreen(); }
});
window.addEventListener('keyup', event => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game?.phase === 'playing') { paused = true; syncScreen(); }
});

function frame(timestamp) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
  lastTime = timestamp;
  if (game?.phase === 'playing' && !paused) {
    if (keys.left) targetX -= dt * 280;
    if (keys.right) targetX += dt * 280;
    targetX = Math.max(26, Math.min(WIDTH - 26, targetX));
    const oldPhase = game.phase;
    advance(game, dt, targetX);
    if (game.phase !== oldPhase) syncScreen();
    else refreshHud();
  }
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  render(ctx, game, timestamp / 1000);
  requestAnimationFrame(frame);
}

syncScreen();
requestAnimationFrame(frame);
