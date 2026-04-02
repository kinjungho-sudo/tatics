// ============================================================
//  ExpSystem — 경험치 & 레벨업 시스템
//  systems-agent 담당 / Phaser 의존성 없음
//  검증 완료 로직 — 수정 금지
// ============================================================

import { fiftyFifty } from '../utils/Random.js';
import { growthTable } from '../data/growthTable.js';

// 경험치 상수
export const EXP_ATTACK  = 5;   // 공격 성공 시 획득
export const EXP_KILL    = 15;  // 적 처치 시 추가 획득
export const MAX_LEVEL   = 20;  // 최대 레벨

/**
 * 레벨업에 필요한 경험치 계산
 * 필요 EXP = 현재 레벨 × 20
 * @param {number} lv
 * @returns {number}
 */
export function expRequired(lv) {
  return lv * 20;
}

export class ExpSystem {
  /**
   * 경험치 획득 처리 (레벨업 포함)
   *
   * @param {Object} unit        - 경험치를 받는 유닛
   * @param {number} amount      - 획득 경험치량
   * @returns {Array<Object>}    - 레벨업 이벤트 배열 (없으면 빈 배열)
   *   각 이벤트: { oldLv, newLv, statGains: { hp, atk, def, spd } }
   */
  gainExp(unit, amount) {
    if (unit.lv >= MAX_LEVEL) return [];

    unit.exp += amount;
    const levelUpEvents = [];

    // 연속 레벨업 처리 (한 번에 여러 레벨 가능)
    while (unit.lv < MAX_LEVEL && unit.exp >= expRequired(unit.lv)) {
      unit.exp -= expRequired(unit.lv);
      const oldLv = unit.lv;
      unit.lv++;

      const statGains = this._applyLevelUp(unit);
      levelUpEvents.push({ oldLv, newLv: unit.lv, statGains });
    }

    return levelUpEvents;
  }

  /**
   * 레벨업 스탯 성장 적용
   * 파랜드 스타일: growthTable 기본값 + 50% 확률 추가 +1
   * 레벨업 시 maxHp도 반드시 업데이트
   *
   * @param {Object} unit
   * @returns {Object} 실제 증가한 스탯 { hp, atk, def, spd }
   * @private
   */
  _applyLevelUp(unit) {
    const job = unit.job;
    const base = growthTable[job];

    if (!base) {
      console.warn(`[ExpSystem] 직업 "${job}"의 growthTable 없음`);
      return { hp: 0, atk: 0, def: 0, spd: 0 };
    }

    const gains = {
      hp:  base.hp  + (fiftyFifty() ? 1 : 0),
      atk: base.atk + (fiftyFifty() ? 1 : 0),
      def: base.def + (fiftyFifty() ? 1 : 0),
      spd: base.spd + (fiftyFifty() ? 1 : 0),
    };

    // 스탯 적용
    unit.maxHp += gains.hp;  // maxHp 먼저 증가
    unit.hp    += gains.hp;  // 현재 HP도 함께 증가 (파랜드 스타일)
    unit.atk   += gains.atk;
    unit.def   += gains.def;
    unit.spd   += gains.spd;

    return gains;
  }

  /**
   * 공격 성공 시 경험치 처리 (편의 메서드)
   * @param {Object} attacker
   * @param {boolean} killed - 처치 여부
   * @returns {Array} 레벨업 이벤트
   */
  onAttackSuccess(attacker, killed) {
    const amount = EXP_ATTACK + (killed ? EXP_KILL : 0);
    return this.gainExp(attacker, amount);
  }
}

export default ExpSystem;
