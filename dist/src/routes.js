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

function makeRoute(path, boss, lane) {
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
    const direction = points[1].x > points[0].x ? 1 : -1;
    return { x: points[0].x + direction * distance, y: points[0].y };
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
