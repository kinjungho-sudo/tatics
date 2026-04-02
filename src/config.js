// ============================================================
//  전역 설정 상수 — setup-agent 담당
//  이 파일의 상수는 프로젝트 전체에서 공유됨
// ============================================================

export const CELL_SIZE = 64;         // 타일 픽셀 크기
export const MAP_COLS = 14;          // 맵 가로 타일 수
export const MAP_ROWS = 10;          // 맵 세로 타일 수
export const MAX_LEVEL = 20;         // 최대 레벨

// 게임 캔버스 크기 (CELL_SIZE 기준 자동 계산)
export const GAME_WIDTH  = CELL_SIZE * MAP_COLS;  // 896
export const GAME_HEIGHT = CELL_SIZE * MAP_ROWS;  // 640

// 씬 키 상수
export const SCENE = {
  BOOT:   'BootScene',
  TITLE:  'TitleScene',
  MAP:    'MapScene',
  BATTLE: 'BattleScene',
};

// 팀 식별자
export const TEAM = {
  ALLY:  'ally',
  ENEMY: 'enemy',
};

// 전투 페이즈 상태 머신
export const PHASE = {
  IDLE:     'idle',      // 유닛 선택 대기
  SELECTED: 'selected',  // 유닛 선택됨 (이동 범위 표시)
  MOVED:    'moved',     // 이동 완료 (공격/대기 선택)
  ENEMY:    'enemy',     // 적 턴 진행 중
  RESULT:   'result',    // 전투 결과 표시
};

// 지형 타입
export const TERRAIN_TYPE = {
  PLAIN:    0,
  OBSTACLE: 1,
  FOREST:   2,
  RIVER:    3,
  MOUNTAIN: 4,
};

// 색상 팔레트 (BattleScene 시각화용)
export const COLOR = {
  ALLY:         0x3498db,  // 아군: 파란 박스
  ENEMY:        0xe74c3c,  // 적군: 빨간 박스
  MOVE_RANGE:   0x2ecc71,  // 이동 범위: 초록 반투명
  ATTACK_RANGE: 0xe74c3c,  // 공격 범위: 빨간 반투명
  SELECTED:     0xf1c40f,  // 선택된 유닛 테두리: 노란색
  TERRAIN_PLAIN:    0x8BC34A,
  TERRAIN_OBSTACLE: 0x607D8B,
  TERRAIN_FOREST:   0x388E3C,
  TERRAIN_RIVER:    0x2980b9,
  TERRAIN_MOUNTAIN: 0x795548,
};
