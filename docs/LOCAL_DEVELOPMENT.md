# Local development with a local Supabase stack

Run the whole backend (database, sign-in, storage, email inbox, edge functions) on your machine,
so you can test every screen with throwaway accounts without touching live data.

## One-time setup (Windows)

1. Install WSL 2: open PowerShell **as Administrator** and run `wsl --install`, then restart.
2. Install **Docker Desktop** from docker.com and start it (keep "Use WSL 2 based engine" on).
3. Check it works: `docker info` should print server details.

## Daily use

```bash
npm run local:start       # starts the stack, applies all migrations + supabase/seed.sql, writes local env files
npm run dev:local         # web app at http://localhost:5173, talking to the LOCAL stack
npm run functions:local   # edge functions (payments run in mock mode: PAYMENT_MOCK_MODE=all)
npm run local:reset       # wipe the local database and reload migrations + seed
npm run local:stop        # stop the stack
```

`npm run dev` (without `:local`) still uses the live project from `client/.env`.

| Service | URL |
|---|---|
| Web app | http://localhost:5173 |
| Supabase Studio (browse tables) | http://127.0.0.1:54323 |
| Email inbox (password reset, sign-up emails) | http://127.0.0.1:54324 |
| API | http://127.0.0.1:54321 |

## Test accounts

All use the password `zimmarket-local-dev` (local stack only; defined in `supabase/seed.sql`).

| Email | Role |
|---|---|
| admin@zimmarket.local | Platform admin (also shops as a buyer) |
| buyer@zimmarket.local | Buyer with a saved address and a shipped order |
| vendor@zimmarket.local | Verified vendor "Harare Hardware" with 8 products |
| newvendor@zimmarket.local | New unverified vendor with no products |

## Tests that need no Docker

```bash
npm run test:migrations   # replays every migration + seed into an empty Postgres
npm run test:db           # payment, escrow, refund and privilege logic (34 tests)
npm run test:rls          # row-level security as the authenticated role (9 tests)
```

## Notes

- On Docker Desktop for Windows, the storage, realtime and pg-meta containers report "unhealthy"
  even though they work (their health probe uses 127.0.0.1 inside the container). `local:start`
  therefore passes `--ignore-health-check`.
- If you ever restore `supabase/.temp/*-version` files from old commits, delete them: they pin
  outdated service images (old storage-api images fail to start).

- `supabase/migrations/20231009000000_baseline_core_tables.sql` recreates the core tables that were
  originally made in the dashboard, so a fresh database can be built. It is a no-op on the live
  project; mark it as applied there once so `db push` doesn't ask about it:
  `npx supabase migration repair --status applied 20231009000000`
- `supabase/config.toml` only configures the local stack. Don't run `supabase config push`.
