import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine, musicEventsForStep } from '../dist/src/audio.js';

function fakeAudio() {
  const instances = [];
  class FakeGain {
    gain = {
      value: 1,
      setValueAtTime(value) { this.value = value; },
      linearRampToValueAtTime(value) { this.value = value; },
      exponentialRampToValueAtTime(value) { this.value = value; },
      setTargetAtTime(value) { this.value = value; },
    };
    connect() { return this; }
  }
  class FakeOscillator {
    frequency = { value: 0, setValueAtTime(value) { this.value = value; },
      exponentialRampToValueAtTime(value) { this.value = value; } };
    type = 'sine';
    started = false;
    connect() { return this; }
    start() { this.started = true; }
    stop() {}
  }
  class FakeContext {
    constructor() {
      this.currentTime = 0;
      this.state = 'suspended';
      this.destination = {};
      this.oscillators = [];
      instances.push(this);
    }
    createGain() { return new FakeGain(); }
    createOscillator() {
      const oscillator = new FakeOscillator();
      this.oscillators.push(oscillator);
      return oscillator;
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
  }
  return { FakeContext, instances };
}

function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('首次手勢才建立聲音裝置並恢復播放', () => {
  const { FakeContext, instances } = fakeAudio();
  const audio = createAudioEngine({ AudioContextClass: FakeContext });
  audio.setScene('menu');
  audio.update();
  assert.equal(instances.length, 0);
  assert.equal(audio.unlockFromGesture(), true);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].state, 'running');
  assert.equal(audio.unlockFromGesture(), true);
  assert.equal(instances.length, 1);
});

test('五區曲調不同，頭目每小節有更密集的節奏', () => {
  const roots = Array.from({ length: 5 }, (_, index) =>
    musicEventsForStep('battle', index + 1, 0).find(event => event.role === 'bass')?.frequency);
  assert.equal(new Set(roots).size, 5);
  const battleCount = Array.from({ length: 16 }, (_, step) =>
    musicEventsForStep('battle', 1, step).length).reduce((a, b) => a + b, 0);
  const bossCount = Array.from({ length: 16 }, (_, step) =>
    musicEventsForStep('boss', 1, step).length).reduce((a, b) => a + b, 0);
  assert.ok(bossCount > battleCount);
});

test('戰鬥旋律跨四小節推進，避免兩秒原樣重複', () => {
  const first = musicEventsForStep('battle', 1, 0).find(event => event.role === 'bass');
  const secondBar = musicEventsForStep('battle', 1, 16).find(event => event.role === 'bass');
  const nextPhrase = musicEventsForStep('battle', 1, 64).find(event => event.role === 'bass');
  assert.notEqual(first.frequency, secondBar.frequency);
  assert.equal(first.frequency, nextPhrase.frequency);
});

test('音樂靜音與暫停會停止安排新的節拍', () => {
  const { FakeContext, instances } = fakeAudio();
  const audio = createAudioEngine({ AudioContextClass: FakeContext });
  audio.unlockFromGesture();
  audio.setScene('battle', 3);
  audio.update();
  const ctx = instances[0];
  const beforeMute = ctx.oscillators.length;
  assert.ok(beforeMute > 0);
  audio.setMusicMuted(true);
  ctx.currentTime += 1;
  audio.update();
  assert.equal(ctx.oscillators.length, beforeMute);
  audio.setMusicMuted(false);
  audio.setScene('paused');
  ctx.currentTime += 1;
  audio.update();
  assert.equal(ctx.oscillators.length, beforeMute);
});

test('連射音效有節流，靜音後不建立新的聲音', () => {
  const { FakeContext, instances } = fakeAudio();
  const audio = createAudioEngine({ AudioContextClass: FakeContext });
  audio.unlockFromGesture();
  assert.equal(audio.playSfx('shot'), true);
  const ctx = instances[0];
  const count = ctx.oscillators.length;
  assert.equal(audio.playSfx('shot'), false);
  assert.equal(ctx.oscillators.length, count);
  ctx.currentTime += 0.2;
  assert.equal(audio.playSfx('shot'), true);
  audio.setEffectsMuted(true);
  assert.equal(audio.playSfx('chest'), false);
});

test('首次點開始時，即使播放裝置仍在恢復也先排入開戰音', () => {
  const { FakeContext, instances } = fakeAudio();
  class PendingContext extends FakeContext {
    resume() { return Promise.resolve(); }
  }
  const audio = createAudioEngine({ AudioContextClass: PendingContext });
  audio.setScene('battle');
  audio.unlockFromGesture();
  assert.equal(instances[0].state, 'suspended');
  assert.equal(audio.playSfx('start'), true);
  assert.ok(instances[0].oscillators.length > 0);
});

test('大量連射時寶箱提示音仍保留聲道', () => {
  const { FakeContext, instances } = fakeAudio();
  const audio = createAudioEngine({ AudioContextClass: FakeContext });
  audio.setScene('battle');
  audio.unlockFromGesture();
  const ctx = instances[0];
  for (let index = 0; index < 8; index++) {
    assert.equal(audio.playSfx('shot'), true);
    ctx.currentTime += .2;
  }
  assert.equal(audio.playSfx('shot'), false);
  assert.equal(audio.playSfx('chest'), true);
});

test('音樂與音效偏好分開保存', () => {
  const storage = fakeStorage();
  const audio = createAudioEngine({ storage });
  audio.setMusicMuted(true);
  audio.setEffectsMuted(false);
  const restored = createAudioEngine({ storage });
  assert.deepEqual(restored.getSettings(), { musicMuted: true, effectsMuted: false });
});
