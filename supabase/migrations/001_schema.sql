-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE accounts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email      text NOT NULL,
    password   text NOT NULL,
    session_state jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own accounts"
    ON accounts FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE groups (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    url        text NOT NULL,
    name       text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own groups"
    ON groups FOR ALL
    USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()))
    WITH CHECK (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

-- ============================================================
-- SCHEDULED POSTS
-- ============================================================
CREATE TABLE scheduled_posts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    group_ids    uuid[] NOT NULL,
    content      text NOT NULL,
    image_url    text,
    scheduled_at timestamptz NOT NULL,
    status       text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result       jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled posts"
    ON scheduled_posts FOR ALL
    USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()))
    WITH CHECK (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

-- Partial index for the cron query
CREATE INDEX idx_scheduled_posts_pending
    ON scheduled_posts(scheduled_at)
    WHERE status = 'pending';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scheduled_posts_updated_at
    BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKET for post images
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'post-images'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users read own images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'post-images'
        AND auth.uid() IS NOT NULL
    );

-- ============================================================
-- CRON JOB (requires pg_cron + pg_net extensions)
-- Uncomment and replace <project> and <service_role_key> before running.
-- ============================================================
-- SELECT cron.schedule(
--   'process-scheduled-posts',
--   '* * * * *',
--   $$SELECT net.http_post(
--     url := 'https://<project>.supabase.co/functions/v1/process-scheduled-posts',
--     headers := '{"Authorization": "Bearer <function_secret>"}'::jsonb
--   )$$
-- );
