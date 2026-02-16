# Premortem: Supabase Auth Invite Flow

**Scope:** User invitations via `inviteUserByEmail` — single send, batch send, resend.

**Audit date:** 2026-02-16

---

## Flow Overview

1. **Send:** Create `user_invitations` row → `inviteUserByEmail(email, { redirectTo, data })` → Supabase creates auth user (if new) + sends email → Create `users` row (app user).
2. **Accept:** User clicks link → Supabase verify → redirect to `/accept-invitation?token=...#access_token=...&refresh_token=...` → Page exchanges hash for session via `setSession` → User sets name+password → `acceptInvitation` activates account (server sets password via admin API) → `signInWithPassword` → redirect to dashboard.

**Critical:** `redirectTo` is appended by Supabase to the verify URL. User lands on our app with token in URL.

---

## Supabase Docs Requirements

| Requirement | Where | Status |
|-------------|-------|--------|
| **Redirect URLs** | Dashboard → Auth → URL Configuration | `redirectTo` MUST be in allowed list. Default: Site URL only. Add `https://app.renoz.com.au/accept-invitation*` or exact URLs for each env. |
| **SMTP** | Dashboard → Auth → SMTP | Default inbuilt SMTP has rate limits (~4/hr). Production: configure custom SMTP (Resend, SendGrid, etc.). |
| **Invite template** | Dashboard → Auth → Email Templates | Customize `auth.email.template.invite` for branding. Uses `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`. |
| **Site URL** | Auth → URL Configuration | Must match app domain. Used in email links. |

---

## Premortem: Critical Failure Modes

| ID | Failure Mode | Likelihood | Impact | Remediation |
|----|--------------|------------|--------|-------------|
| **C1** | **redirectTo not in allow list** | High | High | User clicks invite link → Supabase verify → redirect fails (blocked). User sees Supabase error or blank. | Add `{APP_URL}/accept-invitation` and `{APP_URL}/accept-invitation*` to Redirect URLs in Supabase Dashboard. Verify per env (prod, staging, preview). |
| **C2** | **SMTP not configured / rate limited** | Medium | High | inviteUserByEmail succeeds (returns user) but email never sent. User has no link. | Configure custom SMTP for production. Monitor Supabase Auth logs. Consider fallback: if invite returns success but no email delivery, surface "Check spam" or "Resend" to user. |
| **C3** | **inviteUserByEmail for existing user** | Medium | Medium | If email already in auth.users (signed up elsewhere), Supabase may return error or send duplicate invite. Our `isAuthUserAlreadyExists` handles "already registered" but not "user exists, invite sent again". | Doc: For existing auth user, inviteUserByEmail sends another invite. If error, we delete invitation row and throw. Test: invite same email twice (same org vs different org). |
| **C4** | **getAppUrl() wrong in serverless** | Medium | Medium | Vercel preview: `APP_URL` may be prod or missing. redirectTo points to wrong domain. User lands on wrong app or 404. | Ensure `VITE_APP_URL` / `APP_URL` set per Vercel env (production, preview). getAppUrl() throws in production if unset. |
| **C5** | **Orphan auth user on users insert failure** | Low | Medium | inviteUserByEmail creates auth user. We insert users row. If insert fails (constraint, etc.), we delete invitation + auth user. But batch: if one invite succeeds and users insert fails, we have orphan auth user. | Batch: we create users row in same loop after each invite. If it fails, we log but don't rollback auth user (can't easily). Consider: background job to reconcile orphans. |
| **C6** | **Token in redirectTo vs Supabase token** | Low | High | We pass `redirectTo=/accept-invitation?token=OUR_TOKEN`. Supabase appends this after verify. Our token is for our invitation lookup. If Supabase modifies or strips query params, we lose token. | Doc: Supabase passes redirectTo as-is. Verify in testing: click invite link, confirm URL has our token. |
| **C7** | **"Can't set password" on accept** | Medium | High | User lands with `#access_token=...&refresh_token=...` in URL. If hash is not exchanged for a session, downstream auth may fail. | Fixed: `useExchangeHashForSession` on accept-invitation page calls `setSession` with tokens from hash, then removes hash from URL. Server still sets password via `updateUserById`; client calls `signInWithPassword` after. |

---

## Premortem: User/UX Failure Modes

| ID | Failure Mode | Notes |
|----|--------------|-------|
| **U1** | **Invite email goes to spam** | Default Supabase SMTP has poor deliverability. Custom SMTP (Resend, etc.) improves. |
| **U2** | **User already has session** | After Supabase verify, user may land with session. Our accept form still works (token in URL). They set password; we update. Session may be invalid after password change — client calls signInWithPassword. |
| **U3** | **Resend for expired invitation** | We update status to pending, new token, call inviteUserByEmail. Supabase may reject if user already verified. Test. |
| **U4** | **Batch: partial failure** | Some invites succeed, some fail. We don't rollback successful DB inserts. Results array has per-email success/failure. UI shows summary. |

---

## Premortem: Developer Debt

| ID | Failure Mode | Notes |
|----|--------------|-------|
| **D1** | **No invite template customization** | Default subject "You have been invited". Customize in Dashboard for org name, branding. |
| **D2** | **user_metadata in invite** | We pass `data: { organizationId, role, organizationName }`. Available in template as `{{ .Data.* }}`? Check Supabase template vars. |
| **D3** | **Batch: inviteUserByEmail for existing invited user** | When existingUser.status === 'invited', we update role and call invite. Supabase may send again. Confirm behavior. |
| **D4** | **send-invitation-email Trigger job** | Now dead code. Remove or keep for reference. |

---

## Pre-Deploy Checklist

- [ ] Add `{APP_URL}/accept-invitation` to Supabase Redirect URLs (all envs)
- [ ] Configure custom SMTP in Supabase (production)
- [ ] Set `VITE_APP_URL` / `APP_URL` in Vercel per environment
- [ ] Customize invite email template (optional)
- [ ] Test: new user invite, existing user resend, batch with mixed success/fail

---

## References

- [Supabase invite template](https://supabase.com/docs/guides/local-development/customizing-email-templates#authemailtemplateinvite)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [inviteUserByEmail API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
