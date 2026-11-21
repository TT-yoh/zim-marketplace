// Replays every migration, in order, into an empty Postgres (PGlite) to prove a fresh database
// (e.g. `npx supabase start` for local development) can be built from the repo alone.
// Supabase's own auth/storage schemas are stubbed; pg_cron (036) is skipped as PGlite lacks it.
// Run: npm run test:migrations
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const SKIP = new Set(['20231010000036_schedule_stale_order_expiry.sql']);

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE supabase_storage_admin;
  CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
  CREATE PUBLICATION supabase_realtime;
  CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, created_at timestamptz default now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  CREATE TABLE storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, owner_id text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
`);

let failed = null;
for (const f of files) {
  if (SKIP.has(f)) { console.log('skip ', f); continue; }
  try {
    await db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log('ok   ', f);
  } catch (e) {
    console.log('FAIL ', f, '->', e.message.split('\n')[0]);
    failed = f;
    break;
  }
}

if (!failed) {
  const tables = (await db.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = 'public'`)).rows[0].n;
  console.log(`\nAll ${files.length - SKIP.size} migrations applied; ${tables} public tables.`);

  // Local seed data (supabase/seed.sql) must load on top of the migrations.
  // pgcrypto isn't in PGlite, so stand in a fake crypt(); real Supabase uses extensions.crypt.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS auth.identities (id uuid, provider_id text, user_id uuid, identity_data jsonb, provider text,
      created_at timestamptz, updated_at timestamptz, last_sign_in_at timestamptz);
    ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS instance_id uuid, ADD COLUMN IF NOT EXISTS aud text, ADD COLUMN IF NOT EXISTS role text,
      ADD COLUMN IF NOT EXISTS encrypted_password text, ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
      ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb, ADD COLUMN IF NOT EXISTS updated_at timestamptz,
      ADD COLUMN IF NOT EXISTS confirmation_token text, ADD COLUMN IF NOT EXISTS recovery_token text,
      ADD COLUMN IF NOT EXISTS email_change_token_new text, ADD COLUMN IF NOT EXISTS email_change text;
    CREATE FUNCTION extensions.gen_salt(text) RETURNS text LANGUAGE sql AS $$ SELECT 'salt' $$;
    CREATE FUNCTION extensions.crypt(text, text) RETURNS text LANGUAGE sql AS $$ SELECT 'hash' $$;
  `);
  try {
    await db.exec(fs.readFileSync(path.join(dir, '..', 'seed.sql'), 'utf8'));
    const s = (await db.query(`SELECT
      (SELECT count(*)::int FROM auth.users) users,
      (SELECT count(*)::int FROM public.products) products,
      (SELECT status FROM public.orders LIMIT 1) order_status,
      (SELECT total_amount_cents FROM public.orders LIMIT 1) order_total,
      (SELECT string_agg(status, ',' ORDER BY status) FROM public.order_items) item_statuses,
      (SELECT escrow_balance_cents FROM public.vendor_balances LIMIT 1) escrow,
      (SELECT is_verified FROM public.vendor_profiles WHERE store_slug = 'harare-hardware') vendor_verified`)).rows[0];
    console.log('seed ok', JSON.stringify(s));
  } catch (e) {
    console.log('FAIL  seed.sql ->', e.message.split('\n')[0]);
    failed = 'seed.sql';
  }
}
process.exit(failed ? 1 : 0);
