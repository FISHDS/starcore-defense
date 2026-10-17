// 每條長鏈沿同一條有實際長度的折返路線前進，身體共用該路線。
const ROWS = 9;
const TOP = 162;
const ROW_STEP = 64;
const routeCache = new Map();

function rowBounds(path, row, boss, lane) {
  if (path === 'cross' && boss) {
    if (row === 4 || row === 5) return lane % 2 ? [100, 355] : [35, 120];
    return lane % 2 ? [255, 355] : [35, 135];
  }
  switch (path) {
    case 'tide': {
      return row >= 3 && row < 6 ? [280, 355] : [35, 110];
    }
    case 'fork': return row < 4 ? [35, 165] : [225, 355];
    case 'fork-right': return row < 4 ? [225, 355] : [35, 165];
    case 'narrow': return row < 4 ? [50, 185] : [205, 340];
    case 'weave': return Math.floor(row / 2) % 2 ? [215, 355] : [35, 175];
    case 'spiral': return [35 + Math.min(row % 5, 4 - row % 5) * 25,
      355 - Math.min((row + 2) % 5, 4 - (row + 2) % 5) * 22];
    case 'mirror': return [45, 345];
    case 'cross': return [row % 2 ? 40 : 65, row % 2 ? 325 : 350];
    default: return [35, 355];
  }
}

function makeCoreRoute(path, boss, lane) {
  const style = path.slice('center-'.length);
  if (style.startsWith('boss-route-'))
    return makeBossRoute(Number(style.slice('boss-route-'.length)), true, lane);
  const reverse = style === 'mirror' || style === 'cross' && lane % 2 === 1;
  const start = -Math.PI / 2 + (boss && lane % 2 ? Math.PI : 0);
  const turns = style === 'tide' ? 1.7 : style === 'fork' ? 2.25
    : style === 'coil' ? 3.35 : 2.6;
  const points = [];
  const steps = 220;
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    let radius = 1 - t;
    const angle = start + (reverse ? -1 : 1) * turns * Math.PI * 2 * t;
    let xRadius = 185 * radius;
    let yRadius = 350 * radius;
    if (style === 'weave') {
      xRadius += Math.sin(angle * 2.4) * 10 * radius;
      yRadius += Math.cos(angle * 2.4) * 12 * radius;
    }
    if (style === 'fork' && t > 0.42 && t < 0.7) {
      xRadius += (lane % 2 ? 1 : -1) * 24;
    }
    if (style === 'cross') xRadius += Math.sin(angle * 3) * 12 * radius;
    points.push({ x: 195 + Math.cos(angle) * xRadius,
      y: 422 + Math.sin(angle) * yRadius });
  }
  points.push({ x: 195, y: 422 });
  const lengths = [0];
  for (let index = 1; index < points.length; index++) {
    lengths.push(lengths[index - 1] + Math.hypot(points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y));
  }
  return { points, lengths, length: lengths.at(-1) };
}

function makeBossRoute(index, center, lane) {
  const routeId = Math.max(0, Math.floor(index) || 0);
  const points = [];
  const steps = 320;
  const direction = routeId % 2 ? -1 : 1;
  const lanePhase = lane % 2 ? Math.PI : 0;
  const waveCount = 1 + routeId % 6;
  const amplitude = 72 + (routeId % 4) * 18;
  const orbitEnd = 0.82;
  const turns = center ? 2.2 + (routeId % 7) * 0.38
    : 1.65 + (routeId % 5) * 0.24;
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    if (center) {
      const shape = routeId % 4;
      const angle = lanePhase - Math.PI / 2 + direction * turns * Math.PI * 2 * t
        + Math.sin(t * Math.PI * 2 * (2 + routeId % 3)) * 0.08;
      const closeAt = 0.78 + (routeId % 3) * 0.025;
      const closing = Math.max(0, (t - closeAt) / (1 - closeAt));
      const orbit = 0.93 + 0.035 * Math.sin(t * Math.PI * (2 + shape));
      const radius = (shape === 1 ? orbit : shape === 2 ? orbit * 0.94 : orbit)
        * (1 - closing);
      const xRadius = 120 * radius + 20
        + Math.sin(angle * (2.2 + shape)) * (routeId % 5) * 1.5;
      const yRadius = 185 * radius + 24 + Math.cos(angle * 2.7) * (shape === 3 ? 16 : 5);
      points.push({ x: 195 + Math.cos(angle) * xRadius,
        y: 440 + Math.sin(angle) * yRadius });
    } else {
      if (t <= orbitEnd) {
        const phase = routeId * 0.29 + lanePhase;
        const orbitT = t / orbitEnd;
        const angle = -Math.PI / 2 + lanePhase
          + direction * turns * Math.PI * 2 * orbitT;
        const shape = routeId % 4;
        const radius = 0.96 - orbitT * (shape === 0 ? 0.18 : 0.1);
        let x; let y;
        if (shape === 1) {
          x = 195 + Math.sin(angle) * 160 * radius;
          y = 420 + Math.sin(angle * 2 + phase * 0.18) * 205 * radius;
        } else if (shape === 2) {
          const c = Math.cos(angle); const s = Math.sin(angle);
          x = 195 + Math.sign(c) * Math.sqrt(Math.abs(c)) * 168 * radius;
          y = 420 + Math.sign(s) * Math.sqrt(Math.abs(s)) * 205 * radius;
        } else {
          x = 195 + Math.cos(angle) * (160 * radius)
            + Math.sin(angle * (waveCount + 1)) * amplitude * 0.18;
          y = 420 + Math.sin(angle) * (205 * radius)
            + Math.cos(angle * (waveCount + 2) + phase) * 12;
        }
        points.push({ x: Math.max(45, Math.min(345, x)),
          y: Math.max(190, Math.min(700, y)) });
      } else {
        const t2 = (t - orbitEnd) / (1 - orbitEnd);
        const start = points.at(-1);
        const side = lane % 2 ? 1 : -1;
        const c1 = { x: Math.max(45, Math.min(345, start.x + side * 120)), y: 650 };
        const c2 = { x: 195 - side * 130, y: 675 };
        const end = { x: 195, y: 760 };
        const inv = 1 - t2;
        points.push({
          x: inv ** 3 * start.x + 3 * inv ** 2 * t2 * c1.x
            + 3 * inv * t2 ** 2 * c2.x + t2 ** 3 * end.x,
          y: inv ** 3 * start.y + 3 * inv ** 2 * t2 * c1.y
            + 3 * inv * t2 ** 2 * c2.y + t2 ** 3 * end.y,
        });
      }
    }
  }
  if (center) points.push({ x: 195, y: 422 });
  else points.push({ x: points.at(-1).x, y: 760 });
  const lengths = [0];
  for (let index = 1; index < points.length; index++) {
    lengths.push(lengths[index - 1] + Math.hypot(points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y));
  }
  return { points, lengths, length: lengths.at(-1) };
}

function makeRoute(path, boss, lane) {
  if (path.startsWith('center-')) return makeCoreRoute(path, boss, lane);
  if (path.startsWith('boss-route-'))
    return makeBossRoute(Number(path.slice('boss-route-'.length)), false, lane);
  const reverse = path === 'mirror' || (path === 'cross' && lane % 2 === 1);
  const yOffset = boss && path === 'cross' && lane % 2 ? 30 : 0;
  const points = [];
  for (let row = 0; row < ROWS; row++) {
    const [left, right] = rowBounds(path, row, boss, lane);
    const direction = (row % 2 === 0) !== reverse ? 1 : -1;
    const y = TOP + row * ROW_STEP + yOffset;
    const start = direction > 0 ? left : right;
    const end = direction > 0 ? right : left;
    if (row === 0) points.push({ x: start, y });
    points.push({ x: end, y });
    if (row < ROWS - 1) {
      // 多個小轉角讓身體繞行，避免直角瞬移或蓋住相鄰整列。
      const [nextLeft, nextRight] = rowBounds(path, row + 1, boss, lane);
      const nextStart = direction > 0 ? nextRight : nextLeft;
      const outside = direction > 0 ? Math.min(367, Math.max(end, nextStart) + 12)
        : Math.max(23, Math.min(end, nextStart) - 12);
      points.push({ x: outside, y: y + 17 });
      points.push({ x: outside, y: y + ROW_STEP - 17 });
      points.push({ x: nextStart, y: y + ROW_STEP });
    }
  }
  const last = points.at(-1);
  points.push({ x: last.x, y: 760 });
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y));
  }
  return { points, lengths, length: lengths.at(-1) };
}

function getRoute(path, boss, lane) {
  const key = `${path}:${boss ? 1 : 0}:${lane % 2}`;
  if (!routeCache.has(key)) routeCache.set(key, makeRoute(path, boss, lane));
  return routeCache.get(key);
}

export function routeLength(path, boss = false, lane = 0) {
  return getRoute(path, boss, lane).length;
}

export function routePosition(path, boss, lane, distance) {
  const { points, lengths, length } = getRoute(path, boss, lane);
  if (distance < 0) {
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: points[0].x + dx / length * -distance,
      y: points[0].y + dy / length * -distance };
  }
  if (distance >= length) return { x: points.at(-1).x, y: points.at(-1).y + distance - length };
  let low = 1;
  let high = lengths.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (lengths[middle] < distance) low = middle + 1;
    else high = middle;
  }
  const portion = (distance - lengths[low - 1]) / (lengths[low] - lengths[low - 1]);
  return {
    x: points[low - 1].x + (points[low].x - points[low - 1].x) * portion,
    y: points[low - 1].y + (points[low].y - points[low - 1].y) * portion,
  };
}
