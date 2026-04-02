// ============================================================
//  MoveSystem — 이동 범위 계산 (BFS)
//  systems-agent 담당 / Phaser 의존성 없음
//  검증 완료 로직 — 수정 금지
// ============================================================

import TERRAIN from '../data/terrain.js';
import { inBounds, getNeighbors } from '../utils/GridUtils.js';

export class MoveSystem {
  /**
   * BFS로 유닛이 이동 가능한 모든 타일 좌표 반환
   * 지형 코스트, 아군 위치(통과 불가), 적군 위치(목적지 불가) 반영
   *
   * @param {Object} unit      - 이동할 유닛 { x, y, move, team }
   * @param {Array}  map       - 10×14 지형 타입 배열 (map[row][col])
   * @param {Array}  allUnits  - 맵에 있는 전체 유닛 배열
   * @param {number} cols      - 맵 가로 타일 수
   * @param {number} rows      - 맵 세로 타일 수
   * @returns {Array<{col: number, row: number}>} 이동 가능 타일 목록
   */
  calcMoveRange(unit, map, allUnits, cols, rows) {
    // 아군/적군 위치 맵 구성
    const allyPositions  = new Set();
    const enemyPositions = new Set();
    for (const u of allUnits) {
      if (u.id === unit.id) continue; // 자기 자신 제외
      const key = `${u.x},${u.y}`;
      if (u.team === unit.team) {
        allyPositions.add(key);  // 아군: 통과 불가
      } else {
        enemyPositions.add(key); // 적군: 목적지 불가 (통과는 가능)
      }
    }

    // BFS 시작
    // dist 맵: 각 타일까지 소모된 이동력
    const dist = {};
    const startKey = `${unit.x},${unit.y}`;
    dist[startKey] = 0;

    const queue = [{ col: unit.x, row: unit.y, cost: 0 }];
    const reachable = [];

    while (queue.length > 0) {
      // 최소 코스트 우선 처리 (단순 BFS이지만 cost로 필터)
      queue.sort((a, b) => a.cost - b.cost);
      const { col, row, cost } = queue.shift();

      for (const nb of getNeighbors(col, row)) {
        if (!inBounds(nb.col, nb.row, cols, rows)) continue;

        const key = `${nb.col},${nb.row}`;
        const terrainType = map[nb.row][nb.col];
        const terrainCost = TERRAIN[terrainType]?.moveCost ?? Infinity;

        // 통과 불가 지형
        if (terrainCost === Infinity) continue;
        // 아군 위치: 통과 불가
        if (allyPositions.has(key)) continue;

        const newCost = cost + terrainCost;
        if (newCost > unit.move) continue;                 // 이동력 초과
        if (dist[key] !== undefined && dist[key] <= newCost) continue; // 이미 더 짧은 경로

        dist[key] = newCost;

        // 적군 위치: 통과는 가능하지만 목적지는 불가
        if (!enemyPositions.has(key)) {
          reachable.push({ col: nb.col, row: nb.row });
        }

        queue.push({ col: nb.col, row: nb.row, cost: newCost });
      }
    }

    return reachable;
  }
}

export default MoveSystem;
