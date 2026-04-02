// ============================================================
//  SaveSystem — 세이브 / 로드 (슬롯 1~3)
//  로그인 상태: Supabase save_slots 테이블
//  오프라인/미로그인: localStorage 폴백
// ============================================================

import { supabase } from '../lib/supabase.js';
import { authSystem } from './AuthSystem.js';

// save_slots 행 → 게임 데이터 형식으로 변환
function rowToSaveData(row) {
  return {
    slot:          row.slot_number,
    stageProgress: row.stage_progress,  // { stage01: { cleared, turnCount }, ... }
    unitData:      row.unit_data,        // [{ id, name, job, lv, exp, ... }, ...]
    playTimeSec:   row.play_time_sec,
    updatedAt:     row.updated_at,
  };
}

// localStorage 키
const lsKey = (slot) => `srpg_save_slot_${slot}`;

class SaveSystem {
  // ─────────────────────────────────────────
  // 저장 (slot: 1~3)
  // data: { stageProgress, unitData, playTimeSec }
  // ─────────────────────────────────────────
  async save(slot, data) {
    if (slot < 1 || slot > 3) throw new Error('슬롯은 1~3만 가능합니다.');

    const payload = {
      stageProgress: data.stageProgress ?? {},
      unitData:      data.unitData      ?? [],
      playTimeSec:   data.playTimeSec   ?? 0,
    };

    // 오프라인 폴백
    if (!supabase || !authSystem.isLoggedIn) {
      localStorage.setItem(lsKey(slot), JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString(),
      }));
      return { ok: true, offline: true };
    }

    const { error } = await supabase
      .from('save_slots')
      .upsert({
        user_id:        authSystem.userId,
        slot_number:    slot,
        stage_progress: payload.stageProgress,
        unit_data:      payload.unitData,
        play_time_sec:  payload.playTimeSec,
      }, { onConflict: 'user_id,slot_number' });

    if (error) {
      console.error('[Save] 저장 실패:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 불러오기 (slot: 1~3)
  // 반환: 세이브 데이터 또는 null (빈 슬롯)
  // ─────────────────────────────────────────
  async load(slot) {
    if (slot < 1 || slot > 3) throw new Error('슬롯은 1~3만 가능합니다.');

    if (!supabase || !authSystem.isLoggedIn) {
      const raw = localStorage.getItem(lsKey(slot));
      return raw ? JSON.parse(raw) : null;
    }

    const { data, error } = await supabase
      .from('save_slots')
      .select('*')
      .eq('user_id', authSystem.userId)
      .eq('slot_number', slot)
      .maybeSingle();

    if (error) { console.error('[Save] 불러오기 실패:', error.message); return null; }
    if (!data)  return null;
    return rowToSaveData(data);
  }

  // ─────────────────────────────────────────
  // 전체 슬롯 목록 (1~3 모두 반환, 빈 슬롯은 { slot, empty: true })
  // MapScene에서 슬롯 선택 UI에 사용
  // ─────────────────────────────────────────
  async loadAll() {
    if (!supabase || !authSystem.isLoggedIn) {
      return [1, 2, 3].map(slot => {
        const raw = localStorage.getItem(lsKey(slot));
        if (!raw) return { slot, empty: true };
        return { slot, ...JSON.parse(raw) };
      });
    }

    const { data, error } = await supabase
      .from('save_slots')
      .select('*')
      .eq('user_id', authSystem.userId)
      .order('slot_number');

    if (error) { console.error('[Save] 전체 불러오기 실패:', error.message); return []; }

    return [1, 2, 3].map(slot => {
      const row = data.find(r => r.slot_number === slot);
      if (!row) return { slot, empty: true };
      return rowToSaveData(row);
    });
  }

  // ─────────────────────────────────────────
  // 슬롯 삭제
  // ─────────────────────────────────────────
  async delete(slot) {
    if (!supabase || !authSystem.isLoggedIn) {
      localStorage.removeItem(lsKey(slot));
      return { ok: true };
    }

    const { error } = await supabase
      .from('save_slots')
      .delete()
      .eq('user_id', authSystem.userId)
      .eq('slot_number', slot);

    if (error) { console.error('[Save] 삭제 실패:', error.message); return { ok: false }; }
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 유틸: 플레이 시간 포맷 (초 → "00:00:00")
  // ─────────────────────────────────────────
  formatPlayTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  // ─────────────────────────────────────────
  // 클리어한 스테이지 수 반환
  // ─────────────────────────────────────────
  clearedCount(stageProgress) {
    return Object.values(stageProgress).filter(v => v?.cleared).length;
  }
}

// 싱글톤
export const saveSystem = new SaveSystem();
