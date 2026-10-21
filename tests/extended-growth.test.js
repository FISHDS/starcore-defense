import test from 'node:test';
import assert from 'node:assert/strict';
import { buyResearch, readProfile } from '../dist/src/storage.js';
import { advance, hitSegment, startRun } from '../dist/src/game.js';

const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};

test('舊戰術研究保留等級並改為射速成長；弱點解析保留', () => {
  const storage = memory();
  storage.setItem('starcore.profile.v2', JSON.stringify({ dna: 1000 }));
  for (let i = 0; i < 2; i++) assert.equal(buyResearch(storage, 'tactics').success, true);
  assert.equal(buyResearch(storage, 'collector').success, true);
  const profile = readProfile(storage);
  assert.equal(profile.tactics, 2);
  assert.equal(profile.collector, 1);
  const game = startRun(12, profile);
  advance(game, 0.05);
  const chest = game.chains[0].segments.find(piece => piece.chest);
  hitSegment(game, game.chains[0], chest, chest.hp + 1);
  assert.equal(game.rerollsLeft, 1);
});
