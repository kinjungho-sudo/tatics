// ============================================================
//  격자 좌표 유틸 — systems-agent 담당
//  순수 JS, Phaser 의존성 없음
// ============================================================

/**
 * 맨해튼 거리 계산
 * @param {number} ax - A 유닛 x 좌표
 * @param {number} ay - A 유닛 y 좌표
 * @param {number} bx - B 유닛 x 좌표
 * @param {number} by - B 유닛 y 좌표
 * @returns {number} 맨해튼 거리
 */
export function manhattanDist(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * 격자 좌표 → 픽셀 좌표 변환 (타일 중앙 기준)
 * @param {number} col - 열 (x)
 * @param {number} row - 행 (y)
 * @param {number} cellSize - 타일 크기 (픽셀)
 * @returns {{ px: number, py: number }}
 */
export function gridToPixel(col, row, cellSize) {
  return {
    px: col * cellSize + cellSize / 2,
    py: row * cellSize + cellSize / 2,
  };
}

/**
 * 픽셀 좌표 → 격자 좌표 변환
 * @param {number} px - 픽셀 x
 * @param {number} py - 픽셀 y
 * @param {number} cellSize - 타일 크기 (픽셀)
 * @returns {{ col: number, row: number }}
 */
export function pixelToGrid(px, py, cellSize) {
  return {
    col: Math.floor(px / cellSize),
    row: Math.floor(py / cellSize),
  };
}

/**
 * 좌표가 맵 범위 내인지 확인
 * @param {number} col
 * @param {number} row
 * @param {number} cols - 맵 가로 타일 수
 * @param {number} rows - 맵 세로 타일 수
 * @returns {boolean}
 */
export function inBounds(col, row, cols, rows) {
  return col >= 0 && col < cols && row >= 0 && row < rows;
}

/**
 * 상하좌우 4방향 이웃 좌표 반환
 * @param {number} col
 * @param {number} row
 * @returns {Array<{col: number, row: number}>}
 */
export function getNeighbors(col, row) {
  return [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ];
}
