// ============================================================
//  AISystem — 적 자동 행동 AI
//  systems-agent 담당 / Phaser 의존성 없음
//  검증 완료 로직 — 수정 금지
// ============================================================

import { manhattanDist } from '../utils/GridUtils.js';
import MoveSystem from './MoveSystem.js';
import AttackSystem from './AttackSystem.js';

export class AISystem {
  constructor() {
    this.moveSystem   = new MoveSystem();
    this.attackSystem = new AttackSystem();
  }

  /**
   * 적 턴 전체 실행
   * 1. SPD 높은 적부터 행동
   * 2. 가장 가까운 아군 타겟 선정 (맨해튼 거리)
   * 3. 공격 가능 → 즉시 공격
   * 4. 불가 → 타겟 방향 최대 이동 후 재공격 시도
   *
   * @param {Array}    enemies      - 적군 유닛 배열
   * @param {Array}    allies       - 아군 유닛 배열
   * @param {Array}    map          - 10×14 지형 배열
   * @param {number}   cols
   * @param {number}   rows
   * @param {Function} onAction     - 각 적 행동 후 콜백 { type, unit, target, result }
   * @returns {Array} 발생한 이벤트 로그 배열
   */
  runEnemyTurn(enemies, allies, map, cols, rows, onAction = () => {}) {
    const events = [];

    // 살아있는 아군만 타겟 후보
    let liveAllies = allies.filter((u) => u.hp > 0);
    // SPD 내림차순 정렬 (SPD 같으면 id 순)
    const sortedEnemies = [...enemies]
      .filter((e) => e.hp > 0)
      .sort((a, b) => b.spd - a.spd || a.id.localeCompare(b.id));

    for (const enemy of sortedEnemies) {
      if (liveAllies.length === 0) break; // 아군 전멸
      if (enemy.acted) continue;

      // 가장 가까운 아군 타겟 선정
      const target = this._findNearestAlly(enemy, liveAllies);
      if (!target) continue;

      // 사망 유닛 제외 — 이동 범위 계산 시 장애물로 처리되지 않도록
      const allUnits = [...enemies.filter(e => e.hp > 0), ...allies.filter(a => a.hp > 0)];

      // 공격 가능 여부 확인
      const canAttackNow = manhattanDist(enemy.x, enemy.y, target.x, target.y) <= enemy.range;

      if (canAttackNow) {
        // 즉시 공격
        const result = this.attackSystem.executeAttack(enemy, target);
        enemy.acted = true;
        events.push({ type: 'attack', unit: enemy, target, result });
        onAction({ type: 'attack', unit: enemy, target, result });

        if (result.killed) {
          liveAllies = liveAllies.filter((a) => a.id !== target.id);
        }
      } else {
        // 타겟 방향으로 최대 이동
        const reachable = this.moveSystem.calcMoveRange(enemy, map, allUnits, cols, rows);

        if (reachable.length > 0) {
          // 타겟에 가장 가까운 도달 가능 타일 선정
          const bestTile = reachable.reduce((best, tile) => {
            const d = manhattanDist(tile.col, tile.row, target.x, target.y);
            const bd = manhattanDist(best.col, best.row, target.x, target.y);
            return d < bd ? tile : best;
          });

          // 이동 실행
          enemy.x = bestTile.col;
          enemy.y = bestTile.row;
          events.push({ type: 'move', unit: enemy, to: bestTile });
          onAction({ type: 'move', unit: enemy, to: bestTile });

          // 이동 후 재공격 시도
          const canAttackAfterMove =
            manhattanDist(enemy.x, enemy.y, target.x, target.y) <= enemy.range;

          if (canAttackAfterMove) {
            const result = this.attackSystem.executeAttack(enemy, target);
            events.push({ type: 'attack', unit: enemy, target, result });
            onAction({ type: 'attack', unit: enemy, target, result });

            if (result.killed) {
              liveAllies = liveAllies.filter((a) => a.id !== target.id);
            }
          }
        }

        enemy.acted = true;
      }
    }

    return events;
  }

  /**
   * 가장 가까운 아군 유닛 반환 (맨해튼 거리 기준)
   * @private
   */
  _findNearestAlly(enemy, liveAllies) {
    if (liveAllies.length === 0) return null;
    return liveAllies.reduce((nearest, ally) => {
      const d = manhattanDist(enemy.x, enemy.y, ally.x, ally.y);
      const dn = manhattanDist(enemy.x, enemy.y, nearest.x, nearest.y);
      return d < dn ? ally : nearest;
    });
  }
}

export default AISystem;
