export function getBattleHint(game, summary = '') {
  if (!game || game.phase !== 'playing') return '';
  if (game.chapter === 1 && game.encounter === 'normal' && game.normalDestroyed === 0) {
    return '主角固定在底線；轉向瞄準身體與寶箱，擊破蓄力部位可打斷攻擊';
  }
  if (game.wave > 1 || game.waveTime > 5) return '';
  return game.chapter === 26
    ? `第 ${game.endlessTier} 輪 · ${summary}`
    : `${summary} · 原地轉向瞄準`;
}
