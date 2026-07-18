-- =========================================================
-- JUSTINLIMIT.COM // AI ANIME HUB // DATABASE SETUP SCRIPT
-- =========================================================

-- 1. TABLE CREATION & ALTERATIONS
-- =========================================================

-- Chat History Table
CREATE TABLE IF NOT EXISTS public.chat_history (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  username text NOT NULL,
  conversation_data jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS current_power integer DEFAULT 0;
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS current_rank text DEFAULT 'Academy Student';
ALTER TABLE public.chat_history ADD COLUMN IF NOT EXISTS character text DEFAULT 'Goku';
ALTER TABLE public.chat_history OWNER TO CURRENT_USER;

-- User Profiles Table Alterations
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS current_power integer DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS current_rank text DEFAULT 'Academy Student';

-- User Blocks Table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username text NOT NULL,
  blocked_at timestamptz DEFAULT now(),
  last_reset_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_blocks ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. INDEXES
-- =========================================================
DROP INDEX IF EXISTS idx_chat_history_username;
CREATE INDEX IF NOT EXISTS idx_chat_history_username ON public.chat_history (username);
CREATE INDEX IF NOT EXISTS idx_chat_history_username_char ON public.chat_history (username, character);

-- 3. POLICIES (Assuming RLS is enabled)
-- =========================================================

-- Ensure RLS is enabled
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- 1. Allow anyone to read chat history (Public)
DROP POLICY IF EXISTS "Allow public read access" ON public.chat_history;
CREATE POLICY "Allow public read access" ON public.chat_history 
FOR SELECT USING (true);

-- 2. Allow anyone to insert new messages (Public)
DROP POLICY IF EXISTS "Allow public insert access" ON public.chat_history;
CREATE POLICY "Allow public insert access" ON public.chat_history 
FOR INSERT WITH CHECK (true);

-- 3. Allow users to update their own messages if needed
DROP POLICY IF EXISTS "Allow public update access" ON public.chat_history;
CREATE POLICY "Allow public update access" ON public.chat_history 
FOR UPDATE USING (true);

-- 4. FUNCTIONS / RPCs
-- =========================================================

-- Update User Profile RPC
CREATE OR REPLACE FUNCTION public.update_user_profile(
    p_username text,
    p_current_power integer,
    p_current_rank text,
    p_last_message_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_profiles
    SET 
        current_power = p_current_power,
        current_rank = p_current_rank,
        last_message_at = p_last_message_at
    WHERE username = p_username;
END;
$$;

-- Rate Limit Gatekeeper RPC
CREATE OR REPLACE FUNCTION public.check_user_message_limit(p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_count integer := 0;
BEGIN
    SELECT COUNT(*)
    INTO v_message_count
    FROM public.token_logs
    WHERE TRIM(user_id) = TRIM(p_user_id)
      AND created_at >= NOW() - INTERVAL '30 minutes';

    -- Limit set to 25 messages per 30 minutes
    IF v_message_count >= 25 THEN
        RETURN FALSE; -- Block
    ELSE
        RETURN TRUE;  -- Allow
    END IF;
END;
$$;

-- Increment Power RPC
CREATE OR REPLACE FUNCTION increment_power(p_username TEXT, p_amount INT)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET power_level = power_level + p_amount
    WHERE username = p_username;
END;
$$ LANGUAGE plpgsql;

-- 5. INITIAL DATA (UPSERT)
-- =========================================================
INSERT INTO "public"."user_profiles" 
    ("username", "power_level", "last_message_at", "messages_sent_today", "current_power", "current_rank") 
VALUES 
    ('12', 50, '2026-06-27 10:36:08.833+00', 5, 0, 'Academy Student'), 
    ('fan', 0, '2026-06-28 16:57:29.182852+00', 0, 120, 'Genin'), 
    ('harry', 550, '2026-06-27 10:08:12.343+00', 9, 310, 'Jonin'), 
    ('hi', 0, '2026-06-28 17:19:12.346438+00', 0, 40, 'Academy Student'), 
    ('minta', 0, '2026-06-28 16:43:39.591714+00', 0, 120, 'Genin')
ON CONFLICT (username) 
DO UPDATE SET 
    power_level = EXCLUDED.power_level,
    last_message_at = EXCLUDED.last_message_at,
    messages_sent_today = EXCLUDED.messages_sent_today,
    current_power = EXCLUDED.current_power,
    current_rank = EXCLUDED.current_rank;
