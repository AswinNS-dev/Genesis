# Migrating CrimeIntel to Supabase

The application is architected so the migration is **configuration only** —
no application code changes. Slow, step-by-step path:

**Architecture today**

| Layer          | Local/dev                                         | Supabase (after this guide)                          |
| -------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Database       | Prisma ORM → SQLite (`backend/prisma/dev.db`)     | Prisma ORM → Supabase PostgreSQL                     |
| File storage   | Local filesystem (`public/uploads`)               | Supabase Storage bucket (`crimeintel-evidence`)      |
| Auth           | NextAuth (Credentials + JWT, users in DB)         | Unchanged (works on Postgres unchanged)              |
| Integrity      | Prototype blockchain (SHA-256 chain in DB)        | Unchanged                                            |
| RLS            | n/a                                               | Enforced (`backend/infrastructure/database/setup-supabase.sql`) |

## Step 1 — Create the Supabase project

1. Open [supabase.com](https://supabase.com/dashboard) → **New project**.
2. Choose a region; note the auto-generated DB password.
3. In **Settings → API**, copy the Project URL, `anon` (public) key and
   `service_role` key.

## Step 2 — Point Prisma at Supabase Postgres

1. Build the Prisma connection string.
   Supabase provides three hosts; use the **Session pooler** on port 5432
   for Prisma:

   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   (Replace `<ref>`, `<password>`, `<region>`. `prisma db push` can also take
   the direct host.)

2. Push the schema to Postgres (from the project root):

   ```bash
   npx prisma generate --schema backend/prisma/schema.prisma
   npx prisma db push --schema backend/prisma/schema.prisma
   ```

3. The existing Prisma schema is already Postgres-compatible (no SQLite-only
   types). `DateTime`, `String`, `enum` and `Json` fields map 1:1.

## Step 3 — Load seed data (optional)

```bash
npx tsx backend/prisma/seed.ts
```

## Step 4 — Set environment variables

Update `.env` **and** `frontend/.env`:

```ini
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_ANON_KEY="<anon-public-key>"
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"   # never exposed to the browser
SUPABASE_STORAGE_BUCKET="crimeintel-evidence"
SUPABASE_STORAGE_PUBLIC="true"
STORAGE_DRIVER="supabase"
```

Notes:
- `STORAGE_DRIVER` is **inferred automatically** when `DATABASE_URL` is a
  `postgresql://` URL, so the explicit value is only documented for clarity.
- The **service role** key is used only inside `backend/infrastructure/`.
  Nothing in `frontend/` reads it. `getSupabaseAdmin()` additionally throws
  if it is ever invoked in a browser context.

## Step 5 — Apply RLS (defense-in-depth)

The app uses the service role via Prisma (bypasses RLS). RLS is still enabled
so that anon/authenticated roles can never read or mutate data through the
Supabase data APIs:

```bash
npx supabase db execute -f backend/infrastructure/database/setup-supabase.sql
# or
psql "$DATABASE_URL" -f backend/infrastructure/database/setup-supabase.sql
```

## Step 6 — Run

```bash
npm run dev
```

New evidence uploads now hash, store in Supabase Storage, and notarize on the
chain. Integrity verification reads the file back from the storage driver
(`storageFor(location)`) and compares against the notarized hash.

## Rollback

Return `DATABASE_URL` to `file:./dev.db`, set `STORAGE_DRIVER="local"` and the
application works exactly as before on local SQLite + filesystem. Old
`uploads/...` locations still resolve via the local driver even while
Supabase is active (mixed-backend reads are supported).

## Key safety properties

- Service role key never touches the browser (`isServerSide` guard).
- Storage driver is pluggable; a single env toggle moves filesystem↔cloud.
- RLS policies are additive — they cannot disable existing functionality.
- No storage/data logic lives in the UI; everything routes through the
  backend service + infrastructure layer.