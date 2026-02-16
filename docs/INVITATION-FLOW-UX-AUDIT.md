# Invitation Flow — Component & UX Audit

**Scope:** Send invitation → email → click link → set password → in. Focus on debt and frustration.

**Audit date:** 2026-02-16

---

## Intended Flow (What Should Happen)

1. **Admin sends invitation** → `sendInvitation` creates row, calls `inviteUserByEmail` with `redirectTo: {APP_URL}/accept-invitation?token=XXX`
2. **User gets email** → From Supabase (default or custom SMTP)
3. **User clicks link** → Supabase verifies → redirects to `https://renoz-os.vercel.app/accept-invitation?token=XXX#access_token=...&refresh_token=...`
4. **Accept-invitation page** → Exchanges hash for session, fetches invitation, shows form
5. **User fills form** → First name, last name, password, confirm password
6. **Submit** → Server sets password via admin API → client `signInWithPassword` → redirect to onboarding

**Expected URL:** `/accept-invitation?token=XXX` (not `/login`)

---

## If You're Landing on `/login` with Token

That indicates a **Supabase redirect configuration issue**, not a component bug:

- **Redirect URLs** in Supabase Dashboard must include `https://renoz-os.vercel.app/accept-invitation` and `https://renoz-os.vercel.app/accept-invitation*`
- If `redirectTo` is not allowed, Supabase may redirect to **Site URL** instead (often `/` or `/login`)
- **Fix:** Add the accept-invitation URLs to Supabase → Auth → URL Configuration → Redirect URLs

---

## Component Flow Map

```
AcceptInvitationPage
├── useExchangeHashForSession()     → Parses #access_token, setSession, clears hash
├── useInvitationByToken(token)     → Fetches invitation (public)
│
├── authError? → navigate /auth/error
│
├── pageState === 'loading'   → AcceptInvitationLoadingView ("Loading invitation details...")
├── pageState === 'invalid'   → AcceptInvitationInvalidView (token missing/expired)
├── pageState === 'ready'     → AcceptInvitationForm
├── pageState === 'submitting'→ AcceptInvitationForm (disabled, "Creating your account...")
├── pageState === 'success'   → AcceptInvitationSuccessView
└── pageState === 'error'     → AcceptInvitationForm (with error)
```

---

## UX Debt & Frustration Points

### 1. **"Creating your account..." — Misleading Copy**

**Location:** `AcceptInvitationForm` submit button

**Issue:** The account is already created by `inviteUserByEmail`. The user is setting a password and activating. The copy implies a fresh signup.

**Suggestion:** "Setting up your account..." or "Activating your account..."

---

### 2. **Success Fallback: "Sign in now" — Extra Step**

**Location:** `AcceptInvitationSuccessView` when `signInWithPassword` fails

**Issue:** If auto sign-in fails (e.g. cookie/domain mismatch, timing), the user sees "Your account has been created. Sign in with your new password to continue." and must click "Sign in now" and re-enter their password. They just set it.

**Friction:** Two-step flow when it should be one.

**Mitigation:** Ensure `signInWithPassword` succeeds (session/cookies correct). If it fails, consider passing email (or a hint) in the redirect so login can pre-fill.

---

### 3. **authError Shows Loading, Not Error**

**Location:** `AcceptInvitationPage` lines 154–156

```tsx
if (authError) {
  return <AcceptInvitationLoadingView />;
}
```

**Issue:** When hash contains an error (e.g. `#error=...`), we show "Loading invitation details..." while `useEffect` navigates to `/auth/error`. User sees a loading state instead of an error.

**Suggestion:** Show "Something went wrong. Redirecting..." or a brief error message before redirect.

---

### 4. **"Already have an account? Sign in" — Edge Case Confusion**

**Location:** `AcceptInvitationForm` footer link

**Issue:** If an invited user clicks this (e.g. they think they have an account), they go to `/login` with `redirect=/accept-invitation?token=XXX`. After sign-in they return to accept-invitation. If their existing account is for a different org, the accept flow may fail or behave oddly.

**Debt:** The "already have account" path is under-specified. Most invitees are new; this link is for rare cases.

---

### 5. **Invalid View: "Back to home" → Login**

**Location:** `AcceptInvitationInvalidView`

**Issue:** "Back to home" links to `/`. For unauthenticated users, `/` redirects to `/login`. So "home" is effectively "login." The label is misleading.

**Suggestion:** "Go to sign in" or remove if "Go to Sign in" already covers it.

---

### 6. **Loading State: Single Message for Two Operations**

**Location:** `AcceptInvitationLoadingView`

**Issue:** Loading can mean (a) exchanging hash for session, or (b) fetching invitation. The message is "Loading invitation details..." which only describes (b).

**Debt:** Minor. A generic "Loading..." or "Setting up..." would cover both.

---

### 7. **No Explicit "Set Password" Framing**

**Issue:** The form is "Accept your invitation" with fields for name + password. Some users expect a dedicated "Set your password" step. The current form bundles everything.

**Assessment:** Acceptable for a single-step flow. Headline "Accept your invitation" is clear. "Create Password" label on the field helps.

---

### 8. **Success Redirect: Onboarding vs Dashboard**

**Location:** `AcceptInvitationSuccessView`

```tsx
if (redirectTarget === 'dashboard') {
  navigate({ to: '/onboarding', replace: true });
}
```

**Issue:** Variable is `redirectTarget` but we navigate to `/onboarding`, not `/dashboard`. Naming is inconsistent.

**Debt:** Rename to `redirectTarget: 'onboarding' | 'login'` or document that "dashboard" means "post-login flow starting at onboarding."

---

## Flow Checklist (Quick Reference)

| Step | Component | User Sees |
|------|-----------|-----------|
| Click email link | — | Browser navigates |
| Land on accept-invitation | AcceptInvitationPage | Loading → Form or Invalid |
| Hash exchange | useExchangeHashForSession | (Background) |
| Fetch invitation | useInvitationByToken | Loading "Loading invitation details..." |
| Fill form | AcceptInvitationForm | Email (disabled), name, password |
| Submit | acceptInvitation + signInWithPassword | "Creating your account..." |
| Success (sign-in ok) | AcceptInvitationSuccessView | "Welcome aboard!" → redirect /onboarding |
| Success (sign-in fail) | AcceptInvitationSuccessView | "Sign in now" button |
| Invalid token | AcceptInvitationInvalidView | "Invalid Invitation" + recovery options |

---

## Recommendations (Priority)

1. **Fix Supabase redirect config** if users land on `/login` instead of `/accept-invitation`.
2. **Adjust authError UI** — show an error or "Redirecting..." instead of loading.
3. **Update button copy** — "Setting up your account..." instead of "Creating your account...".
4. **Clarify success fallback** — when "Sign in now" is shown, consider pre-filling email or adding a short explanation.
5. **Tidy invalid view** — rename or remove "Back to home" if it effectively goes to login.

---

## References

- `src/routes/accept-invitation.tsx`
- `src/components/auth/accept-invitation-form.tsx`
- `src/components/auth/accept-invitation-success.tsx`
- `src/components/auth/accept-invitation-invalid.tsx`
- `src/lib/auth/use-exchange-hash-for-session.ts`
- `docs/PREMORTEM_SUPABASE_INVITES.md`
