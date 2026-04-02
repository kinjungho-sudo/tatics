// ============================================================
//  지형 데이터 — data-agent 담당
//  순수 데이터만, 로직 없음
// ============================================================

// 지형 타입별 이동 코스트 및 보너스
// moveCost: Infinity = 통과 불가
export const TERRAIN = {
  0: { name: '평지', moveCost: 1,        defBonus: 0  },
  1: { name: '장애물', moveCost: Infinity, defBonus: 0  },
  2: { name: '숲',   moveCost: 2,        defBonus: 10 },
  3: { name: '강',   moveCost: 3,        defBonus: -5 },
  4: { name: '산',   moveCost: Infinity, defBonus: 20 },
};

export default TERRAIN;