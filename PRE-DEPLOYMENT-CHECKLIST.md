# Pre-Deployment Checklist

Run through this checklist before deploying Renoz CRM v3 to production.

---

## 1. Build & CI

- [ ] `npm run predeploy` succeeds (runs typecheck, lint, test:unit, build)
- [ ] Or run individually: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`
- [ ] GitHub Actions CI (if enabled) is green

---

## 2. Environment Variables

Ensure all required variables are set in Vercel (see `.env.example`):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Use Supabase pooler URL for serverless (`?pgbouncer=true` or pooler connection string) |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side only |
| `APP_URL` | ✅ | Production URL (e.g. `https://your-app.vercel.app`) |
| `VITE_APP_URL` | ✅ | Same as `APP_URL` |
| `RESEND_API_KEY` | Optional | For quote emails, campaigns, etc. Invitation and password reset use Supabase SMTP. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ✅ Required for auth | Login, password reset, and invitation rate limiting. Without Redis, in-memory fallback is not shared across Vercel instances. |
| `AUTH_RATE_LIMIT_FAIL_OPEN` | Do **not** set in prod | If set to `true`, bypasses rate limit when Redis errors. Default (unset) = fail-closed. |
| `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID` | Optional | For background jobs (PDFs, reports, campaigns, etc.) |

---

## 3. Database

- [ ] Migrations applied to production database: `npm run db:migrate` (run against prod `DATABASE_URL`)
- [ ] Supabase RLS policies enabled and tested
- [ ] Connection uses `sslmode=require`

---

## 4. Supabase Auth

- [ ] **Site URL** set to production URL (Supabase Dashboard → Auth → URL Configuration)
- [ ] **Redirect URLs** include:
  - `https://your-app.vercel.app/**`
  - `https://your-app.vercel.app/auth/confirm` (email confirmation)
  - `https://your-app.vercel.app/update-password` (password reset)
  - `https://your-app.vercel.app/accept-invitation` (invite flow)
  - `https://*-your-team.vercel.app/**` (for Vercel preview deployments)
- [ ] Email templates use correct `{{ .SiteURL }}` or `{{ .RedirectTo }}`

---

## 5. Integrations (if used)

| Integration | Env Vars | Status |
|-------------|----------|--------|
| Resend (email) | `RESEND_API_KEY`, `EMAIL_FROM` | [ ] |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — **required for auth rate limiting** | [ ] |
| Trigger.dev | `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID` | [ ] |
| Google OAuth | `GOOGLE_WORKSPACE_*` | [ ] |
| Microsoft 365 | `MICROSOFT365_*` | [ ] |

---

## 6. Known Gaps (from audits)

These are documented in pre-deployment audits; address or accept before go-live:

- **Reports domain**: PRD gaps (favorites UI, schedule UI, getFinancialSummaryReport) — defer or implement
- **Test coverage**: Zero integration tests documented as production readiness concern
- **Settings stubs**: Preferences, security, API tokens, targets — toast success but no persist (documented)
- **Phase 12 integrations**: Xero, Resend approval emails, AI transcription — deferred until credentials confirmed

---

## 7. Security

- [ ] No secrets in client bundle (VITE_* only for non-sensitive config)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] Search inputs use `containsPattern()` (LIKE/ILIKE injection safe) — see `@/lib/db/utils`

---

## 8. Post-Deploy Verification

- [ ] Login/signup works
- [ ] Password reset email delivers
- [ ] Core flows: create order, customer, product
- [ ] No console errors in production build

---

## References

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Vercel/GitHub deployment steps
- **Pre-deployment audits** — In monorepo: `../_misc/docs/pre_deployment_audit/` (FULL-APP-AUDIT.md, BAD-SMELLS-REPORT.md, DRIZZLE-SERVER-FUNCTIONS-AUDIT.md)
