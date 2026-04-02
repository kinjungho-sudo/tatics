// ============================================================
//  랜덤 유틸 — systems-agent 담당
//  순수 JS, Phaser 의존성 없음
//  향후 시드 기반 랜덤으로 교체 가능
// ============================================================

/**
 * min 이상 max 이하의 정수 랜덤 반환 (양 끝 포함)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 50% 확률로 true 반환 (파랜드 스타일 성장 판정)
 * @returns {boolean}
 */
export function fiftyFifty() {
  return Math.random() < 0.5;
}
