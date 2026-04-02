// ============================================================
//  직업별 기본 스탯 정의 — data-agent 담당
//  CLAUDE.md 고정값 — 임의 수정 금지
//  순수 데이터: 로직 없음
// ============================================================

// 직업별 기본 스탯 (초기 lv.1 기준)
export const JOB_BASE = {
  기사: {
    job: '기사',
    hp: 100, maxHp: 100,
    atk: 30, def: 15,
    spd: 8, move: 3, range: 1,
  },
  마법사: {
    job: '마법사',
    hp: 70, maxHp: 70,
    atk: 45, def: 5,
    spd: 12, move: 2, range: 2,
  },
  궁수: {
    job: '궁수',
    hp: 80, maxHp: 80,
    atk: 25, def: 10,
    spd: 10, move: 3, range: 3,
  },
  성직자: {
    job: '성직자',
    hp: 75, maxHp: 75,
    atk: 15, def: 8,
    spd: 9, move: 2, range: 1,
  },
  기병: {
    job: '기병',
    hp: 90, maxHp: 90,
    atk: 28, def: 8,
    spd: 11, move: 5, range: 1,
  },
};

// 아군 초기 유닛 목록 (stage01 기본 파티)
export const ALLY_UNITS = [
  {
    id: 'p1', name: '아이언', team: 'ally',
    x: 1, y: 3,
    lv: 1, exp: 0,
    acted: false,
    ...JOB_BASE['기사'],
  },
  {
    id: 'p2', name: '실버', team: 'ally',
    x: 1, y: 6,
    lv: 1, exp: 0,
    acted: false,
    ...JOB_BASE['기사'],
  },
  {
    id: 'p3', name: '아르카', team: 'ally',
    x: 0, y: 2,
    lv: 1, exp: 0,
    acted: false,
    ...JOB_BASE['마법사'],
  },
  {
    id: 'p4', name: '레나', team: 'ally',
    x: 0, y: 5,
    lv: 1, exp: 0,
    acted: false,
    ...JOB_BASE['궁수'],
  },
  {
    id: 'p5', name: '리아', team: 'ally',
    x: 0, y: 4,
    lv: 1, exp: 0,
    acted: false,
    ...JOB_BASE['성직자'],
  },
  {
    id: 'p6', name: '볼트', team: 'ally',
    x: 1, y: 8,
    lv: 1, exp: 0,
    acted: false,
    ...JOB_BASE['기병'],
  },
];

export default JOB_BASE;
