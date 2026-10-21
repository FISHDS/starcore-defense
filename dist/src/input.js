import { HEIGHT, WIDTH } from './game.js?v=20261021-starcore-22';

export function pointerToAimAngle(clientX, clientY, rect, origin) {
  const x = (clientX - rect.left) / rect.width * WIDTH;
  const y = (clientY - rect.top) / rect.height * HEIGHT;
  const dx = x - origin.x;
  const dy = y - origin.y;
  if (Math.hypot(dx, dy) < 10) return -Math.PI / 2;
  return Math.atan2(dy, dx);
}
