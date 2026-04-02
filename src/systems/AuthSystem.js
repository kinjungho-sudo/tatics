// ============================================================
//  AuthSystem — 이메일 회원가입/로그인 + OAuth (Google, GitHub)
//  Supabase Auth 기반
//  supabase = null 이면 오프라인 모드로 무음 동작
// ============================================================

import { supabase } from '../lib/supabase.js';

class AuthSystem {
  constructor() {
    this.user    = null;
    this.session = null;
    this._listeners = [];
  }

  // ─────────────────────────────────────────
  // 초기화 — 페이지 로드 시 1회 호출
  // ─────────────────────────────────────────
  async init() {
    if (!supabase) return null;

    const { data: { session } } = await supabase.auth.getSession();
    this._applySession(session);

    supabase.auth.onAuthStateChange((_event, session) => {
      this._applySession(session);
      this._listeners.forEach(fn => fn(this.user));
    });

    return this.user;
  }

  // ─────────────────────────────────────────
  // 이메일 회원가입
  // ─────────────────────────────────────────
  async signUp(email, password, username) {
    if (!supabase) return { ok: false, error: '오프라인 모드' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },          // profiles 트리거에서 username으로 사용
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { ok: false, error: error.message };

    // 이메일 확인 불필요 설정 시 즉시 로그인됨
    // 이메일 확인 필요 시 data.user.confirmed_at === null
    const needsConfirm = data.user && !data.user.confirmed_at &&
                         !data.session;
    return { ok: true, needsConfirm };
  }

  // ─────────────────────────────────────────
  // 이메일 로그인
  // ─────────────────────────────────────────
  async signInWithEmail(email, password) {
    if (!supabase) return { ok: false, error: '오프라인 모드' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 소셜 로그인 (provider: 'google' | 'github')
  // ─────────────────────────────────────────
  async signIn(provider = 'google') {
    if (!supabase) { console.warn('[Auth] 오프라인 모드'); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error('[Auth] OAuth 로그인 실패:', error.message);
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
  // 비밀번호 재설정 이메일 발송
  // ─────────────────────────────────────────
  async sendPasswordReset(email) {
    if (!supabase) return { ok: false, error: '오프라인 모드' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 세션 변경 리스너 등록 → 반환값: 해제 함수
  // ─────────────────────────────────────────
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  // ─────────────────────────────────────────
  // 게터
  // ─────────────────────────────────────────
  get isLoggedIn()   { return !!this.user; }
  get userId()       { return this.user?.id ?? null; }
  get userEmail()    { return this.user?.email ?? null; }
  get avatarUrl()    { return this.user?.user_metadata?.avatar_url ?? null; }

  get displayName() {
    if (!this.user) return '게스트';
    return (
      this.user.user_metadata?.username ||
      this.user.user_metadata?.name     ||
      this.user.user_metadata?.full_name ||
      this.user.email?.split('@')[0]    ||
      '유저'
    );
  }

  // ─────────────────────────────────────────
  // 닉네임 변경 (profiles 테이블 업데이트)
  // ─────────────────────────────────────────
  async updateNickname(newName) {
    if (!supabase || !this.isLoggedIn) return { ok: false, error: '로그인 필요' };
    const trimmed = newName?.trim();
    if (!trimmed || trimmed.length < 2) return { ok: false, error: '닉네임은 2자 이상' };
    if (trimmed.length > 16) return { ok: false, error: '닉네임은 16자 이하' };

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', this.userId);

    if (error) return { ok: false, error: error.message };

    // 로컬 user_metadata 반영 (재로그인 전까지 displayName에 바로 적용)
    if (this.user) {
      this.user = {
        ...this.user,
        user_metadata: { ...this.user.user_metadata, username: trimmed },
      };
    }
    this._listeners.forEach(fn => fn(this.user));
    return { ok: true };
  }

  // ─────────────────────────────────────────
  // 클라우드 데이터 로드 (로그인 후 StageProgress + unitData 복원)
  // saveSystem과 순환 의존 방지를 위해 외부에서 saveSystem을 주입
  // ─────────────────────────────────────────
  async loadCloudSave(saveSystem, StageProgress) {
    if (!this.isLoggedIn) return null;
    try {
      const saved = await saveSystem.load(1);
      if (saved && !saved.empty) {
        StageProgress.applyAll(saved.stageProgress ?? {});
        return saved;  // { stageProgress, unitData, playTimeSec }
      }
    } catch (e) {
      console.warn('[Auth] 클라우드 세이브 로드 실패:', e.message);
    }
    return null;
  }

  // ─────────────────────────────────────────
  _applySession(session) {
    this.session = session;
    this.user    = session?.user ?? null;
  }
}

export const authSystem = new AuthSystem();
