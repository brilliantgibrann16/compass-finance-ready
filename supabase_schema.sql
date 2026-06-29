-- supabase_schema.sql
-- Production-grade Supabase schema for Compass Finance with strict Row Level Security (RLS).
-- Run this entire script in Supabase Dashboard → SQL Editor → New Query.
-- Idempotent: safe to re-run; uses IF NOT EXISTS / DROP TRIGGER IF EXISTS guards.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS  (1:1 with auth.users — auto-populated by trigger on signup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create a public.users row on every Supabase auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL,
  merchant TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx
  ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SAVINGS GOALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount >= 0),
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  type TEXT NOT NULL DEFAULT 'custom',  -- 'graduation' | 'emergency' | 'custom'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_goals_user_id_idx
  ON public.savings_goals (user_id);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can read own savings_goals"
  ON public.savings_goals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can insert own savings_goals"
  ON public.savings_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can update own savings_goals"
  ON public.savings_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can delete own savings_goals"
  ON public.savings_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SYNC STATE  (legacy JSONB Zustand-slice mirror — kept for offline-first sync)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slice_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, slice_id)
);

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync_state" ON public.sync_state;
CREATE POLICY "Users can view own sync_state"
  ON public.sync_state FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sync_state" ON public.sync_state;
CREATE POLICY "Users can insert own sync_state"
  ON public.sync_state FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sync_state" ON public.sync_state;
CREATE POLICY "Users can update own sync_state"
  ON public.sync_state FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sync_state" ON public.sync_state;
CREATE POLICY "Users can delete own sync_state"
  ON public.sync_state FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_sync_state_updated_at ON public.sync_state;
CREATE TRIGGER handle_sync_state_updated_at
  BEFORE UPDATE ON public.sync_state
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- DONE
-- ============================================================================
-- Verify with:
--   SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All four tables (users, transactions, savings_goals, sync_state) must show rowsecurity = true.
