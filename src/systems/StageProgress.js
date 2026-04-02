// ============================================================
//  StageProgress — 스테이지 진행 상황 저장/로드
//  localStorage 전용 (오프라인 우선)
// ============================================================

const LS_KEY = 'srpg_stage_progress';

const STAGE_ORDER = ['stage01', 'stage02', 'stage03', 'stage04', 'stage05'];

function _load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function _save(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export const StageProgress = {
  /** 스테이지 클리어 저장 */
  clearStage(stageId) {
    const data = _load();
    data[stageId] = { cleared: true, clearedAt: new Date().toISOString() };
    _save(data);
  },

  /** 특정 스테이지 클리어 여부 */
  isCleared(stageId) {
    return !!_load()[stageId]?.cleared;
  },

  /** 특정 스테이지 플레이 가능 여부 (첫 스테이지 or 이전 스테이지 클리어 시) */
  isUnlocked(stageId) {
    const idx = STAGE_ORDER.indexOf(stageId);
    if (idx === 0) return true;                            // stage01 항상 해제
    return this.isCleared(STAGE_ORDER[idx - 1]);
  },

  /** 클리어 스테이지 수 */
  clearedCount() {
    const data = _load();
    return STAGE_ORDER.filter((id) => data[id]?.cleared).length;
  },

  /** 전체 초기화 (디버그용) */
  reset() {
    localStorage.removeItem(LS_KEY);
  },
};

export default StageProgress;
