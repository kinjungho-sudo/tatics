// ============================================================
//  AttackSystem — 데미지 계산, 공격 범위, 반격
//  systems-agent 담당 / Phaser 의존성 없음
//  검증 완료 로직 — 수정 금지
// ============================================================

import { manhattanDist } from '../utils/GridUtils.js';
import { randomInt } from '../utils/Random.js';

export class AttackSystem {
  /**
   * 데미지 계산
   * 공식: max(1, attacker.atk - defender.def) + random(0, 5)
   *
   * @param {Object} attacker
   * @param {Object} defender
   * @returns {number} 최종 데미지 (최소 1 보장)
   */
  calcDamage(attacker, defender) {
    const base = Math.max(1, attacker.atk - defender.def);
    const variance = randomInt(0, 5);
    return base + variance;
  }

  /**
   * 공격 가능한 적 유닛 목록 반환
   * 맨해튼 거리 <= unit.range 이면 공격 가능
   *
   * @param {Object} unit       - 공격하는 유닛
   * @param {Array}  targetTeam - 공격 대상 팀 유닛 배열
   * @returns {Array} 공격 가능한 유닛 배열
   */
  calcAtkRange(unit, targetTeam) {
    return targetTeam.filter((target) => {
      const dist = manhattanDist(unit.x, unit.y, target.x, target.y);
      return dist <= unit.range;
    });
  }

  /**
   * 반격 계산
   * 피격 유닛이 공격자를 공격 범위 안에 두고 있으면 반격
   *
   * @param {Object} attacker  - 원래 공격자
   * @param {Object} defender  - 피격 유닛 (반격 시도자)
   * @returns {{ canCounter: boolean, counterDamage: number }}
   */
  calcCounter(attacker, defender) {
    const dist = manhattanDist(defender.x, defender.y, attacker.x, attacker.y);
    const canCounter = dist <= defender.range;
    const counterDamage = canCounter ? this.calcDamage(defender, attacker) : 0;
    return { canCounter, counterDamage };
  }

  /**
   * 공격 실행 (데미지 적용 + 반격 처리)
   * 반환값을 BattleScene에서 받아 UI 업데이트에 사용
   *
   * @param {Object} attacker
   * @param {Object} defender
   * @returns {{ damage: number, counterDamage: number, killed: boolean, counterKilled: boolean }}
   */
  executeAttack(attacker, defender) {
    const damage = this.calcDamage(attacker, defender);
    defender.hp = Math.max(0, defender.hp - damage);
    const killed = defender.hp <= 0;

    // 반격 (피격 유닛이 살아 있을 때만)
    let counterDamage = 0;
    let counterKilled = false;
    if (!killed) {
      const { canCounter, counterDamage: cd } = this.calcCounter(attacker, defender);
      if (canCounter) {
        counterDamage = cd;
        attacker.hp = Math.max(0, attacker.hp - counterDamage);
        counterKilled = attacker.hp <= 0;
      }
    }

    return { damage, counterDamage, killed, counterKilled };
  }
}

export default AttackSystem;
