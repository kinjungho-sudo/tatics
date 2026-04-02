// ============================================================
//  TurnSystem — 턴 관리
//  systems-agent 담당 / Phaser 의존성 없음
//  검증 완료 로직 — 수정 금지
// ============================================================

export class TurnSystem {
  /**
   * @param {Object} [options]
   * @param {Function} [options.onAllyTurnStart]  - 아군 턴 시작 콜백
   * @param {Function} [options.onEnemyTurnStart] - 적 턴 시작 콜백
   * @param {Function} [options.onTurnChanged]    - 턴 변경 시 콜백
   */
  constructor(options = {}) {
    this.turnCount        = 1;
    this.currentTeam      = 'ally';  // 'ally' | 'enemy'
    this.onAllyTurnStart  = options.onAllyTurnStart  || (() => {});
    this.onEnemyTurnStart = options.onEnemyTurnStart || (() => {});
    this.onTurnChanged    = options.onTurnChanged    || (() => {});
  }

  /**
   * 아군 턴 시작 — 모든 아군 acted 초기화
   * @param {Array} allyUnits
   */
  startAllyTurn(allyUnits) {
    this.currentTeam = 'ally';
    // 모든 아군 행동 가능 상태로 초기화
    for (const unit of allyUnits) {
      unit.acted = false;
    }
    this.onAllyTurnStart(this.turnCount);
    this.onTurnChanged('ally', this.turnCount);
  }

  /**
   * 적 턴 시작 — 모든 적군 acted 초기화
   * @param {Array} enemyUnits
   */
  startEnemyTurn(enemyUnits) {
    this.currentTeam = 'enemy';
    for (const unit of enemyUnits) {
      unit.acted = false;
    }
    this.onEnemyTurnStart(this.turnCount);
    this.onTurnChanged('enemy', this.turnCount);
  }

  /**
   * 아군 턴 종료 → 적 턴 시작
   * @param {Array} allyUnits
   * @param {Array} enemyUnits
   */
  endAllyTurn(_allyUnits, enemyUnits) {
    // _allyUnits: 향후 아군 상태 기반 처리 확장 시 사용 (현재 미사용)
    this.startEnemyTurn(enemyUnits);
  }

  /**
   * 적 턴 종료 → 아군 턴 시작 + 턴 카운트 증가
   * @param {Array} allyUnits
   */
  endEnemyTurn(allyUnits) {
    this.turnCount++;
    this.startAllyTurn(allyUnits);
  }

  /**
   * 아군 전원 행동 완료 여부 확인
   * @param {Array} allyUnits
   * @returns {boolean}
   */
  isAllyTurnComplete(allyUnits) {
    return allyUnits.every((u) => u.acted);
  }
}

export default TurnSystem;
