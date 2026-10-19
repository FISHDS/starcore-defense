import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from '../dist/src/campaign.js';
import { BOSS_PROFILES, bossProfileFor, bossRosterIndexFor } from '../dist/src/boss-profiles.js';
import { routeLength, routePosition } from '../dist/src/routes.js';

test('前20關的主頭目各不相同，且每一隻都在頭目資料中有造型', () => {
  const leads = CHAPTERS.slice(0, 20).map(stage => bossProfileFor(stage.id, 0));
  assert.equal(leads.length, 20);
  assert.equal(new Set(leads.map(boss => boss.id)).size, 20,
    '前20關不可重複主頭目');
  assert.equal(new Set(leads.map(boss => boss.name)).size, 20,
    '前20關不可只換ID但沿用相同名稱');
  assert.ok(leads.every(boss => BOSS_PROFILES.some(profile => profile.id === boss.id)));
});

test('前20關混合單頭與雙頭，且中央守點和底線迎擊都有出現', () => {
  const stages = CHAPTERS.slice(0, 20);
  assert.ok(stages.some(stage => stage.bossCount === 1));
  assert.ok(stages.some(stage => stage.bossCount === 2));
  assert.ok(stages.some(stage => stage.positionMode === 'center'));
  assert.ok(stages.some(stage => stage.positionMode === 'bottom'));
});

test('每個主頭目都有專屬繞場路線描述，不把換顏色當成新頭目', () => {
  const leads = CHAPTERS.slice(0, 20).map(stage => bossProfileFor(stage.id, 0));
  assert.ok(leads.every(boss => typeof boss.routeStyle === 'string'
    && boss.routeStyle.length > 0), '每隻主頭目都要標記行軍特色');
  assert.ok(new Set(leads.map(boss => boss.routeStyle)).size >= 16,
    '行軍路線描述要呈現不同節奏');
});

test('前20隻頭目使用各自的行軍曲線，中央關會繞核心收束', () => {
  const routes = CHAPTERS.slice(0, 20).map(stage => {
    const base = `${stage.bossCount === 2 ? 'duo-' : ''}boss-route-${bossRosterIndexFor(stage.id)}`;
    const path = stage.positionMode === 'center' ? `center-${base}` : base;
    assert.ok(routeLength(path, true) > 700);
    const length = routeLength(path, true);
    return Array.from({ length: 10 }, (_, index) => length * (index + 1) / 11)
      .map(distance => {
      const point = routePosition(path, true, 0, distance);
      return `${Math.round(point.x)}:${Math.round(point.y)}`;
    }).join('|');
  });
  assert.equal(new Set(routes).size, 20, '每隻頭目路線都要有可量出的差異');
});
