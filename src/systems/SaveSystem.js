// ============================================================
//  SaveSystem — 세이브/로드 (슬롯 1~3) + 전투 기록
//  로그인 상태: Supabase
//  오프라인/미로그인: localStorage 폴백
// ============================================================

import { supabase } from '../lib/supabase.js';
import { authSystem } from './AuthSystem.js';

const lsKey = (slot) => `srpg_save_slot_${slot}`;

function rowToSaveData(row) {
  return {
    slot:          row.slot_number,
    stageProgress: row.stage_progress,
    unitData:      row.unit_data,
    playTimeSec:   row.play_time_sec,
    updatedAt:     row.updated_at,
  };
}

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

    if (!supabase || !authSystem.isLoggedIn) {
      localStorage.setItem(lsKey(slot), JSON.stringify({
        ...payload, savedAt: new Date().toISOString(),
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

    if (error) { console.error('[Save] 저장 실패:', error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 불러오기 (slot: 1~3)
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
    if (!data) return null;
    return rowToSaveData(data);
  }

  // ─────────────────────────────────────────
  // 전체 슬롯 목록
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
      .from('save_slots').select('*')
      .eq('user_id', authSystem.userId)
      .order('slot_number');

    if (error) { console.error('[Save] 전체 불러오기 실패:', error.message); return []; }

    return [1, 2, 3].map(slot => {
      const row = data.find(r => r.slot_number === slot);
      return row ? rowToSaveData(row) : { slot, empty: true };
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
      .from('save_slots').delete()
      .eq('user_id', authSystem.userId)
      .eq('slot_number', slot);
    if (error) { console.error('[Save] 삭제 실패:', error.message); return { ok: false }; }
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 전투 기록 저장 (battle_records)
  // record: { stageId, won, turnCount, unitData }
  // ─────────────────────────────────────────
  async saveBattleRecord(record) {
    if (!supabase || !authSystem.isLoggedIn) {
      // 오프라인: localStorage에 최근 20건 보관
      const key  = 'srpg_battle_records';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ ...record, playedAt: new Date().toISOString(), userId: 'offline' });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
      return { ok: true, offline: true };
    }

    const { error } = await supabase.from('battle_records').insert({
      user_id:    authSystem.userId,
      stage_id:   record.stageId,
      won:        record.won,
      turn_count: record.turnCount,
      unit_data:  record.unitData ?? [],
    });

    if (error) { console.error('[Save] 전투 기록 저장 실패:', error.message); return { ok: false }; }
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 전투 기록 불러오기 (최근 N건)
  // ─────────────────────────────────────────
  async getBattleRecords(limit = 20) {
    if (!supabase || !authSystem.isLoggedIn) {
      const list = JSON.parse(localStorage.getItem('srpg_battle_records') || '[]');
      return list.slice(0, limit);
    }

    const { data, error } = await supabase
      .from('battle_records').select('*')
      .eq('user_id', authSystem.userId)
      .order('played_at', { ascending: false })
      .limit(limit);

    if (error) { console.error('[Save] 전투 기록 불러오기 실패:', error.message); return []; }
    return data.map(r => ({
      stageId:   r.stage_id,
      won:       r.won,
      turnCount: r.turn_count,
      unitData:  r.unit_data,
      playedAt:  r.played_at,
    }));
  }

  // ─────────────────────────────────────────
  // 유틸
  // ─────────────────────────────────────────
  formatPlayTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  clearedCount(stageProgress) {
    return Object.values(stageProgress ?? {}).filter(v => v?.cleared).length;
  }
}

export const saveSystem = new SaveSystem();
