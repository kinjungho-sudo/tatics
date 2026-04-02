// ============================================================
//  StageProgress — 스테이지 진행 상황 저장/로드
//  localStorage 우선, 로그인 시 Supabase cloud 동기화
// ============================================================

const LS_KEY = 'srpg_stage_progress';
const STAGE_ORDER = ['stage01', 'stage02', 'stage03', 'stage04', 'stage05'];

function _load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
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

  /** 특정 스테이지 플레이 가능 여부 */
  isUnlocked(stageId) {
    const idx = STAGE_ORDER.indexOf(stageId);
    if (idx === 0) return true;
    return this.isCleared(STAGE_ORDER[idx - 1]);
  },

  /** 클리어 스테이지 수 */
  clearedCount() {
    const data = _load();
    return STAGE_ORDER.filter((id) => data[id]?.cleared).length;
  },

  /** 전체 진행 데이터 반환 (SaveSystem에 넘길 때 사용) */
  getAll() {
    return _load();
  },

  /** 클라우드/슬롯에서 불러온 데이터로 덮어쓰기 */
  applyAll(progressData) {
    if (!progressData || typeof progressData !== 'object') return;
    _save(progressData);
  },

  /** 전체 초기화 (로그아웃 or 디버그) */
  reset() {
    localStorage.removeItem(LS_KEY);
  },
};

export default StageProgress;
