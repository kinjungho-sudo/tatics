-- ============================================================
--  SRPG 게임 DB 스키마 — Supabase PostgreSQL
--  Supabase 대시보드 > SQL Editor에서 실행하세요
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. profiles 테이블
--    auth.users와 1:1 연동, 유저 기본 정보 보관
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. save_slots 테이블
--    슬롯 1~3, 스테이지 진행도 + 유닛 데이터 저장
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.save_slots (
  id              SERIAL      PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_number     SMALLINT    NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  -- 스테이지 진행도: { "stage01": { "cleared": true, "turnCount": 12 }, ... }
  stage_progress  JSONB       NOT NULL DEFAULT '{}',
  -- 유닛 데이터: [{ id, name, job, lv, exp, hp, maxHp, atk, def, spd, ... }, ...]
  unit_data       JSONB       NOT NULL DEFAULT '[]',
  play_time_sec   INT         NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slot_number)
);

-- ─────────────────────────────────────────────
-- 3. RLS (Row Level Security) 활성화
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_slots ENABLE ROW LEVEL SECURITY;

-- profiles 정책: 본인 데이터만 접근
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- save_slots 정책: 본인 슬롯만 CRUD
CREATE POLICY "saves_all_own" ON public.save_slots
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 4. 신규 유저 자동 프로필 생성 트리거
--    소셜 로그인 직후 profiles에 row 자동 삽입
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.email
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 기존 트리거 제거 후 재생성 (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 5. updated_at 자동 갱신 함수
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_save_slots_updated_at ON public.save_slots;
CREATE TRIGGER set_save_slots_updated_at
  BEFORE UPDATE ON public.save_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
