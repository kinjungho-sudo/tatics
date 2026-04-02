-- ============================================================
--  SRPG 게임 DB 스키마 — Supabase PostgreSQL
--  Supabase 대시보드 > SQL Editor에서 실행하세요
--  ※ 전체를 선택해서 한 번에 실행 (idempotent)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. profiles 테이블
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. save_slots 테이블 (슬롯 1~3)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.save_slots (
  id              SERIAL      PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_number     SMALLINT    NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  -- { "stage01": { "cleared": true, "turnCount": 12 }, ... }
  stage_progress  JSONB       NOT NULL DEFAULT '{}',
  -- [{ id, name, job, lv, exp, hp, maxHp, atk, def, spd, move, range }, ...]
  unit_data       JSONB       NOT NULL DEFAULT '[]',
  play_time_sec   INT         NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slot_number)
);

-- ─────────────────────────────────────────────
-- 3. battle_records 테이블 (전투 기록)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.battle_records (
  id          SERIAL      PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage_id    TEXT        NOT NULL,
  won         BOOLEAN     NOT NULL,
  turn_count  INT         NOT NULL DEFAULT 0,
  -- 전투 후 아군 유닛 최종 상태 스냅샷
  unit_data   JSONB       NOT NULL DEFAULT '[]',
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. RLS 활성화
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_records ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- save_slots 정책
CREATE POLICY "saves_all_own" ON public.save_slots
  FOR ALL USING (auth.uid() = user_id);

-- battle_records 정책
CREATE POLICY "battle_records_all_own" ON public.battle_records
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 5. 신규 유저 자동 프로필 생성 트리거
--    이메일 회원가입 + OAuth 모두 지원
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
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 6. save_slots updated_at 자동 갱신
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
