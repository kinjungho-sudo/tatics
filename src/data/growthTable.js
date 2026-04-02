// ============================================================
//  직업별 레벨업 성장 테이블 — data-agent 담당
//  CLAUDE.md 고정값 — 임의 수정 금지
//  성장 방식: growthTable 기준 + 50% 확률로 추가 +1 (파랜드 스타일)
// ============================================================

// 기본 증가량 (레벨업마다 무조건 적용)
export const growthTable = {
  기사:   { hp: 8, atk: 2, def: 3, spd: 0 },
  마법사: { hp: 4, atk: 4, def: 1, spd: 1 },
  궁수:   { hp: 5, atk: 3, def: 2, spd: 1 },
  성직자: { hp: 5, atk: 1, def: 2, spd: 1 },
  기병:   { hp: 6, atk: 3, def: 1, spd: 1 },
};

export default growthTable;
