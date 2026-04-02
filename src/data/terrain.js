// ============================================================
//  지형 데이터 — data-agent 담당
//  순수 데이터만, 로직 없음
// ============================================================

// 지형 타입별 이동 코스트 및 보너스
// moveCost: Infinity = 통과 불가
export const TERRAIN = {
  0: { name: '평지', moveCost: 1,        defBonus: 0  },
  1: { name: '바위', moveCost: Infinity, defBonus: 0  },  // 바위 → 이동불가
  2: { name: '나무', moveCost: Infinity, defBonus: 0  },  // 나무 → 이동불가
  3: { name: '강',   moveCost: 3,        defBonus: -5 },  // 강 → 이동느림
  4: { name: '산',   moveCost: Infinity, defBonus: 20 },  // 산 → 이동불가
};

export default TERRAIN;