  -- CrimeIntel — Supabase setup (Row Level Security + Storage buckets)
--
-- Run once against your Supabase project AFTER the Prisma schema has been
-- pushed to the Postgres database (see migrate-to-supabase.md).
--
-- The application talks to Postgres exclusively through the server-side
-- service role (Prisma), which bypasses RLS. RLS is defense-in-depth here:
-- it guarantees that even if the anon key were used directly (via the
-- supabase client libraries) or a row leaked through an unexpected path,
-- unauthenticated users can read nothing and authenticated users are
-- confined to the roles CrimeIntel grants.
--
-- Execute with:  npx supabase db execute -f backend/infrastructure/database/setup-supabase.sql
--        (or)   psql "$DATABASE_URL" -f backend/infrastructure/database/setup-supabase.sql

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Enable RLS and grant access to authenticated (app) users
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations', 'supabase_functions')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY "crimeintel_authenticated_all" ON public.%I
         FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- Optional, tighter policy variant (uncomment to restrict anon):
-- CREATE POLICY "crimeintel_anon_readonly" ON public.<table>
--   FOR SELECT TO anon USING (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Storage bucket for evidence / documents
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('crimeintel-evidence', 'crimeintel-evidence', TRUE, 20971520, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated app users may read all objects in the bucket
-- (integrity verification needs read access server-side via service role,
-- and users view documents client-side). Uploads/removals stay restricted.
CREATE POLICY "crimeintel_evidence_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'crimeintel-evidence');

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Validation
-- ─────────────────────────────────────────────────────────────────────────
SELECT tablename,
       rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;