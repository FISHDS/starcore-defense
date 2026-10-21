import { advance, chooseUpgrade, startRun } from '../dist/src/game.js';
import { choosePilotUpgrade, fixedAimAngle } from './fixed-aim-pilot.mjs';
import { awardRun, buyResearch, readProfile } from '../dist/src/storage.js';
import { pathToFileURL } from 'node:url';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function loadout(profile) {
  const equippedWeapon = profile.weapons.includes('rail') ? 'rail'
    : profile.weapons.includes('scatter') ? 'scatter' : 'capsule';
  const equippedOrgans = ['focus-lens', 'tempo', 'anchor-organ']
    .filter(id => profile.organs.includes(id)).slice(0, 2);
  return { ...profile, equippedWeapon, equippedOrgans };
}

function investResearch(storage) {
  let bought = true;
  while (bought) {
    bought = false;
    for (const id of ['fire', 'precision', 'momentum', 'thermal',
      'ricochet', 'tactics', 'collector', 'scavenge']) {
      const result = buyResearch(storage, id);
      if (result.success) bought = true;
    }
  }
}

function playChapter(chapter, seed, profile) {
  const game = startRun(seed, loadout(profile), chapter);
  for (let step = 0; step < 10000
    && !['victory', 'defeat'].includes(game.phase); step++) {
    if (game.phase === 'upgrade')
      chooseUpgrade(game, choosePilotUpgrade(game, 'base'));
    advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
  }
  return game;
}

export function simulateProgression() {
  const storage = new MemoryStorage();
  const rows = [];
  const profiles = [];
  let failed = false;
  for (let chapter = 1; chapter <= 25; chapter++) {
    profiles.push(readProfile(storage));
    let result = null;
    let attempts = 0;
    while (attempts < 4) {
      attempts++;
      const profile = readProfile(storage);
      if (profile.unlockedStage < chapter) {
        failed = true;
        break;
      }
      result = playChapter(chapter, 701 + chapter * 31 + attempts, profile);
      awardRun(storage, result);
      investResearch(storage);
      if (result.phase === 'victory') break;
    }
    const profile = readProfile(storage);
    rows.push({ chapter, attempts, result: result?.phase || 'locked',
      seconds: Math.round(result?.runTime || 0), research: profile.dna,
      fire: profile.fire, precision: profile.precision, collector: profile.collector,
      thermal: profile.thermal, momentum: profile.momentum,
      ricochet: profile.ricochet,
      weapon: loadout(profile).equippedWeapon,
      organs: loadout(profile).equippedOrgans.join('+') || '-' });
    if (!result || result.phase !== 'victory') failed = true;
  }
  return { rows, profiles, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { rows, failed } = simulateProgression();
  console.table(rows);
  if (failed) process.exitCode = 1;
}
