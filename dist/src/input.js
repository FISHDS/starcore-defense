import { WIDTH } from './game.js';

export function pointerToWorldX(clientX, rect) {
  const fraction = (clientX - rect.left) / rect.width;
  return Math.max(26, Math.min(WIDTH - 26, fraction * WIDTH));
}
