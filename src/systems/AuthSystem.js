// ============================================================
//  AuthSystem — 소셜 로그인 / 세션 관리
//  Supabase Auth 기반 (Google, GitHub OAuth)
//  supabase = null 이면 오프라인 모드로 무음 동작
// ============================================================

import { supabase } from '../lib/supabase.js';

class AuthSystem {
  constructor() {
    this.user    = null;   // 현재 로그인 유저
    this.session = null;   // Supabase 세션
    this._listeners = [];  // 상태 변경 콜백
  }

  // ─────────────────────────────────────────
  // 초기화 — 페이지 로드 시 1회 호출
  // OAuth 리다이렉트 후 자동으로 세션 복원됨
  // ─────────────────────────────────────────
  async init() {
    if (!supabase) return null;

    // 현재 세션 확인 (로컬스토리지 + OAuth 콜백 토큰 처리 포함)
    const { data: { session } } = await supabase.auth.getSession();
    this._applySession(session);

    // 이후 세션 변경 실시간 감지
    supabase.auth.onAuthStateChange((_event, session) => {
      this._applySession(session);
      this._listeners.forEach(fn => fn(this.user));
    });

    return this.user;
  }

  // ─────────────────────────────────────────
  // 소셜 로그인 (provider: 'google' | 'github')
  // ─────────────────────────────────────────
  async signIn(provider = 'google') {
    if (!supabase) {
      console.warn('[Auth] 오프라인 모드 — 로그인 불가');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // 로그인 후 이 페이지로 돌아옴
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('[Auth] 로그인 실패:', error.message);
  }

  // ─────────────────────────────────────────
  // 로그아웃
  // ─────────────────────────────────────────
  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    this._applySession(null);
    this._listeners.forEach(fn => fn(null));
  }

  // ─────────────────────────────────────────
  // 세션 변경 리스너 등록
  // 반환값: 구독 해제 함수
  // ─────────────────────────────────────────
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  // ─────────────────────────────────────────
  // 게터
  // ─────────────────────────────────────────
  get isLoggedIn() {
    return !!this.user;
  }

  // 표시용 이름 (소셜 이름 → 이메일 순 폴백)
  get displayName() {
    if (!this.user) return '게스트';
    return (
      this.user.user_metadata?.name ||
      this.user.user_metadata?.full_name ||
      this.user.email?.split('@')[0] ||
      '유저'
    );
  }

  get avatarUrl() {
    return this.user?.user_metadata?.avatar_url ?? null;
  }

  get userId() {
    return this.user?.id ?? null;
  }

  // ─────────────────────────────────────────
  // 내부 유틸
  // ─────────────────────────────────────────
  _applySession(session) {
    this.session = session;
    this.user    = session?.user ?? null;
  }
}

// 싱글톤 — 어디서든 import해서 동일 인스턴스 사용
export const authSystem = new AuthSystem();
