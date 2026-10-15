export function getBattleHint(game, summary = '') {
  if (!game || game.phase !== 'playing') return '';
  if (game.chapter === 1 && game.encounter === 'normal' && game.normalDestroyed === 0) {
    return '側移避開護罩，射擊身體與寶箱';
  }
  if (game.wave > 1 || game.waveTime > 5) return '';
  return game.chapter === 26
    ? `第 ${game.endlessTier} 輪 · ${summary}`
    : `${summary} · 滑動瞄準寶箱`;
}
