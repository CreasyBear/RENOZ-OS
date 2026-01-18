# Security Assessment: Communications Domain
Generated: 2026-01-18

## Executive Summary
- **Risk Level:** MEDIUM
- **Findings:** 0 critical, 2 high, 3 medium, 2 low
- **Immediate Actions Required:** Yes

## Threat Model
- **Attackers:** Authenticated users from different organizations (tenant isolation breach), unauthenticated attackers (tracking endpoint abuse), malicious email recipients
- **Attack Vectors:** Cross-tenant data access, IDOR in tracking endpoints, open redirect, XSS via notes field, information disclosure in logs
- **Assets to Protect:** Customer data, activity history, email tracking data, multi-tenant isolation

## Files Analyzed

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/server/activity-bridge.ts` | 420 | Activity creation from communications |
| `src/lib/server/quick-log.ts` | 132 | Quick log server functions |
| `src/components/domain/communications/quick-log-dialog.tsx` | 440 | Client-side quick log UI |
| `src/lib/server/email-tracking.ts` | 367 | Email open/click tracking |
| `src/routes/api/track/open.$emailId.ts` | 39 | Open tracking endpoint |
| `src/routes/api/track/click.$emailId.$linkId.ts` | 59 | Click tracking endpoint |

**Total Lines Analyzed:** 1,457

---

## Findings

### HIGH (2)

#### [H1] Missing Authentication on Activity Bridge Functions
**Location:** `src/lib/server/activity-bridge.ts` (all functions)
**Vulnerability:** Missing Authorization Check
**Risk:** Internal functions accept organizationId as input without validation. If called incorrectly, could create activities in wrong tenant.

**Evidence:**
```typescript
// Line 72-76: organizationId accepted from input, no auth check
export async function createEmailSentActivity(
  input: EmailActivityInput
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const {
    organizationId,  // <-- Trusted from input, not validated
    ...
  } = input;
```

**Assessment:** These are internal helper functions (not server functions exposed via createServerFn), so they rely on callers to pass correct organizationId. While not directly exploitable from client, improper use could cause cross-tenant data leakage.

**Remediation:**
1. Add runtime validation that the organizationId matches the calling context
2. Consider making these functions require a SessionContext parameter
3. Add JSDoc warnings about trusted internal use only

---

#### [H2] IDOR in Email Tracking Endpoints (Unauthenticated)
**Location:** `src/routes/api/track/open.$emailId.ts`, `src/routes/api/track/click.$emailId.$linkId.ts`
**Vulnerability:** Insecure Direct Object Reference
**Risk:** Anyone with an emailId can track opens/clicks for any email. Attackers could enumerate emailIds to discover valid emails and trigger false tracking events.

**Evidence:**
```typescript
// open.$emailId.ts - No authentication, accepts any emailId
export const APIRoute = createAPIFileRoute("/api/track/open/$emailId")({
  GET: async ({ params }) => {
    const { emailId } = params;
    recordEmailOpen(emailId);  // No validation of caller's authorization
    ...
  },
});
```

**Assessment:** This is intentional for email tracking (must work without auth as email clients load images). However, the predictable UUID format allows enumeration attacks.

**Remediation:**
1. Add HMAC signature to tracking URLs: `/api/track/open/:emailId/:signature`
2. Generate signature: `HMAC-SHA256(emailId, TRACKING_SECRET)`
3. Validate signature before recording (prevents enumeration)
4. Rate limit by IP to prevent brute-force discovery

---

### MEDIUM (3)

#### [M1] Open Redirect in Click Tracking
**Location:** `src/routes/api/track/click.$emailId.$linkId.ts:32-47`
**Vulnerability:** Open Redirect
**Risk:** Attacker could craft tracking URLs that redirect to malicious sites, potentially for phishing.

**Evidence:**
```typescript
// Line 32-37: Only validates URL format, not destination domain
try {
  new URL(decodedUrl);  // Only checks it's a valid URL, any domain allowed
} catch {
  return new Response("Invalid URL", { status: 400 });
}
// Line 52: Redirects to any URL
return new Response(null, {
  status: 302,
  headers: { Location: decodedUrl },
});
```

**Assessment:** The URL validation only checks format, not whether the destination is trusted. An attacker could craft a link to redirect users to phishing pages.

**Remediation:**
1. Validate URL is stored in the original email's linkMap (compare against database)
2. Or maintain allowlist of trusted domains
3. Add warning interstitial for external redirects

---

#### [M2] Notes Field - No XSS Sanitization in Activity Metadata
**Location:** `src/lib/server/quick-log.ts:73-76`, `src/lib/server/activity-bridge.ts:282`
**Vulnerability:** Stored XSS (potential)
**Risk:** Notes field is stored in activity metadata without sanitization. If rendered unsafely on client, could execute scripts.

**Evidence:**
```typescript
// quick-log.ts:73-76 - Notes stored directly in metadata
const metadata: ActivityMetadata = {
  logType: type,
  fullNotes: notes,  // <-- Raw user input stored
};

// activity-bridge.ts:282 - Notes from calls also stored
if (notes) {
  metadata.notes = notes;
}
```

**Assessment:** The notes field is validated by zod (string, min 1 char) but has no max length or content sanitization. Depends on client-side rendering being safe.

**Remediation:**
1. Add max length validation: `z.string().min(1).max(10000)`
2. Consider sanitizing HTML/script tags before storage
3. Ensure client renders with proper escaping (React default is safe)

---

#### [M3] Sensitive Data in Console Logs
**Location:** Multiple files
**Vulnerability:** Information Disclosure
**Risk:** Logging email subjects, recipient emails, and IDs could expose PII in production logs.

**Evidence:**
```typescript
// activity-bridge.ts:119
console.log(`[activity-bridge] Created email_sent activity: ${activity.id} for email ${emailId}`);

// email-tracking.ts:77
console.log(`[email-tracking] Recorded email open: ${emailId}`);
```

**Assessment:** While emailId is a UUID (not directly PII), the pattern could be extended to log more sensitive data. Production logs should minimize PII exposure.

**Remediation:**
1. Use structured logging with configurable log levels
2. Replace console.log with proper logger that can be disabled in production
3. Avoid logging full email subjects/addresses

---

### LOW (2)

#### [L1] IP Hash Salt Fallback
**Location:** `src/lib/server/email-tracking.ts:341`
**Vulnerability:** Weak Cryptographic Practice
**Risk:** Default salt value if env var not set reduces privacy protection.

**Evidence:**
```typescript
function hashIpAddress(ipAddress: string): string {
  const salt = process.env.IP_HASH_SALT || "email-tracking-salt";  // <-- Hardcoded fallback
  return createHash("sha256")
    .update(salt + ipAddress)
    .digest("hex")
    .substring(0, 16);
}
```

**Remediation:**
1. Throw error if IP_HASH_SALT not configured in production
2. Or generate random salt on first run and persist

---

#### [L2] Missing Input Length Limits
**Location:** `src/lib/server/quick-log.ts:22-28`
**Vulnerability:** Denial of Service (minor)
**Risk:** No max length on notes field could allow very large payloads.

**Evidence:**
```typescript
const quickLogSchema = z.object({
  type: z.enum(["call", "note", "meeting"]),
  notes: z.string().min(1, "Notes are required"),  // <-- No max length
  duration: z.number().min(0).optional(),
  ...
});
```

**Remediation:**
1. Add max length: `.max(50000)` or appropriate limit
2. Add rate limiting on the endpoint

---

## Security Strengths Observed

### Authentication/Authorization (GOOD)
- `quick-log.ts` correctly uses `withAuth({ permission: ... })` pattern
- `withAuth` sets RLS context via `set_config('app.organization_id', ...)` 
- Organization isolation enforced in DB queries via `ctx.organizationId`

### Input Validation (GOOD)
- Zod schemas used for input validation
- UUID validation on customerId/opportunityId: `z.string().uuid()`
- Type coercion handled properly

### Database Queries (GOOD)
- Drizzle ORM used (parameterized queries, no raw SQL injection risk)
- All queries use `organizationId` from authenticated context

---

## Dependency Vulnerabilities

No dependency audit was performed as part of this scope. Recommend running:
```bash
npm audit
```

---

## Secrets Exposure Check

| Check | Status |
|-------|--------|
| `.env` files in .gitignore | Unknown (not checked) |
| Hardcoded secrets in code | None found in scanned files |
| API keys in source | None found |

---

## Recommendations

### Immediate (High Priority)

1. **Add HMAC signatures to tracking URLs** - Prevents IDOR enumeration
   - Files: `email-tracking.ts`, tracking route files
   - Effort: 2-4 hours

2. **Validate redirect URLs against original email** - Prevents open redirect
   - File: `click.$emailId.$linkId.ts`
   - Effort: 1-2 hours

### Short-term (Medium Priority)

3. **Add max length to notes field** - Prevents DoS and data bloat
   - File: `quick-log.ts`
   - Effort: 5 minutes

4. **Replace console.log with structured logger** - Better production practices
   - All files
   - Effort: 1 hour

5. **Require IP_HASH_SALT in production** - Better privacy compliance
   - File: `email-tracking.ts`
   - Effort: 10 minutes

### Long-term (Hardening)

6. **Add rate limiting to tracking endpoints** - Prevent abuse
7. **Implement tracking pixel obfuscation** - Random path segments
8. **Add audit logging for activity creation** - Compliance trail

---

## Summary

```
+-------------------------------------------------------------+
| Security Audit Report                                       |
+-------------------------------------------------------------+
| Scope: Communications Domain                                |
| Files scanned: 6                                            |
| Lines analyzed: 1,457                                       |
+-------------------------------------------------------------+
| CRITICAL (0)                                                |
|                                                             |
| HIGH (2)                                                    |
| [H1] Missing auth on activity bridge - activity-bridge.ts   |
| [H2] IDOR in email tracking - open.$emailId.ts              |
|                                                             |
| MEDIUM (3)                                                  |
| [M1] Open redirect in click tracking - click.$emailId.ts    |
| [M2] No XSS sanitization in notes - quick-log.ts            |
| [M3] Sensitive data in console logs - multiple files        |
|                                                             |
| LOW (2)                                                     |
| [L1] IP hash salt fallback - email-tracking.ts:341          |
| [L2] Missing input length limits - quick-log.ts:22          |
+-------------------------------------------------------------+
| Summary: 0 critical, 2 high, 3 medium, 2 low                |
| Status: WARNING - Address HIGH findings before production   |
+-------------------------------------------------------------+
```
