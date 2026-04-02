// ============================================================
//  Supabase 클라이언트 싱글톤 — data-agent 담당
//  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수 필요
//  환경변수 미설정 시 null 반환 → 오프라인 모드로 동작
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] 환경변수 미설정 — 오프라인 모드로 실행됩니다.');
  console.warn('  → .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정하세요.');
}

// 환경변수 없으면 null (오프라인 모드)
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // 세션을 localStorage에 자동 저장 (새로고침 후 유지)
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
