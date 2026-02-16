# Deployment Guide: Renoz CRM to Vercel & GitHub

This guide covers deploying Renoz CRM v3 to Vercel with GitHub integration.

> **Before deploying:** Run through [PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md) — build, env vars, database migrations, Supabase auth, and known gaps.

> **Repo structure**: This deployment setup assumes renoz-v3 is the root of your GitHub repository. If renoz-v3 lives inside a monorepo, set **Root Directory** to `renoz-v3` in Vercel Project Settings.

## Prerequisites

- GitHub repository
- Vercel account
- Supabase project
- Environment variables (see `.env.example`)

---

## Option A: Vercel GitHub Integration (Recommended)

The simplest approach: connect your repo to Vercel and let it auto-deploy on every push.

> **Note**: If using Option A, disable the GitHub Actions deploy workflow to avoid duplicate deployments: rename `.github/workflows/deploy-vercel.yml` to `deploy-vercel.yml.disabled` or delete it.

### 1. Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository (the renoz-v3 root)
3. Vercel will auto-detect TanStack Start

### 2. Configure Environment Variables

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
- `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID` for background jobs (invitation emails, PDFs, etc.)

### 3. Deploy

Push to `main` – Vercel will build and deploy automatically. Preview deployments are created for pull requests.

---

## Option B: GitHub Actions Deploy

Use this if you prefer deploying via CI (e.g. to run custom steps before deploy). **Do not use both Option A and B** – choose one to avoid duplicate deployments.

### 1. Link Vercel Project

```bash
npx vercel link
```

Follow prompts to link to your Vercel project/team.

### 2. Add GitHub Secrets

In your repo: Settings → Secrets and variables → Actions. Add:

| Secret | Description |
|--------|-------------|
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link`, or Vercel dashboard |
| `VERCEL_PROJECT_ID` | Same |
| `VERCEL_TOKEN` | [Vercel → Settings → Tokens](https://vercel.com/account/tokens) |

### 3. Configure Vercel Environment

Ensure all env vars are set in Vercel (Project Settings → Environment Variables). The deploy workflow uses `vercel pull` to fetch them during build.

### 4. Deploy

Push to `main`. The workflow runs:
1. **CI** (lint, typecheck, tests) – on every push and pull request
2. **Deploy** – on push to `main`

---

## Database Migrations

Before first deploy (or after schema changes), run migrations against your production database:

```bash
DATABASE_URL="your-production-connection-string" npm run db:migrate
```

Use the Supabase connection pooler URL for serverless (recommended for Vercel).

---

## Supabase Redirect URLs

For auth (OAuth, magic links, password reset) to work in production:

1. Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your production URL (e.g. `https://your-app.vercel.app`)
3. Add **Redirect URLs**:
   - `https://your-app.vercel.app/**`
   - `https://*-your-team.vercel.app/**` (for preview deployments)

---

## Build Configuration

- **Framework**: TanStack Start (auto-detected by Vercel)
- **Build command**: `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
- **Output**: Handled by TanStack Start / Nitro (`.output`)

The `vercel.json` in this directory adds:
- `trailingSlash: false` – prevents `/login` ↔ `/login/` redirect loops (307)
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Increased Node memory for large builds

---

## Rollout Guardrails and Rollback

### Release Gates
- **Gate A (pre-deploy):** `bun test tests/unit/routes tests/unit/auth` and `npm run build:vercel` must pass.
- **Gate B (post-deploy):** `npm run deploy:probe` runs 20 login probes and asset URL checks. Fails if any 307 loop or chunk 404 is detected.

### Deploy with Guards
```bash
npm run deploy:prod
```
Runs tests, build, deploy, then post-deploy probe. Use `--skip-probe` to skip Gate B:
```bash
node scripts/deploy-with-guards.mjs --skip-probe
```

### Probe Only (after manual deploy)
```bash
APP_URL=https://renoz-os.vercel.app npm run deploy:probe
```

### Rollback
If Gate B fails or users report redirect/chunk issues:
1. Identify last known-good deployment (Vercel dashboard or `vercel list`).
2. Redeploy that commit:
   ```bash
   git checkout <last-good-commit>
   npm run build:vercel
   npx vercel deploy --prebuilt --prod
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
   "buildCommand": "NODE_OPTIONS=--max-old-space-size=14336 npm run build:vercel"
   ```

2. **Build locally and deploy prebuilt** (works on any plan):
   ```bash
   NODE_OPTIONS=--max-old-space-size=12288 npm run build:vercel
   vercel deploy --prebuilt --prod
   ```
   Your machine's RAM is used instead of Vercel's 8GB limit.

### ERR_TOO_MANY_REDIRECTS / 307 login redirect loop
Usually caused by URL or auth config mismatch.

**0. Trailing slash** – `vercel.json` sets `trailingSlash: false` to prevent `/login` ↔ `/login/` redirect loops. If you see repeated 307 redirects from login to login, ensure this is set.

**1. Vercel env vars** – Must match your actual domain exactly:
- `APP_URL` = `https://renoz-os.vercel.app` (no trailing slash)
- `VITE_APP_URL` = same as `APP_URL`

**2. Supabase URL Configuration** – Authentication → URL Configuration:
- **Site URL** = `https://renoz-os.vercel.app`
- **Redirect URLs** = `https://renoz-os.vercel.app/**`

**3. Clear cookies** – Delete cookies for `renoz-os.vercel.app` and try again, or use an incognito window.

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
