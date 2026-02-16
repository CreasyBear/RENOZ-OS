# Auth Lifecycle Architecture

> Intended architecture for TanStack Start + Supabase SSR auth.
> Last verified: 2026-02-14

---

## How Supabase Auth Works

Supabase issues two tokens when a user authenticates:

- **Access token** (JWT) -- short-lived (default 1 hour). Sent with every API request.
- **Refresh token** -- long-lived, single-use. Exchanged once for a new access + refresh pair.

Together they form a **session**, stored in the `auth.sessions` table.

### Storage: PKCE + Cookies

This app uses `@supabase/ssr` which defaults to the **PKCE flow** with **cookie-based storage**. Tokens live in cookies, not localStorage. This means both server and client can read session state -- critical for SSR.

- Client: `createBrowserClient` from `@supabase/ssr` (`src/lib/supabase/client.ts`)
- Server: `createServerSupabase` reads cookies from the request (`src/lib/supabase/server.ts`)

### Auth Events

The Supabase client emits events via `onAuthStateChange`. The app subscribes in two places:

| Event | Meaning | Handler |
|-------|---------|---------|
| `SIGNED_IN` | Session established | Update TanStack Query cache (`hooks.ts`) |
| `SIGNED_OUT` | Session destroyed | Invalidate auth cache, clear all queries |
| `TOKEN_REFRESHED` | Access token renewed | Invalidate auth cache (force re-validate) |
| `USER_UPDATED` | Profile or password changed | Update query cache |
| `PASSWORD_RECOVERY` | User landed via reset link | Invalidate auth cache (route + query sync) |

**Subscribers:**
- `src/lib/auth/route-auth.ts` -- listens for `SIGNED_OUT`, `TOKEN_REFRESHED`, and `PASSWORD_RECOVERY` to invalidate the auth cache
- `src/lib/auth/hooks.ts` -- registers a single query-sync listener for auth events and clears query cache on sign-out

### Session Termination

A session ends when:
- User signs out
- Password is changed
- Inactivity timeout (if configured in Supabase dashboard)
- Max session lifetime reached (if configured)

Reference: [Supabase Session Docs](https://supabase.com/docs/guides/auth/sessions)

---

## Auth Flows

### Signup

```
SignUpForm --> supabase.auth.signUp (emailRedirectTo: /auth/confirm)
         --> Email sent with confirmation link
         --> User clicks link --> /auth/confirm?token_hash=...&type=signup
         --> Server: verifyOtp --> completeSignup (create org + user) --> redirect /
         --> / --> getAuthContext --> /dashboard
```

**Key files:**
- `src/components/auth/sign-up-form.tsx` -- form UI, calls `signUp` with user metadata (name, org name)
- `src/routes/auth/confirm.ts` -- route loader, calls server function
- `src/server/functions/auth/confirm.ts` -- `verifyOtp`, then `completeSignup` (creates organization + user record in a transaction)

**Architecture notes:**
- Signup metadata (`name`, `organization_name`) is passed via `options.data` and stored in `user_metadata`
- `completeSignup` is idempotent -- checks for existing user before creating
- On failure, redirects to `/auth/error` with an error code

### Login

```
LoginForm --> supabase.auth.signInWithPassword
         --> runLogin: query users table (status, org, role)
         --> Valid? navigate to dashboard
         --> Invalid user / not active? signOut, show error
```

**Key files:**
- `src/components/auth/login-form.tsx` -- `signInWithPassword` then `runLogin` (validates against `users` table)
- `src/routes/login.tsx` -- `beforeLoad` checks if already authenticated; redirects to dashboard if so

**Intended pattern for login route `beforeLoad`:**
- Server (`typeof window === 'undefined'`): no redirect -- avoid SSR redirect loops
- Client with `reason` param (`invalid_user`, `session_expired`, etc.): stay on login, show message
- Client without reason: check `getUser()` -- if authenticated, redirect to post-login target

**Why `getUser()` and not `getAuthContext()` on the login route:**
The login route only needs to know "does a Supabase session exist?" to bounce already-authenticated users. The full `getAuthContext` check (users table, active status) happens inside the login form's `runLogin` and in `_authenticated.beforeLoad`. This keeps the login page fast and avoids unnecessary DB queries for unauthenticated visitors.

### Session Persistence and Refresh

```
Browser tab open --> @supabase/ssr auto-refreshes before token expiry
                --> TOKEN_REFRESHED event --> invalidateAuthCache()
                --> Next route navigation uses fresh session
```

**Key files:**
- `src/lib/auth/route-auth.ts` -- `getAuthContext` with 30-second cache, retry logic, auth state listener
- `src/lib/auth/hooks.ts` -- TanStack Query hooks (`useSession`, `useUser`, `useAuth`) subscribe to auth events

**Architecture:**
- `getAuthContext` is the **canonical auth check** for protected routes. It:
  1. Checks cache (30s TTL, 5min offline)
  2. Calls `supabase.auth.getUser()` (validates JWT with Supabase server)
  3. Queries `users` table (checks app-level status, org, role)
  4. Returns `{ user, appUser }` or throws redirect to login
- Auth cache is invalidated on `SIGNED_OUT` and `TOKEN_REFRESHED`
- Network errors get retried (up to 2 attempts with exponential backoff)
- Non-retryable errors (invalid refresh token, JWT errors) trigger sign-out + redirect

### Protected Routes

```
_authenticated.beforeLoad:
  Server: getUser() only -- lightweight, avoids DB call during SSR
  Client: getAuthContext() -- full check (Supabase user + users table + active status)
```

**Key file:** `src/routes/_authenticated.tsx`

**Intended pattern:**
- **Server-side `beforeLoad`**: Call `getUser()` only. The server check is a fast gate -- if there's no Supabase session at all, redirect to login immediately. This avoids hitting the database on every SSR request. The full `getAuthContext` check runs client-side after hydration.
- **Client-side `beforeLoad`**: Call `getAuthContext()`. This validates the user exists in the `users` table, is active, and has an organization. If the check fails, the user is signed out and redirected with a reason.

**Why the asymmetry is intentional:**
- Server SSR runs for every page load. Making a DB call on every request adds latency.
- The client check runs once per navigation and is cached for 30 seconds.
- If a user is deactivated, they'll be caught on the next client-side navigation (within 30s of the cache expiring).

### Logout

```
useSignOut mutation --> supabase.auth.signOut()
                   --> invalidateAuthCache()
                   --> queryClient.clear()
                   --> Navigate to /login
```

**Key files:**
- `src/lib/auth/hooks.ts` -- `useSignOut` mutation
- `src/components/layout/user-menu.tsx`, `src/components/layout/sidebar.tsx` -- trigger logout
- `src/routes/logout.tsx` -- standalone route for direct `/logout` visits

### Password Reset

```
ForgotPasswordForm --> requestPasswordReset (server function)
                   --> supabase.auth.resetPasswordForEmail (redirectTo: /update-password)
                   --> Email with reset link
                   --> User clicks link --> /update-password (PKCE: code exchanged by @supabase/ssr or explicit fallback exchange)
                   --> ResetPasswordForm --> supabase.auth.updateUser({ password })
                   --> Navigate to /dashboard
```

**Key files:**
- `src/server/functions/auth/password-reset.ts` -- rate-limited server function
- `src/routes/forgot-password.tsx` -- form page
- `src/routes/update-password.tsx` -- renders `ResetPasswordForm` and performs fallback `exchangeCodeForSession` when `code` is present
- `src/routes/reset-password.tsx` -- redirects to `/update-password` (legacy URL support)
- `src/components/auth/reset-password-form.tsx` -- calls `updateUser` with password+confirm validation and strength feedback

**Architecture notes:**
- Password reset is rate-limited server-side per email
- Always returns success to prevent email enumeration
- The reset link uses PKCE (code in query) or implicit flow (hash). `beforeLoad` exchanges code; `useExchangeHashForSession` exchanges hash
- After password update, the user has an active session and navigates directly to dashboard

### Invitation

```
Supabase invite email --> User clicks link --> Supabase verify
  --> redirect to /accept-invitation?token=...#access_token=...&refresh_token=...
  --> useExchangeHashForSession (setSession from hash, remove hash from URL)
  --> User sets name + password
  --> acceptInvitation server fn (updateUserById sets password, marks accepted)
  --> signInWithPassword --> redirect to /dashboard
```

**Key files:**
- `src/routes/accept-invitation.tsx` -- route with token validation, useExchangeHashForSession
- `src/lib/auth/use-exchange-hash-for-session.ts` -- shared hook for hash exchange
- `src/components/auth/accept-invitation-form.tsx` -- form UI

---

## Route Auth Matrix

| Route | Server `beforeLoad` | Client `beforeLoad` | Notes |
|-------|--------------------|--------------------|-------|
| `/` (index) | No redirect | `?code=` → /update-password; else `getAuthContext()` → dashboard | `?code=` redirect client-only (307 loop prevention) |
| `/login` | No redirect | `getUser()` bounce if authenticated | `ssr: false` |
| `/_authenticated/*` | `getUser()` gate | `getAuthContext()` full check | Intentional asymmetry (see above) |
| `/auth/confirm` | `verifyOtp` + `completeSignup` | N/A (server loader) | |
| `/update-password` | N/A (`ssr: false`) | `exchangeCodeForSession(code)` + `useExchangeHashForSession` | Auth callback route; client-only |
| `/forgot-password` | None | None | Public page |
| `/sign-up` | None | None | `ssr: false` |
| `/accept-invitation` | N/A (`ssr: false`) | Token validation, useExchangeHashForSession | Auth callback route; client-only |
| `/logout` | None | `signOut` | Standalone logout |

---

## Error Handling

### Redirect Reasons

When `getAuthContext` fails, it redirects to `/login` with a `reason` param:

| Reason | Trigger | Behavior |
|--------|---------|----------|
| `invalid_user` | User exists in Supabase but not in `users` table, or status is not `active` | Sign out first, then redirect |
| `session_expired` | Invalid refresh token, JWT errors | Sign out first, then redirect |
| `offline` | `navigator.onLine` is false and no valid cached context | Redirect only |
| `auth_check_failed` | Transient errors (network, 500s) after retries exhausted | Redirect only |

### Auth Error Page

`/auth/error?error=<code>` displays a user-friendly message. Used when email confirmation or signup completion fails.

### Loop Prevention

- `route-policy.ts` defines `DISALLOW_REDIRECT_PATHS` -- login, sign-up, forgot-password, etc. are never set as `redirect=` targets
- Server-side `beforeLoad` on `/` and `/login` never issues redirects (prevents SSR normalization loops)
- `getAuthContext` signs out before redirecting on terminal errors (breaks auth/users table mismatch loops)

### Auth Callback Redirect Pattern (307 Loop Prevention)

When Supabase redirects after verify (password reset, signup, invite), the user may land on `/?code=` or `/update-password?code=` or `/accept-invitation?token=...#hash`. SSR path normalization can make `/update-password` requests appear as `/` to the router, causing the index route to run and redirect to `/update-password` → 307 loop.

**Rules:**
1. **Index `/?code=` redirect**: Client-only (`typeof window !== 'undefined'`). Never redirect on server.
2. **Auth callback routes** (`/update-password`, `/accept-invitation`): Use `ssr: false` so beforeLoad and component never run on server. Client has correct URL; avoids path normalization issues.
3. **Login**: Already `ssr: false`; beforeLoad returns early on server.
4. **getAppUrl()**: Strip trailing slash so `redirectTo` matches Supabase allow list (avoids fallback to Site URL).

---

## File Map

```
src/lib/
  auth/
    route-auth.ts      -- getAuthContext, auth cache, retry logic, auth state listener
    route-policy.ts    -- redirect targets, loop prevention, DISALLOW_REDIRECT_PATHS
    hooks.ts           -- useSession, useUser, useAuth, useSignIn, useSignUp, useSignOut
    use-exchange-hash-for-session.ts -- setSession from URL hash (invite, password reset)
    error-codes.ts     -- auth error code mapping
    redirects.ts       -- sanitizeInternalRedirect
    rate-limit.ts      -- password reset rate limiting
  supabase/
    client.ts          -- createBrowserClient, onAuthStateChange, getCurrentUser, getSession
    server.ts          -- createServerSupabase (cookie-based)
    index.ts           -- re-exports

src/routes/
    index.tsx          -- root redirect (getAuthContext)
    login.tsx          -- login page (getUser bounce)
    logout.tsx         -- standalone signOut
    sign-up.tsx        -- signup form
    forgot-password.tsx
    reset-password.tsx -- redirects to update-password
    update-password.tsx -- ResetPasswordForm, useExchangeHashForSession
    accept-invitation.tsx
    _authenticated.tsx -- protected layout (server: getUser, client: getAuthContext)
    auth/
      confirm.ts       -- email verification + completeSignup
      error.tsx        -- error display

src/server/functions/auth/
    confirm.ts         -- verifyOtp, completeSignup (org + user creation)
    password-reset.ts  -- rate-limited resetPasswordForEmail

src/components/auth/
    login-form.tsx         -- signInWithPassword + runLogin
    sign-up-form.tsx       -- signUp with metadata
    reset-password-form.tsx
    accept-invitation-form.tsx
    forgot-password-form.tsx
    auth-layout.tsx
    auth-error-boundary.tsx
    sign-up-success-card.tsx
```

---

## References

- [Supabase Auth Overview](https://supabase.com/docs/guides/auth)
- [Supabase Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side)
- [Supabase SSR Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [TanStack Router Authenticated Routes](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes/)
- [Supabase UI for TanStack Start](https://supabase.com/ui/docs/tanstack/client)
