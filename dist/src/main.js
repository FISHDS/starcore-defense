import { advance, CHAPTERS, chooseUpgrade, getRunProgress, HEIGHT, rerollUpgrades, startRun, UPGRADE_BY_ID, WAVES, WIDTH } from './game.js?v=20261016-shiba-combat-1';
import { pointerToWorldX } from './input.js';
import { render } from './render.js?v=20261016-shiba-combat-1';
import { awardRun, buyResearch, buyItem, equipItem, clearCheckpoint, loadCheckpoint, readProfile, researchCost, saveCheckpoint, updateBest } from './storage.js?v=20261016-boss-evolution';
import { ORGANS, WEAPONS } from './meta.js';
import { drawSkillIcon } from './art.js?v=20261016-boss-evolution';
import { createAudioEngine } from './audio.js?v=20261016-shiba-combat-1';
import { getBattleHint } from './tutorial.js';

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
const stageScreen = $('stage-screen');
const loadoutScreen = $('loadout-screen');

const fallbackData = new Map();
const fallbackStorage = {
  getItem: key => fallbackData.get(key) ?? null,
  setItem: (key, value) => fallbackData.set(key, value),
  removeItem: key => fallbackData.delete(key),
};
let storage;
try { storage = window.localStorage; } catch { storage = fallbackStorage; }
const audio = createAudioEngine({ storage });

function refreshAudioButtons() {
  const settings = audio.getSettings();
  for (const button of document.querySelectorAll('[data-audio]')) {
    const music = button.dataset.audio === 'music';
    const muted = music ? settings.musicMuted : settings.effectsMuted;
    button.textContent = music ? `♫ 音樂${muted ? '關' : '開'}`
      : `♪ 音效${muted ? '關' : '開'}`;
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', `${muted ? '開啟' : '關閉'}${music ? '背景音樂' : '音效'}`);
  }
}

function syncAudioScene() {
  const zone = game?.chapter === 26
    ? 5 : game ? CHAPTERS[game.chapter - 1].zone + 1 : 1;
  const scene = !game ? 'menu' : paused ? 'paused'
    : game.phase === 'upgrade' ? 'upgrade'
      : game.phase === 'victory' || game.phase === 'defeat' ? 'result'
        : game.encounter === 'boss' ? 'boss' : 'battle';
  audio.setScene(scene, zone);
}

let game = null;
let paused = false;
let dragging = false;
let targetX = WIDTH / 2;
let lastTime = 0;
let handledResult = false;
let showResearch = false;
let showStages = false;
let showLoadout = false;
let lastSavedAt = 0;
let selectedChapter = readProfile(storage).unlockedStage;
let selectedZone = Math.floor((selectedChapter - 1) / 5);
let bossWarningActive = false;
let resultDelayUntil = 0;
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
  const wave = WAVES[game.wave - 1];
  const activeChapter = game.chapter === 26 ? CHAPTERS[20 + (game.endlessTier - 1) % 5]
    : CHAPTERS[game.chapter - 1];
  hint.textContent = getBattleHint(game, activeChapter.summary);
  hint.hidden = paused || !hint.textContent;
  hint.classList.toggle('persistent-tutorial', game.chapter === 1 && game.normalDestroyed === 0);
  $('wave-number').textContent = game.chapter === 26
    ? `無盡 ${game.endlessTier}` : `第${game.chapter}關`;
  const encounterName = game.encounter === 'boss' && activeChapter.bossMode === 'knife-shield'
    ? '我的刀盾' : wave.name;
  $('wave-name').textContent = `${game.chapter === 26 ? '無盡挑戰' : CHAPTERS[game.chapter - 1].name} · ${encounterName}`;
  $('core-value').textContent = String(Math.ceil(game.core));
  $('score-value').textContent = game.score.toLocaleString('zh-TW');
  const progress = getRunProgress(game);
  $('wave-progress').style.width = `${Math.max(0, progress) * 100}%`;
  $('core-progress').style.width = `${game.core / game.maxCore * 100}%`;
  const nearBoss = game.bosses.some(boss => !boss.dead && boss.segments[0].y > 540);
  $('boss-warning').hidden = game.phase !== 'playing' || !nearBoss;
  if (game.phase === 'playing' && nearBoss && !bossWarningActive) audio.playSfx('warning');
  bossWarningActive = game.phase === 'playing' && nearBoss;
  $('boss-warning').textContent = activeChapter.bossMode === 'knife-shield'
    ? '我的刀盾舉盾時改打亮盾以外的身體；揮刀後是反擊機會'
    : activeChapter.bossMode === 'final'
    ? '雙母體輪流亮起護盾 · 改打沒發光的長鏈'
    : '雙母體逼近 · 瞄準身體讓頭部後退';
}

function refreshResearch() {
  const profile = readProfile(storage);
  $('menu-dna').textContent = `◆ ${profile.dna}`;
  $('research-dna').textContent = String(profile.dna);
  for (const id of ['fire', 'guard', 'scavenge', 'tactics', 'collector']) {
    const level = profile[id];
    const cost = researchCost(level);
    $(`research-${id}-level`).textContent = `等級 ${level} / 4`;
    $(`research-${id}-cost`).textContent = level >= 4 ? '已滿' : `◆ ${cost}`;
    researchScreen.querySelector(`[data-research="${id}"]`).disabled = level >= 4 || profile.dna < cost;
  }
}

function refreshStages() {
  const profile = readProfile(storage);
  $('selected-stage').textContent = selectedChapter === 26
    ? `無盡挑戰 · 最佳第 ${profile.bestEndless} 輪`
    : `第 ${selectedChapter} 關 · ${CHAPTERS[selectedChapter - 1].name}`;
  const zones = $('stage-zones');
  zones.replaceChildren();
  for (let zone = 0; zone < 5; zone++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `zone-tab ${zone === selectedZone ? 'selected' : ''}`;
    button.textContent = `${zone + 1}區`;
    button.addEventListener('click', () => { selectedZone = zone; refreshStages(); });
    zones.append(button);
  }
  const stages = CHAPTERS.filter(stage => stage.zone === selectedZone);
  $('stage-summary').textContent = `${stages[0].region} · 已通關 ${profile.cleared.length} / 25`;
  const grid = $('stage-grid');
  grid.replaceChildren();
  for (const stage of stages) {
    const unlocked = stage.id <= profile.unlockedStage;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `stage-tile ${selectedChapter === stage.id ? 'selected' : ''}`;
    button.disabled = !unlocked;
    const number = document.createElement('strong');
    number.textContent = unlocked ? String(stage.id).padStart(2, '0') : '🔒';
    const name = document.createElement('span');
    name.textContent = stage.name;
    const state = document.createElement('small');
    state.textContent = profile.cleared.includes(stage.id) ? '已通關' : unlocked ? stage.difficulty : '未解鎖';
    const detail = document.createElement('em');
    detail.textContent = stage.summary;
    button.append(number, name, detail, state);
    button.addEventListener('click', () => {
      selectedChapter = stage.id;
      showStages = false;
      syncScreen();
    });
    grid.append(button);
  }
  $('endless-button').hidden = !profile.endlessUnlocked;
  $('endless-button').onclick = () => {
    selectedChapter = 26;
    showStages = false;
    syncScreen();
  };
}

function refreshLoadout() {
  const profile = readProfile(storage);
  $('loadout-dna').textContent = String(profile.dna);
  for (const [kind, items, holder] of [
    ['weapon', WEAPONS, $('weapon-list')], ['organ', ORGANS, $('organ-list')],
  ]) {
    holder.replaceChildren();
    for (const item of items) {
      const owned = (kind === 'weapon' ? profile.weapons : profile.organs).includes(item.id);
      const equipped = kind === 'weapon' ? profile.equippedWeapon === item.id
        : profile.equippedOrgans.includes(item.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `loadout-item ${equipped ? 'equipped' : ''}`;
      button.disabled = !owned && profile.dna < item.cost;
      const body = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = item.name;
      const desc = document.createElement('small'); desc.textContent = item.description;
      body.append(name, desc);
      const action = document.createElement('b');
      action.textContent = equipped ? '已裝備' : owned ? '裝備' : `◆ ${item.cost}`;
      button.append(body, action);
      button.addEventListener('click', () => {
        if (owned) equipItem(storage, kind, item.id);
        else buyItem(storage, item.id);
        refreshLoadout();
        refreshResearch();
      });
      holder.append(button);
    }
  }
}

function makeCards() {
  $('upgrade-kicker').textContent = game.upgradeSource === 'gold' ? 'GOLD SUPPLY' : 'SUPPLY OPENED';
  $('upgrade-title').textContent = '寶箱技能三選一';
  $('upgrade-foot').textContent = '選定後，回到原本的連續戰鬥';
  const holder = $('upgrade-cards');
  holder.replaceChildren();
  const rarityName = { common: '普通', rare: '稀有', epic: '傳說', evolution: '合成進化' };
  for (const id of game.choices) {
    const item = UPGRADE_BY_ID[id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `upgrade-card rarity-${item.rarity} tone-${item.tone}`;
    button.setAttribute('aria-label', `${item.name}：${item.description}`);
    const icon = document.createElement('canvas');
    icon.className = 'upgrade-icon'; icon.width = 112; icon.height = 112;
    const iconContext = icon.getContext('2d');
    iconContext.scale(2, 2);
    drawSkillIcon(iconContext, { id, x: 28, y: 28, size: 52 });
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
    level.textContent = item.rarity === 'evolution' ? '雙技能已達 2 級 · 本局限定'
      : `目前等級 ${game.upgrades[id] || 0} · 選後等級 ${(game.upgrades[id] || 0) + 1}`;
    text.append(name, desc, level);
    const arrow = document.createElement('span');
    arrow.className = 'upgrade-arrow'; arrow.textContent = '↗';
    button.append(rarity, icon, text, arrow);
    button.addEventListener('click', () => {
      if (!chooseUpgrade(game, id)) return;
      saveCheckpoint(storage, game);
      targetX = game.player.x;
      syncScreen();
      audio.playSfx('upgrade');
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
  $('result-title').textContent = won ? '防線守住了' : '防線失守';
  $('result-copy').textContent = won ? '這片培養區暫時安全了。' : '調整武器與器官，下一次守住它。';
  $('final-score').textContent = game.score.toLocaleString('zh-TW');
  $('best-score').textContent = best.toLocaleString('zh-TW');
  $('dna-gained').textContent = `+${reward.gained}`;
  if (reward.firstClear) {
    $('result-copy').textContent = game.chapter === 25
      ? '無盡挑戰已解鎖。準備迎接不斷變強的母巢。'
      : `已解鎖第 ${reward.profile.unlockedStage} 關。下一關有新的路線與機制。`;
    selectedChapter = game.chapter === 25 ? 26 : reward.profile.unlockedStage;
    selectedZone = Math.min(4, Math.floor((selectedChapter - 1) / 5));
    $('retry-label').textContent = '挑戰下一關';
  } else $('retry-label').textContent = '再戰一次';
  refreshResearch();
  refreshStages();
}

function syncScreen() {
  menu.hidden = !!game || showResearch || showStages || showLoadout;
  $('boss-warning').hidden = !game || game.phase !== 'playing';
  researchScreen.hidden = !showResearch;
  stageScreen.hidden = !showStages;
  loadoutScreen.hidden = !showLoadout;
  hud.hidden = !game;
  hint.hidden = !game || game.phase !== 'playing' || paused;
  upgradeScreen.hidden = !game || game.phase !== 'upgrade';
  pauseScreen.hidden = !game || !paused || game.phase !== 'playing';
  resultScreen.hidden = !game || !['victory', 'defeat'].includes(game.phase)
    || resultDelayUntil > 0;
  if (!game) $('continue-button').hidden = !loadCheckpoint(storage);
  if (game?.phase === 'upgrade') makeCards();
  if (game && ['victory', 'defeat'].includes(game.phase)
    && resultDelayUntil === 0) setResult();
  refreshHud();
  refreshResearch();
  if (!game) refreshStages();
  if (showLoadout) refreshLoadout();
  syncAudioScene();
  refreshAudioButtons();
}

function beginNew() {
  const profile = readProfile(storage);
  if (selectedChapter === 26 ? !profile.endlessUnlocked
    : selectedChapter > profile.unlockedStage) return;
  audio.unlockFromGesture();
  clearCheckpoint(storage);
  game = startRun(Math.floor(Math.random() * 0xffffffff), profile, selectedChapter);
  paused = false;
  handledResult = false;
  resultDelayUntil = 0;
  targetX = game.player.x;
  lastSavedAt = 0;
  saveCheckpoint(storage, game);
  syncScreen();
  audio.playSfx('start');
}

function continueRun() {
  const loaded = loadCheckpoint(storage);
  if (!loaded) return;
  audio.unlockFromGesture();
  game = loaded;
  paused = false;
  handledResult = false;
  resultDelayUntil = 0;
  targetX = game.player.x;
  lastSavedAt = game.runTime;
  syncScreen();
  audio.playSfx('start');
}

$('start-button').addEventListener('click', beginNew);
$('retry-button').addEventListener('click', beginNew);
$('continue-button').addEventListener('click', continueRun);
$('reroll-button').addEventListener('click', () => {
  if (!game || !rerollUpgrades(game)) return;
  saveCheckpoint(storage, game);
  makeCards();
});
$('research-button').addEventListener('click', () => {
  audio.unlockFromGesture();
  showResearch = true; syncScreen(); audio.playSfx('click');
});
$('research-back').addEventListener('click', () => { showResearch = false; syncScreen(); });
$('stage-button').addEventListener('click', () => {
  audio.unlockFromGesture();
  showStages = true; syncScreen(); audio.playSfx('click');
});
$('stage-back').addEventListener('click', () => { showStages = false; syncScreen(); });
$('loadout-button').addEventListener('click', () => {
  audio.unlockFromGesture();
  showLoadout = true; syncScreen(); audio.playSfx('click');
});
$('loadout-back').addEventListener('click', () => { showLoadout = false; syncScreen(); });
for (const button of document.querySelectorAll('[data-audio]')) {
  button.addEventListener('click', () => {
    audio.unlockFromGesture();
    const settings = audio.getSettings();
    if (button.dataset.audio === 'music') audio.setMusicMuted(!settings.musicMuted);
    else audio.setEffectsMuted(!settings.effectsMuted);
    refreshAudioButtons();
    audio.playSfx('click');
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
$('resume-button').addEventListener('click', () => {
  audio.unlockFromGesture();
  paused = false;
  syncScreen();
  audio.playSfx('click');
});
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
    const oldEncounter = game.encounter;
    const oldCore = game.core;
    const oldShots = game.shotCount;
    const oldDestroyed = game.normalDestroyed + game.bossDestroyed;
    const priorEffects = new Set(game.effects);
    advance(game, dt, targetX);
    for (const cue of game.audioCues || []) audio.playSfx(cue);
    if (game.shotCount > oldShots) audio.playSfx('shot');
    const destroyed = game.normalDestroyed + game.bossDestroyed > oldDestroyed;
    if (destroyed) {
      audio.playSfx('break');
      audio.playSfx('retreat');
    } else if (game.effects.some(effect => effect.kind === 'hit' && !priorEffects.has(effect))) {
      audio.playSfx('hit');
    }
    if (game.core < oldCore) audio.playSfx('hurt');
    if (oldEncounter !== game.encounter && game.encounter === 'boss') audio.playSfx('boss');
    if (game.phase !== oldPhase) {
      if (game.phase === 'upgrade') audio.playSfx('chest');
      if (game.phase === 'victory') audio.playSfx('victory');
      if (game.phase === 'defeat') audio.playSfx('defeat');
      if (game.phase === 'upgrade') saveCheckpoint(storage, game);
      if (game.phase === 'victory') resultDelayUntil = timestamp + 800;
      syncScreen();
    } else {
      if (oldEncounter !== game.encounter) syncAudioScene();
      refreshHud();
    }
    if (game.phase === 'playing' && game.runTime - lastSavedAt >= 12) {
      saveCheckpoint(storage, game);
      lastSavedAt = game.runTime;
    }
  }
  if (resultDelayUntil > 0 && timestamp >= resultDelayUntil) {
    resultDelayUntil = 0;
    syncScreen();
  }
  audio.update();
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  render(ctx, game, timestamp / 1000);
  requestAnimationFrame(frame);
}

syncScreen();
requestAnimationFrame(frame);
