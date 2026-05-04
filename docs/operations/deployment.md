# Deployment Guide: Renoz CRM to Vercel via GitHub Actions

> **Before deploying:** Run through [pre-deployment-checklist.md](./pre-deployment-checklist.md) — build, env vars, database migrations, Supabase auth, and known gaps.

> **Canonical release path:** merge into `main` → GitHub Actions runs the canonical checks → GitHub Actions deploys with Vercel CLI → post-deploy probe verifies production.

> **Repo structure:** This deployment setup assumes `renoz-v3` is the root of your GitHub repository. If it lives inside a monorepo, set **Root Directory** to `renoz-v3` in Vercel Project Settings.

## Prerequisites

- GitHub repository
- Vercel account
- Supabase project
- Environment variables (see `.env.example`)

---

## 1. Create and Link the Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Confirm the project root and framework settings
4. Keep GitHub Actions as the only canonical deploy path for production

## 2. Configure Environment Variables

In Vercel Project Settings → Environment Variables, add all variables from `.env.example`:

**Required (minimum for deployment):**
- `DATABASE_URL` – Supabase Postgres connection string
- `VITE_SUPABASE_URL` – Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` – Supabase service role key
- `APP_URL` – Production URL (e.g. `https://your-app.vercel.app`)
- `VITE_APP_URL` – Same as `APP_URL` (used by client)

**For preview deployments**, Vercel provides `VERCEL_URL`. You can set:
- `APP_URL` = `https://$VERCEL_URL` (or your production domain)
- `VITE_APP_URL` = same

**Optional (add as needed):**
- `RESEND_API_KEY`, `EMAIL_FROM`, etc. for email
- `UPSTASH_REDIS_*` for rate limiting
- `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID` for background jobs (PDFs, reports, campaigns, etc.)
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI`, `XERO_WEBHOOK_SECRET`, `XERO_WEBHOOKS_ENABLED` for Xero

**Xero note:**
- Xero runtime auth is organization-scoped OAuth now, not global `XERO_ACCESS_TOKEN` / `XERO_TENANT_ID`
- env vars above configure the app-level OAuth client and webhook verification only
- see [xero-integration.md](./xero-integration.md) for setup and operational details

## 3. Link the CLI to the Vercel Project

```bash
bun x vercel link
```

Follow prompts to link to your Vercel project/team.

## 4. Add GitHub Secrets and Variables

In your repo: Settings → Secrets and variables → Actions. Add:

| Secret | Description |
|--------|-------------|
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link`, or Vercel dashboard |
| `VERCEL_PROJECT_ID` | Same |
| `VERCEL_TOKEN` | [Vercel → Settings → Tokens](https://vercel.com/account/tokens) |
| `DATABASE_URL` | Optional but recommended if you want document schema gates to run in deploy workflow |

Add this repository variable:

| Variable | Description |
|----------|-------------|
| `APP_URL` | Canonical production URL used by the post-deploy probe and release docs |

## 5. Configure the Vercel Environment

Ensure all env vars are set in Vercel (Project Settings → Environment Variables). The deploy workflow uses `vercel pull` to fetch them during build.

## 6. Deploy Flow

Merge into `main`. The workflows run:
1. **CI** (lint, typecheck, tests) – on every push and pull request
2. **Deploy** – on push to `main`
3. **Post-deploy probe** – against `APP_URL`

For local release verification before merging:

```bash
bun run predeploy
bun run release:verify
```

---

## Database Migrations

Before first deploy (or after schema changes), run migrations against your production database:

```bash
DATABASE_URL="your-production-connection-string" bun run db:migrate
```

Use the Supabase connection pooler URL for serverless (recommended for Vercel).

For the Xero hardening rollout, deploy database changes before app code so `customers.xero_contact_id`,
`xero_payment_events`, its RLS policies, and the single-active-Xero-connection index all exist before the
runtime starts using them.

For drifted production environments, do not blindly run both the Drizzle migration and the Supabase
reconciliation script. Use one authoritative path:

1. For normal Drizzle-managed environments, run `bun run db:migrate`.
2. For already-drifted production environments that missed prior Xero/customer changes, run the
   guarded reconciliation SQL in `supabase/migrations/0024_reconcile_purchase_order_xero_drift.sql`
   first, verify the schema and data preflight checks below, then realign your migration bookkeeping
   before future Drizzle migrations.

Preflight before applying the new active-Xero unique indexes:

```sql
SELECT organization_id, COUNT(*)
FROM oauth_connections
WHERE is_active = true
  AND provider = 'xero'
  AND service_type = 'accounting'
GROUP BY organization_id
HAVING COUNT(*) > 1;

SELECT external_account_id, COUNT(*)
FROM oauth_connections
WHERE is_active = true
  AND provider = 'xero'
  AND service_type = 'accounting'
  AND external_account_id IS NOT NULL
GROUP BY external_account_id
HAVING COUNT(*) > 1;
```

Both queries must return zero rows before applying the index-creating migration.

Preflight before enabling invoice sync for existing customers:

```sql
SELECT id, name, email
FROM customers
WHERE deleted_at IS NULL
  AND xero_contact_id IS NULL;
```

Any customer that needs invoice sync must have `xero_contact_id` backfilled before operators expect
invoice sync to succeed.

---

## Supabase Redirect URLs

For auth (OAuth, magic links, password reset, invitations) to work in production:

1. Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your production URL (e.g. `https://your-app.vercel.app`) — no trailing slash
3. Add **Redirect URLs** (must include all callback paths used by the app):

| Path | Used by |
|------|---------|
| `https://your-app.vercel.app/` | Root fallback when Supabase redirects with `?code=` |
| `https://your-app.vercel.app/update-password` | Password reset (PKCE flow) |
| `https://your-app.vercel.app/accept-invitation` | Invitation acceptance (query params added by app) |
| `https://your-app.vercel.app/auth/error` | Auth error page (error params added by app) |

**Recommended pattern** (covers all paths and query params):
- `https://your-app.vercel.app/**`
- `https://*-your-team.vercel.app/**` (for Vercel preview deployments)

**Verification**: After deploy, test: forgot password → email link → update password. If you land on `/` with `?code=`, the root redirect to `/update-password` is a fallback; prefer adding `/update-password` explicitly to Supabase Redirect URLs.

---

## Build Configuration

- **Framework**: TanStack Start (auto-detected by Vercel)
- **Install command**: `bun install --frozen-lockfile`
- **Build command**: `NODE_OPTIONS=--max-old-space-size=12288 bun run build:vercel`
- **Output**: Handled by TanStack Start / Nitro (`.output`)

The `vercel.json` in this directory adds:
- `trailingSlash: false` – prevents `/login` ↔ `/login/` redirect loops (307)
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Increased Node memory for large builds

---

## Rollout Guardrails and Rollback

### Release Gates
- **Canonical PR gate:** `bun run predeploy`
- **Stable release gate:** `bun run release:verify`
- **Optional document schema gate:** `bun run reliability:document-gates` when `DATABASE_URL` is available
- **Post-deploy probe:** `bun run deploy:probe` runs login probes and asset URL checks. Fails if redirect loops or chunk 404s are detected.

### Deploy with Guards
```bash
bun run deploy:prod
```
Runs tests, build, deploy, then post-deploy probe. Use `--skip-probe` to skip Gate B:
```bash
node scripts/deploy-with-guards.mjs --skip-probe
```

### Probe Only (after manual deploy)
```bash
APP_URL=https://your-app.vercel.app bun run deploy:probe
```

### Rollback
If Gate B fails or users report redirect/chunk issues:
1. Identify last known-good deployment (Vercel dashboard or `vercel list`).
2. Redeploy that commit:
   ```bash
   git checkout <last-good-commit>
   bun run build:vercel
   bun x vercel deploy --prebuilt --prod
   ```
3. Or use Vercel dashboard: Deployments → select prior deployment → Promote to Production.

---

## Troubleshooting

### 500: Missing VITE_SUPABASE_URL environment variable
The app throws this at runtime when Supabase env vars are not set in Vercel.

**Fix:** Add these in Vercel → Project → Settings → Environment Variables:
- `VITE_SUPABASE_URL` – Supabase project URL (e.g. `https://xxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` – Supabase anon/public key

Apply to **Production**, **Preview**, and **Development**. Then **redeploy** — Vite inlines these at build time, so a new build is required.

### Build fails with OOM (heap limit)
The build uses 12GB Node memory. If it still fails:

1. **Enable Enhanced Builds** (Pro/Enterprise): Project Settings → General → Build & Development Settings → enable "On-Demand Enhanced Builds" (16GB memory). Then increase in `vercel.json`:
   ```json
   "buildCommand": "NODE_OPTIONS=--max-old-space-size=14336 bun run build:vercel"
   ```

2. **Build locally and deploy prebuilt** (works on any plan):
   ```bash
   NODE_OPTIONS=--max-old-space-size=12288 bun run build:vercel
   bun x vercel deploy --prebuilt --prod
   ```
   Your machine's RAM is used instead of Vercel's 8GB limit.

### ERR_TOO_MANY_REDIRECTS / 307 login redirect loop
Usually caused by URL or auth config mismatch.

**0. Trailing slash** – `vercel.json` sets `trailingSlash: false` to prevent `/login` ↔ `/login/` redirect loops. If you see repeated 307 redirects from login to login, ensure this is set.

**1. Vercel env vars** – Must match your actual domain exactly:
- `APP_URL` = `https://your-app.vercel.app` (no trailing slash)
- `VITE_APP_URL` = same as `APP_URL`

**2. Supabase URL Configuration** – Authentication → URL Configuration:
- **Site URL** = your production `APP_URL`
- **Redirect URLs** = your production `APP_URL/**`

**3. Clear cookies** – Delete cookies for your production domain and try again, or use an incognito window.

**4. No www vs non-www mismatch** – If you use a custom domain, ensure `APP_URL` matches the exact URL (www or non-www) users visit.

### Auth redirects to localhost
- Ensure `APP_URL` and `VITE_APP_URL` are set in Vercel
- For previews, consider: `APP_URL=https://${VERCEL_URL}` (Vercel injects `VERCEL_URL`)

### Database connection errors
- Use Supabase connection pooler URL for serverless: `?pgbouncer=true` or the pooler connection string
- Ensure `DATABASE_URL` uses `sslmode=require`

---

## Production Considerations

### Redis-backed features

The following use Redis (Upstash) when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, with in-memory fallback when Redis is unavailable:

| Location | What |
|----------|------|
| `src/server/functions/products/product-search.ts` | Search analytics (term counts) – uses `@/lib/server/search-analytics` |
| `src/server/functions/customers/csat-responses.ts` | Rate limiting for public feedback – uses `checkCsatFeedbackRateLimit` from `@/lib/auth/rate-limit` |

For production scale across multiple serverless instances, ensure Redis is configured.
