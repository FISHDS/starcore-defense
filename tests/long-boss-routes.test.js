import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, CHAPTERS, chooseUpgrade, startRun } from '../dist/src/game.js';
import { routeLength, routePosition } from '../dist/src/routes.js';
import { choosePilotUpgrade, fixedAimAngle } from '../scripts/fixed-aim-pilot.mjs';

test('頭目有足夠長的身體，身節之間留出可辨識的間距', () => {
  for (const stage of CHAPTERS) {
    assert.ok(stage.bossSegments >= (stage.bossCount === 1 ? 90 : 70),
      `第 ${stage.id} 關的頭目身體太短：${stage.bossSegments}`);
    const game = startRun(100 + stage.id, {}, stage.id);
    advance(game, 0.05);
    assert.ok(game.bosses.every(boss => boss.spacing >= 44),
      `第 ${stage.id} 關的相鄰身節仍會疊在一起`);
  }
});

test('25 關使用不同的實際行軍路線', () => {
  const paths = CHAPTERS.map(stage => {
    const game = startRun(700 + stage.id, {}, stage.id);
    advance(game, 0.05);
    return game.boss.path;
  });
  assert.equal(new Set(paths).size, 25);
  const signatures = paths.map(path => {
    const length = routeLength(path, true, 0);
    return Array.from({ length: 12 }, (_, index) => {
      const point = routePosition(path, true, 0, length * (index + 1) / 13);
      return `${Math.round(point.x)}:${Math.round(point.y)}`;
    }).join('|');
  });
  assert.equal(new Set(signatures).size, 25,
    '關卡名稱不同時也要真的換路線');
});

test('雙頭目的兩條長鏈各走不同區域，不互相蓋住身節', () => {
  for (const chapter of [7, 10, 14, 25]) {
    const game = startRun(400 + chapter, {}, chapter);
    game.fireTimer = -100000;
    for (let frame = 0; frame < 3000 && game.phase === 'playing'; frame++) {
      advance(game, 0.05);
      if (frame % 20 !== 0 || game.bosses.length !== 2) continue;
      const bodies = game.bosses.map(boss => boss.segments.filter(piece =>
        piece.x > 20 && piece.x < 370 && piece.y > 225 && piece.y < 630));
      const overlaps = bodies[0].reduce((total, left) => total
        + bodies[1].filter(right => Math.hypot(left.x - right.x,
          left.y - right.y) < 38).length, 0);
      assert.ok(overlaps <= 2,
        `第 ${chapter} 關雙頭身體互相蓋住 ${overlaps} 組`);
    }
  }
});

test('所有頭目路線走遍場地，先後經過的路段不重疊', () => {
  for (const stage of CHAPTERS) {
    for (let lane = 0; lane < stage.bossCount; lane++) {
      const prefix = stage.positionMode === 'center' ? 'center-' : '';
      const path = `${prefix}${stage.bossCount === 2 ? 'duo-' : ''}boss-route-${stage.id - 1}`;
      const length = routeLength(path, true, lane);
      const minimum = stage.bossCount === 2
        ? stage.positionMode === 'center' ? 1550 : 1850
        : stage.positionMode === 'center' ? 2800 : 3000;
      assert.ok(length >= minimum,
        `第 ${stage.id} 關路線只有 ${Math.round(length)} 像素`);
      const samples = [];
      for (let distance = 0; distance < length - 110; distance += 25) {
        samples.push({ distance, ...routePosition(path, true, lane, distance) });
      }
      const xs = samples.map(point => point.x);
      const ys = samples.map(point => point.y);
      assert.ok(stage.bossCount === 2
        ? lane === 0 ? Math.min(...xs) <= 45 && Math.max(...xs) >= 165
          : Math.min(...xs) <= 225 && Math.max(...xs) >= 345
        : Math.min(...xs) <= 50 && Math.max(...xs) >= 340,
      `第 ${stage.id} 關未充分使用各自的半場`);
      assert.ok(Math.min(...ys) <= 225 && Math.max(...ys) >= 650,
        `第 ${stage.id} 關未充分使用前後空間`);
      for (let i = 0; i < samples.length; i++) {
        for (let j = i + 9; j < samples.length; j++) {
          const gap = Math.hypot(samples[i].x - samples[j].x,
            samples[i].y - samples[j].y);
          assert.ok(gap >= (stage.bossCount === 2 ? 38 : 43),
            `第 ${stage.id} 關遠處路段相疊：${gap.toFixed(1)} 像素`);
        }
      }
    }
  }
});

test('初始武器一秒內不連射五發以上', () => {
  const game = startRun(1, {}, 1);
  for (let frame = 0; frame < 20; frame++) advance(game, 0.05);
  assert.ok(game.shotCount <= 4,
    `初始武器一秒發射了 ${game.shotCount} 發`);
});

test('後期頭目也要走完長路才碰守點，留出累積技能的時間', () => {
  for (const [chapter, minimumSeconds] of [[4, 145], [14, 135], [25, 125]]) {
    const game = startRun(900 + chapter, {}, chapter);
    game.fireTimer = -100000;
    for (let frame = 0; frame < 6000 && game.phase === 'playing'; frame++) {
      advance(game, 0.05);
    }
    assert.equal(game.phase, 'defeat');
    assert.ok(game.runTime >= minimumSeconds,
      `第 ${chapter} 關 ${game.runTime.toFixed(0)} 秒就碰到守點`);
  }
});

test('第一關需要透過寶箱技能成長，精準瞄準但不選技能無法清空長鏈', () => {
  function run(seed, skillPicks) {
    const game = startRun(seed, {}, 1);
    let chosen = 0;
    for (let frame = 0; frame < 6000 && !['victory', 'defeat'].includes(game.phase);
      frame++) {
      if (game.phase === 'upgrade') {
        if (chosen++ < skillPicks) chooseUpgrade(game, choosePilotUpgrade(game));
        else { game.phase = 'playing'; game.choices = []; }
      }
      advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
    }
    return { game, selectedSkills: Math.min(chosen, skillPicks) };
  }
  for (const seed of [5, 19, 33]) {
    assert.equal(run(seed, 0).game.phase, 'defeat',
      `種子 ${seed} 沒有技能也通關，開場火力過強`);
    const improved = run(seed, 5);
    assert.equal(improved.game.phase, 'victory',
      `種子 ${seed} 主動選擇技能後仍無法通關`);
    assert.ok(improved.selectedSkills >= 3,
      `種子 ${seed} 只取得 ${improved.selectedSkills} 個技能`);
    assert.ok(improved.game.runTime >= 80,
      `種子 ${seed} 只打了 ${improved.game.runTime.toFixed(0)} 秒，來不及形成技能組合`);
  }
});

test('前五關即使持續追準頭目，跳過所有技能仍會失守', () => {
  for (let chapter = 1; chapter <= 5; chapter++) {
    const game = startRun(5, {}, chapter);
    let offered = 0;
    for (let frame = 0; frame < 9000 && !['victory', 'defeat'].includes(game.phase);
      frame++) {
      if (game.phase === 'upgrade') {
        offered++;
        game.phase = 'playing';
        game.choices = [];
      }
      advance(game, 0.05, { aimAngle: fixedAimAngle(game) });
    }
    assert.ok(offered >= 1, `第 ${chapter} 關連第一個寶箱都打不開`);
    assert.equal(game.phase, 'defeat', `第 ${chapter} 關不選技能仍通關`);
  }
});
