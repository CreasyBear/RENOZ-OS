# Auth Production Audit

**Scope:** All auth flows, rate limiting, session handling, and production readiness at scale.

**Audit date:** 2026-02-16

---

## Executive Summary

The auth system has **two separate rate-limit implementations**, **inconsistent coverage** across flows, and **scaling gaps** when running on multi-instance serverless (Vercel). Several flows lack rate limiting entirely. Documentation is partially outdated.

---

## 1. Rate Limiting: Dual Systems, Inconsistent Coverage

### Two Rate Limit Implementations

| System | Location | Backend | Used By |
|--------|----------|---------|---------|
| **Auth rate limit** | `src/lib/auth/rate-limit.ts` | Upstash Redis (or in-memory fallback) | Login, password reset, resend confirmation, API tokens, CSAT feedback |
| **Server rate limit** | `src/lib/server/rate-limit.ts` | **In-memory only** (no Redis) | Invitation lookup, invitation accept, auth confirm, portal, OAuth initiate |

### Critical: Server Rate Limit Does Not Scale

`lib/server/rate-limit.ts` uses an in-memory `Map`. On Vercel:

- Each serverless instance has its own memory
- Rate limits are **not shared** across instances
- An attacker can bypass limits by hitting different instances
- **Affected flows:** invitation accept, auth confirm, portal link request, OAuth initiate

### Rate Limit Coverage by Flow

| Flow | Rate Limited? | System | Identifier | Production-Ready? |
|------|---------------|--------|------------|-------------------|
| **Login** | ✅ | auth/rate-limit (Redis) | email | ✅ Yes |
| **Password reset** | ✅ | auth/rate-limit (Redis) | email | ✅ Yes |
| **Resend confirmation** | ✅ | auth/rate-limit (Redis) | email | ✅ Yes |
| **Sign-up** | ❌ **No** | — | — | ⚠️ Abuse risk |
| **Auth confirm** (email verify) | ✅ | server/rate-limit (in-memory) | clientId:token_hash | ⚠️ Per-instance only |
| **Invitation lookup** | ✅ | server/rate-limit (in-memory) | clientId | ⚠️ Per-instance only |
| **Invitation accept** | ✅ | server/rate-limit (in-memory) | clientId | ⚠️ Per-instance only |
| **Send invitation** | ❌ **No** | — | — | ⚠️ Authenticated abuse |
| **Change password** | ✅ | auth/rate-limit (Redis) | user id | ✅ Yes |
| **Portal link request** | ✅ | server/rate-limit (in-memory) | clientId | ⚠️ Per-instance only |
| **OAuth initiate** | ✅ | server/rate-limit (in-memory) | clientId | ⚠️ Per-instance only |

---

## 2. Client Identifier (IP) and TRUST_PROXY

Both rate limit systems use `getClientIdentifier(request)` to derive an IP for server-side limits.

**When `TRUST_PROXY` is not set or false:**

- `auth/rate-limit`: returns `"unknown-client"`
- `server/rate-limit`: returns `"default-client"`

**Effect:** All requests share a single rate-limit bucket. One user can exhaust the limit for everyone.

**When `TRUST_PROXY=true`:** Uses `x-forwarded-for` or `x-real-ip`. Vercel sets these headers.

**Action:** Ensure `TRUST_PROXY=true` in production (Vercel). Document in PRE-DEPLOYMENT-CHECKLIST.

---

## 3. Auth Flow Consistency

### Session Storage

- **Client:** `@supabase/ssr` `createBrowserClient` — cookie-based
- **Server:** `createServerSupabase` — reads cookies from request
- **Consistent:** Both use cookies; SSR and client share session state

### Auth Check Consistency (Post-Loop Fix)

| Route | Server beforeLoad | Client beforeLoad |
|-------|-------------------|-------------------|
| `/` | No redirect | `getAuthContext()` → dashboard |
| `/login` | No redirect | `getAuthContext()` → dashboard if fully authenticated |
| `/_authenticated/*` | `getUser()` gate | `getAuthContext()` full check |

**Note:** AUTH-LIFECYCLE.md still says login uses `getUser()`; it was updated to `getAuthContext()` to fix redirect loops.

### Token Exchange (Hash vs Code)

| Flow | Token Location | Handler |
|------|----------------|---------|
| Invitation | URL hash | `useExchangeHashForSession` |
| Password reset (implicit) | URL hash | `useExchangeHashForSession` |
| Password reset (PKCE) | `?code=` | `exchangeCodeForSession` in beforeLoad |
| Auth confirm | `?token_hash=` | Server `verifyOtp` |

**Consistent:** Both hash and code flows are handled.

---

## 4. Error Handling and User Feedback

| Scenario | Handling |
|----------|----------|
| Auth error in hash | `useExchangeHashForSession` → `authError` → navigate to `/auth/error` |
| Invalid/expired invitation | `AcceptInvitationInvalidView` with message |
| Rate limit exceeded | `RateLimitError` with message and retry-after |
| Email enumeration | Password reset always returns success |
| Sign-up/invite errors | Thrown and surfaced in form |

**Gap:** Sign-up has no rate limit; repeated failures could leak info via error messages.

---

## 5. Environment and Configuration

### Required for Production

| Variable | Purpose |
|----------|---------|
| `TRUST_PROXY=true` | Per-IP rate limiting for server rate limits |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limit for login, password reset |
| `APP_URL`, `VITE_APP_URL` | Redirect URLs, invite links |
| Supabase Redirect URLs | Must include `/auth/confirm`, `/update-password`, `/accept-invitation*` |

### PRE-DEPLOYMENT-CHECKLIST Inaccuracy

Checklist says: *"Login, password reset, and invitation rate limiting"* use Upstash.

**Reality:** Only login and password reset use Upstash. Invitation uses in-memory server rate limit.

---

## 6. Scalability Concerns

### In-Memory State

| Component | Scope | Scale Impact |
|-----------|-------|--------------|
| `authCache` (route-auth) | Per browser tab | Fine |
| `serverUserCache` (supabase/server) | Per serverless instance | Fine (short TTL) |
| `lib/server/rate-limit` store | Per serverless instance | **Not shared** across instances |
| `auth/rate-limit` in-memory fallback | Per instance | Same when Redis unavailable |

### Serverless Cold Starts

- Auth checks run on each request
- `getAuthContext` has 30s cache; reduces DB load
- Server `getUser()` only on protected routes; no DB for unauthenticated

---

## 7. Recommendations

### High Priority

1. **Migrate server rate limit to Redis**  
   Use Upstash (or same Redis as auth rate limit) for invitation accept, auth confirm, portal, OAuth. Unify or share the Redis client.

2. **Add sign-up rate limiting**  
   Limit by IP or email (e.g. 5 sign-ups per hour per IP) to prevent abuse and email spam.

3. **Add send-invitation rate limiting**  
   Limit per user or per org (e.g. 20 invites per hour per user) to prevent abuse by compromised accounts.

4. **Document TRUST_PROXY**  
   Add to PRE-DEPLOYMENT-CHECKLIST: `TRUST_PROXY=true` required in production behind Vercel.

### Medium Priority

5. **Fix PRE-DEPLOYMENT-CHECKLIST**  
   Correct the statement about invitation rate limiting and Upstash.

6. **Update AUTH-LIFECYCLE.md**  
   Change login route description from `getUser()` to `getAuthContext()`.

### Lower Priority

7. **Unify getClientIdentifier**  
   `auth/rate-limit` and `lib/server/rate-limit` have different fallbacks (`unknown-client` vs `default-client`). Consider a shared helper.

8. **Consider fail-open for Redis**  
   `AUTH_RATE_LIMIT_FAIL_OPEN=true` exists for login; document when it’s acceptable (e.g. Redis outages).

---

## 8. Flow Checklist (Quick Reference)

| Flow | Rate Limited | Redis | TRUST_PROXY | Redirect URLs |
|------|--------------|-------|-------------|---------------|
| Login | ✅ | ✅ | N/A (email) | — |
| Sign-up | ❌ | — | — | `/auth/confirm` |
| Auth confirm | ✅ | ❌ | ✅ | — |
| Forgot password | ✅ | ✅ | N/A (email) | `/update-password` |
| Update password | — | — | — | — |
| Invitation send | ❌ | — | — | `/accept-invitation` |
| Invitation accept | ✅ | ❌ | ✅ | — |
| Invitation lookup | ✅ | ❌ | ✅ | — |
| Change password | ✅ | ✅ | N/A (user id) | — |
| Logout | — | — | — | `/login` |

---

## References

- `src/lib/auth/rate-limit.ts` — Upstash-based rate limit
- `src/lib/server/rate-limit.ts` — In-memory rate limit
- `docs/AUTH-LIFECYCLE.md` — Auth architecture (partially outdated)
- `docs/PREMORTEM_SUPABASE_INVITES.md` — Invite flow premortem
- `PRE-DEPLOYMENT-CHECKLIST.md` — Deployment checklist
