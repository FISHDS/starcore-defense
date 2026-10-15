import { advance, CHAPTERS, chooseUpgrade, getRunProgress, HEIGHT, rerollUpgrades, startRun, UPGRADE_BY_ID, WAVES, WIDTH } from './game.js?v=20261015-singlechain';
import { pointerToWorldX } from './input.js';
import { render } from './render.js?v=20261015-singlechain';
import { awardRun, buyResearch, clearCheckpoint, loadCheckpoint, readProfile, researchCost, saveCheckpoint, updateBest } from './storage.js?v=20261015-singlechain';

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
const researchScreen = $('research-screen');

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
let showResearch = false;
let lastSavedAt = 0;
let selectedChapter = 1;
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
  $('wave-number').textContent = `第${game.chapter}關`;
  $('wave-name').textContent = `${CHAPTERS[game.chapter - 1].name} · ${wave.name}`;
  $('core-value').textContent = String(Math.ceil(game.core));
  $('score-value').textContent = game.score.toLocaleString('zh-TW');
  const progress = getRunProgress(game);
  $('wave-progress').style.width = `${Math.max(0, progress) * 100}%`;
  $('core-progress').style.width = `${game.core / game.maxCore * 100}%`;
  const nearBoss = game.bosses.some(boss => !boss.dead && boss.segments[0].y > 540);
  $('boss-warning').hidden = game.phase !== 'playing' || !nearBoss;
  $('boss-warning').textContent = '雙母體逼近 · 瞄準身體讓頭部後退';
}

function refreshResearch() {
  const profile = readProfile(storage);
  $('menu-dna').textContent = `◆ ${profile.dna}`;
  $('research-dna').textContent = String(profile.dna);
  for (const id of ['fire', 'guard', 'scavenge']) {
    const level = profile[id];
    const cost = researchCost(level);
    $(`research-${id}-level`).textContent = `等級 ${level} / 4`;
    $(`research-${id}-cost`).textContent = level >= 4 ? '已滿' : `◆ ${cost}`;
    researchScreen.querySelector(`[data-research="${id}"]`).disabled = level >= 4 || profile.dna < cost;
  }
}

function makeCards() {
  $('upgrade-kicker').textContent = game.upgradeSource === 'gold' ? 'GOLD SUPPLY' : 'SUPPLY OPENED';
  $('upgrade-title').textContent = '寶箱技能三選一';
  $('upgrade-foot').textContent = '選定後，回到原本的連續戰鬥';
  const holder = $('upgrade-cards');
  holder.replaceChildren();
  const rarityName = { common: '普通', rare: '稀有', epic: '傳說' };
  for (const id of game.choices) {
    const item = UPGRADE_BY_ID[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `upgrade-card rarity-${item.rarity} tone-${item.tone}`;
    button.setAttribute('aria-label', `${item.name}：${item.description}`);
    const icon = document.createElement('span');
    icon.className = 'upgrade-icon'; icon.textContent = item.icon;
    const rarity = document.createElement('span');
    rarity.className = 'upgrade-rarity'; rarity.textContent = rarityName[item.rarity];
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
    button.append(rarity, icon, text, arrow);
    button.addEventListener('click', () => {
      if (!chooseUpgrade(game, id)) return;
      saveCheckpoint(storage, game);
      targetX = game.player.x;
      syncScreen();
    });
    holder.append(button);
  }
  const reroll = $('reroll-button');
  reroll.disabled = game.rerollsLeft <= 0;
  reroll.textContent = game.rerollsLeft > 0
    ? `免費刷新 · 剩餘 ${game.rerollsLeft} 次` : '本次已刷新';
}

function setResult() {
  if (!game || handledResult) return;
  handledResult = true;
  clearCheckpoint(storage);
  const best = updateBest(storage, game.score);
  const reward = awardRun(storage, game);
  const won = game.phase === 'victory';
  resultScreen.classList.toggle('is-defeat', !won);
  $('result-kicker').textContent = won ? 'MISSION COMPLETE' : 'SIGNAL LOST';
  $('result-emblem').textContent = won ? '✦' : '◇';
  $('result-title').textContent = won ? '星核守住了' : '防線失守';
  $('result-copy').textContent = won ? '你讓這片星空繼續發光。' : '重新調整火力，下一次守住它。';
  $('final-score').textContent = game.score.toLocaleString('zh-TW');
  $('best-score').textContent = best.toLocaleString('zh-TW');
  $('dna-gained').textContent = `+${reward.gained}`;
  refreshResearch();
}

function syncScreen() {
  menu.hidden = !!game || showResearch;
  $('boss-warning').hidden = !game || game.phase !== 'playing';
  researchScreen.hidden = !showResearch;
  hud.hidden = !game;
  hint.hidden = !game || game.phase !== 'playing' || paused;
  upgradeScreen.hidden = !game || game.phase !== 'upgrade';
  pauseScreen.hidden = !game || !paused || game.phase !== 'playing';
  resultScreen.hidden = !game || !['victory', 'defeat'].includes(game.phase);
  if (!game) $('continue-button').hidden = !loadCheckpoint(storage);
  if (game?.phase === 'upgrade') makeCards();
  if (game && ['victory', 'defeat'].includes(game.phase)) setResult();
  refreshHud();
  refreshResearch();
}

function beginNew() {
  clearCheckpoint(storage);
  game = startRun(Math.floor(Math.random() * 0xffffffff), readProfile(storage), selectedChapter);
  paused = false;
  handledResult = false;
  targetX = game.player.x;
  lastSavedAt = 0;
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
  lastSavedAt = game.runTime;
  syncScreen();
}

$('start-button').addEventListener('click', beginNew);
$('retry-button').addEventListener('click', beginNew);
$('continue-button').addEventListener('click', continueRun);
$('reroll-button').addEventListener('click', () => {
  if (!game || !rerollUpgrades(game)) return;
  saveCheckpoint(storage, game);
  makeCards();
});
$('research-button').addEventListener('click', () => { showResearch = true; syncScreen(); });
$('research-back').addEventListener('click', () => { showResearch = false; syncScreen(); });
for (const button of document.querySelectorAll('[data-chapter]')) {
  button.addEventListener('click', () => {
    selectedChapter = Number(button.dataset.chapter);
    for (const option of document.querySelectorAll('[data-chapter]')) {
      const active = Number(option.dataset.chapter) === selectedChapter;
      option.classList.toggle('selected', active);
      option.setAttribute('aria-pressed', String(active));
    }
  });
}
for (const button of researchScreen.querySelectorAll('[data-research]')) {
  button.addEventListener('click', () => {
    buyResearch(storage, button.dataset.research);
    refreshResearch();
  });
}
$('pause-button').addEventListener('click', () => {
  if (game) saveCheckpoint(storage, game);
  paused = true; syncScreen();
});
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
  if (document.hidden && game?.phase === 'playing') {
    saveCheckpoint(storage, game);
    paused = true; syncScreen();
  }
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
    if (game.phase !== oldPhase) {
      if (game.phase === 'upgrade') saveCheckpoint(storage, game);
      syncScreen();
    }
    else refreshHud();
    if (game.phase === 'playing' && game.runTime - lastSavedAt >= 12) {
      saveCheckpoint(storage, game);
      lastSavedAt = game.runTime;
    }
  }
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  render(ctx, game, timestamp / 1000);
  requestAnimationFrame(frame);
}

syncScreen();
requestAnimationFrame(frame);
