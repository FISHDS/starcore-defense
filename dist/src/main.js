import { advance, CHAPTERS, chooseUpgrade, createBossShowcase, getRunProgress, HEIGHT, rerollUpgrades, startRun, UPGRADE_BY_ID, WAVES, WIDTH } from './game.js?v=20261017-starcore-4';
import { pointerToAimAngle } from './input.js';
import { render } from './render.js?v=20261017-starcore-4';
import { awardRun, buyResearch, buyItem, equipItem, clearCheckpoint, loadCheckpoint, readProfile, researchCost, saveCheckpoint, updateBest } from './storage.js?v=20261017-starcore-4';
import { ORGANS, WEAPONS } from './meta.js';
import { drawSkillIcon } from './art.js?v=20261017-starcore-4';
import { createAudioEngine } from './audio.js?v=20261017-starcore-4';
import { getBattleHint } from './tutorial.js';

const $ = id => document.getElementById(id);
const canvas = $('arena');
const ctx = canvas.getContext('2d', { alpha: false });
const shell = document.querySelector('.game-shell');
const menu = $('menu');
const showcaseScreen = $('showcase-screen');
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
let targetAimAngle = -Math.PI / 2;
let lastTime = 0;
let handledResult = false;
let showResearch = false;
let showStages = false;
let showLoadout = false;
const showcaseQuery = new URLSearchParams(window.location.search).get('showcase');
let selectedShowcase = showcaseQuery === 'screech-cat' ? 2
  : showcaseQuery === 'group-admin' ? 3
    : showcaseQuery === 'coffin-dance' ? 5
      : showcaseQuery === 'loading-99' ? 6 : 1;
let showShowcase = ['knife-shield', 'screech-cat', 'group-admin',
  'coffin-dance', 'loading-99'].includes(showcaseQuery);
let lastSavedAt = 0;
let selectedChapter = readProfile(storage).unlockedStage;
let selectedZone = Math.floor((selectedChapter - 1) / 5);
let bossWarningActive = false;
let resultDelayUntil = 0;
const keys = { left: false, right: false };

function resize() {
  // 高 DPI 手機每幀重畫長鏈很吃力；1.5 倍仍清楚，同時減少畫布像素量。
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
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
  hint.textContent = game.preview && game.runTime < 10
    ? game.chapter === 2 ? '原地轉向瞄準身體與寶箱；破壞發聲部位打斷音波'
      : game.chapter === 3 ? '通知風暴前會亮起手機；轉向打破手機弱點，或逐顆擊落紅泡泡'
      : '原地旋轉瞄準身體與寶箱；找出頭目預警時的可攻擊部位'
    : getBattleHint(game, activeChapter.summary);
  hint.hidden = paused || game.preview || !hint.textContent;
  hint.classList.toggle('persistent-tutorial', game.chapter === 1 && game.normalDestroyed === 0);
  $('wave-number').textContent = game.preview ? '頭目' : game.chapter === 26
    ? `無盡 ${game.endlessTier}` : `第${game.chapter}關`;
  const encounterName = game.encounter === 'boss' && activeChapter.bossMode === 'knife-shield'
    ? '我的刀盾' : game.encounter === 'boss' && activeChapter.bossMode === 'screech-cat'
      ? '破音貓' : game.encounter === 'boss' && activeChapter.bossMode === 'group-admin'
        ? '已讀不回群組長' : game.encounter === 'boss'
          && activeChapter.bossMode === 'coffin-dance'
          ? '棺材舞領隊・最後一班' : game.encounter === 'boss'
            && activeChapter.bossMode === 'loading-99'
            ? '百分之九十九・轉圈載入獸' : wave.name;
  $('wave-name').textContent = game.preview && game.encounter === 'boss'
    ? encounterName
    : `${game.chapter === 26 ? '無盡挑戰' : CHAPTERS[game.chapter - 1].name} · ${encounterName}`;
  $('core-value').textContent = String(Math.ceil(game.core));
  $('score-value').textContent = game.score.toLocaleString('zh-TW');
  const progress = getRunProgress(game);
  $('wave-progress').style.width = `${Math.max(0, progress) * 100}%`;
  $('core-progress').style.width = `${game.core / game.maxCore * 100}%`;
  const nearBoss = game.bosses.some(boss => !boss.dead
    && (game.player.y < 600
      ? Math.hypot(boss.segments[0].x - game.player.x,
        boss.segments[0].y - game.player.y) < 280
      : boss.segments[0].y > 540));
  $('boss-warning').hidden = game.phase !== 'playing' || !nearBoss;
  if (game.phase === 'playing' && nearBoss && !bossWarningActive) audio.playSfx('warning');
  bossWarningActive = game.phase === 'playing' && nearBoss;
  $('boss-warning').textContent = activeChapter.bossMode === 'knife-shield'
    ? '我的刀盾舉刀後會沿斜線揮擊；轉向迎擊彈道可擊落攻擊'
    : activeChapter.bossMode === 'screech-cat'
    ? '破音貓蓄音後發射扇形聲浪；轉向迎擊可擊落聲波'
    : activeChapter.bossMode === 'group-admin'
    ? '通知風暴即將送出 · 趁手機亮起時打破弱點，或轉向擊落紅色訊息'
    : activeChapter.bossMode === 'armor'
    ? '護甲縫隙會輪流亮起 · 轉向打中發光節點，傷害才會有效'
    : activeChapter.bossMode === 'coffin-dance'
    ? '節拍牌左右交替來襲 · 轉向迎擊，或打破亮起的承重手節中斷一輪'
    : activeChapter.bossMode === 'loading-99'
    ? '載入卡在 99% · 轉向打破紅色故障節，中斷狹幅掃描'
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
    : `第 ${selectedChapter} 關 · ${CHAPTERS[selectedChapter - 1].name} · ${CHAPTERS[selectedChapter - 1].positionMode === 'center' ? '中央守點' : '底線迎擊'}`;
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
      targetAimAngle = game.player.aimAngle;
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
  const won = game.phase === 'victory';
  resultScreen.classList.toggle('is-defeat', !won);
  $('result-reward').hidden = !!game.preview;
  $('result-stats').hidden = !!game.preview;
  $('result-menu').hidden = !game.preview;
  if (game.preview) {
    $('result-kicker').textContent = 'BOSS SHOWCASE';
    $('result-emblem').textContent = won ? '✦' : '◇';
    $('result-title').textContent = won ? '試打成功' : '再試一次';
    const previewCopy = game.chapter === 3
      ? '你看到了手機預警與通知彈。正式關卡仍等你挑戰。'
      : game.chapter === 2 ? '你看到了吸氣蓄音與聲波反制。正式關卡仍等你挑戰。'
        : '你看到了舉盾、斜斬和換手。正式關卡仍等你挑戰。';
    $('result-copy').textContent = won ? previewCopy
      : '這是練習戰。看清頭目預警，再試一次。';
    $('retry-label').textContent = '再次試打';
    return;
  }
  clearCheckpoint(storage);
  const best = updateBest(storage, game.score);
  const reward = awardRun(storage, game);
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
  menu.hidden = !!game || showResearch || showStages || showLoadout || showShowcase;
  showcaseScreen.hidden = !!game || !showShowcase;
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
  targetAimAngle = game.player.aimAngle;
  lastSavedAt = 0;
  saveCheckpoint(storage, game);
  syncScreen();
  audio.playSfx('start');
}

function beginShowcase() {
  audio.unlockFromGesture();
  game = createBossShowcase(Math.floor(Math.random() * 0xffffffff), selectedShowcase);
  showShowcase = false;
  paused = false;
  handledResult = false;
  resultDelayUntil = 0;
  targetAimAngle = game.player.aimAngle;
  lastSavedAt = 0;
  syncScreen();
  audio.playSfx('boss');
}

function continueRun() {
  const loaded = loadCheckpoint(storage);
  if (!loaded) return;
  audio.unlockFromGesture();
  game = loaded;
  paused = false;
  handledResult = false;
  resultDelayUntil = 0;
  targetAimAngle = game.player.aimAngle;
  lastSavedAt = game.runTime;
  syncScreen();
  audio.playSfx('start');
}

$('start-button').addEventListener('click', beginNew);
$('showcase-button').addEventListener('click', () => {
  showShowcase = true;
  syncScreen();
  audio.playSfx('click');
});
function selectShowcase(chapter) {
  selectedShowcase = chapter;
  $('showcase-shiba').classList.toggle('selected', chapter === 1);
  $('showcase-cat').classList.toggle('selected', chapter === 2);
  $('showcase-admin').classList.toggle('selected', chapter === 3);
  $('showcase-coffin').classList.toggle('selected', chapter === 5);
  $('showcase-loading99').classList.toggle('selected', chapter === 6);
  $('showcase-index').textContent = `BOSS SHOWCASE · 0${chapter}`;
  $('showcase-title').textContent = chapter === 1 ? '我的刀盾'
    : chapter === 2 ? '破音貓' : chapter === 3 ? '已讀不回群組長'
      : chapter === 5 ? '棺材舞領隊・最後一班' : '百分之九十九・轉圈載入獸';
  for (const item of showcaseScreen.querySelectorAll('.showcase-shield,.showcase-doge,.showcase-knife'))
    item.hidden = chapter !== 1;
  showcaseScreen.querySelector('.showcase-cat').hidden = chapter !== 2;
  showcaseScreen.querySelector('.showcase-admin').hidden = chapter !== 3;
  showcaseScreen.querySelector('.showcase-coffin').hidden = chapter !== 5;
  showcaseScreen.querySelector('.showcase-loading99').hidden = chapter !== 6;
  $('showcase-moves').innerHTML = chapter === 1
    ? '<div><strong>01 舉盾</strong><span>盾牌遮住部分身體，轉向瞄準露出的節點或寶箱</span></div><div><strong>02 斜斬</strong><span>舉刀後會沿預警斜線揮擊；轉向開火可攔截斬線</span></div><div><strong>03 換手</strong><span>身體打掉一半後，刀盾換手並改變護盾側</span></div>'
    : chapter === 2
      ? '<div><strong>01 吸氣</strong><span>蓄音時頭部亮起，預告聲波即將發射</span></div><div><strong>02 聲浪</strong><span>扇形聲波朝固定防線逼近；轉向開火可將它擊落</span></div><div><strong>03 變奏</strong><span>半血後蓄音變快，聲波飛得更快且傷害更高</span></div>'
      : chapter === 3
        ? '<div><strong>01 手機亮起</strong><span>通知風暴前會打開手機弱點</span></div><div><strong>02 打斷通知</strong><span>轉向集火手機可取消整輪攻擊</span></div><div><strong>03 擊落紅泡泡</strong><span>來不及打手機時，仍可逐顆射掉通知彈</span></div>'
        : chapter === 5
          ? '<div><strong>01 抬棺預警</strong><span>領隊舉棺時，承重手節會亮起並預告出牌方向</span></div><div><strong>02 左右交替</strong><span>每輪只飛出一張斜向節拍牌，轉向迎擊可將它擊落</span></div><div><strong>03 失步打斷</strong><span>打破發光手節可中斷本輪；半血後牌速加快</span></div>'
          : '<div><strong>01 卡在 99%</strong><span>載入長鏈沿核心螺旋逼近，打爆身節會拉回頭部</span></div><div><strong>02 找出錯碼</strong><span>紅色故障節亮起時，轉向集火可中斷載入掃描</span></div><div><strong>03 半血反轉</strong><span>頭環反向旋轉，主掃描後延遲追加側掃</span></div>';
}
$('showcase-shiba').addEventListener('click', () => selectShowcase(1));
$('showcase-cat').addEventListener('click', () => selectShowcase(2));
$('showcase-admin').addEventListener('click', () => selectShowcase(3));
$('showcase-coffin').addEventListener('click', () => selectShowcase(5));
$('showcase-loading99').addEventListener('click', () => selectShowcase(6));
selectShowcase(selectedShowcase);
$('showcase-play').addEventListener('click', beginShowcase);
$('showcase-back').addEventListener('click', () => { showShowcase = false; syncScreen(); });
$('retry-button').addEventListener('click', () => game?.preview ? beginShowcase() : beginNew());
$('result-menu').addEventListener('click', () => { game = null; showShowcase = false; syncScreen(); });
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
$('menu-button').addEventListener('click', () => {
  game = null; paused = false; showShowcase = false; syncScreen();
});

canvas.addEventListener('pointerdown', event => {
  if (!game || game.phase !== 'playing' || paused) return;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  targetAimAngle = pointerToAimAngle(event.clientX, event.clientY,
    canvas.getBoundingClientRect(), game.player);
});
canvas.addEventListener('pointermove', event => {
  if (dragging) targetAimAngle = pointerToAimAngle(event.clientX, event.clientY,
    canvas.getBoundingClientRect(), game.player);
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
    if (keys.left) targetAimAngle -= dt * 2.5;
    if (keys.right) targetAimAngle += dt * 2.5;
    const oldPhase = game.phase;
    const oldEncounter = game.encounter;
    const oldCore = game.core;
    const oldShots = game.shotCount;
    const oldDestroyed = game.normalDestroyed + game.bossDestroyed;
    const priorEffects = new Set(game.effects);
    advance(game, dt, { aimAngle: targetAimAngle });
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
