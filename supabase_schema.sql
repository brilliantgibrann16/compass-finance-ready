-- supabase_schema.sql
-- Production-grade Supabase schema for Compass Finance with strict Row Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ( auth.uid() = id );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- SYNC STATE (Document-based store per slice)
-- ==========================================
-- Rather than breaking down every field of every transaction (which requires migrations on every UI update),
-- we store each Zustand slice as a JSONB document. This perfectly matches the local-first "replace" semantics.

CREATE TABLE IF NOT EXISTS public.sync_state (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  slice_id TEXT NOT NULL, -- 'balance', 'transactions', 'debts', 'savingsGoals', 'wishlist', 'notifications'
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  PRIMARY KEY (user_id, slice_id)
);

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync_state" ON public.sync_state FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Users can insert own sync_state" ON public.sync_state FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users can update own sync_state" ON public.sync_state FOR UPDATE USING ( auth.uid() = user_id );
CREATE POLICY "Users can delete own sync_state" ON public.sync_state FOR DELETE USING ( auth.uid() = user_id );

-- Update timestamp on change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_sync_state_updated_at ON public.sync_state;
CREATE TRIGGER handle_sync_state_updated_at
  BEFORE UPDATE ON public.sync_state
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
