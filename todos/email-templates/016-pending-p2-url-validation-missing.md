---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, email-templates, security, validation]
dependencies: []
---

# No URL Validation on User-Provided Links

## Problem Statement

Email templates accept URL props that are rendered directly into `href` attributes without validation. This could enable phishing attacks through malicious URLs or, in some email clients, JavaScript execution.

**Why it matters:** An attacker who can influence URL data (e.g., through API injection or compromised database) could inject phishing links into customer emails.

## Findings

**File:** Multiple templates

```typescript
// order-confirmation.tsx
export interface OrderConfirmationProps extends BaseEmailProps {
  orderUrl?: string;  // No validation
}

// Rendered directly as:
<Button href={orderUrl}>View Order Details</Button>
```

**In string templates (Trigger jobs):**
```typescript
// send-campaign.ts line 93
body: `<a href="{{quote_url}}">View Your Quote</a>`,
```

**Attack scenarios:**
1. `javascript:alert(document.cookie)` - JS execution (blocked by most clients)
2. Phishing URL that looks legitimate but redirects
3. Data exfiltration via malformed URLs

**Discovered by:** security-sentinel agent

## Proposed Solutions

### Solution A: URL Validation Helper (Recommended)
Create a utility to validate URLs against allowed patterns.

```typescript
// src/lib/email/validate.ts
export function validateEmailUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    // Only allow https
    if (parsed.protocol !== 'https:') return null;
    // Optionally: check against allowlist of domains
    return url;
  } catch {
    return null;
  }
}
```

**Pros:** Centralized validation, reusable
**Cons:** Needs to be called manually
**Effort:** Small
**Risk:** Low

### Solution B: URL Allowlist by Domain
Maintain list of allowed domains for email links.

```typescript
const ALLOWED_DOMAINS = ['app.renoz.com', 'renoz.com'];

export function validateEmailUrl(url: string): string | null {
  const parsed = new URL(url);
  if (!ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
    return null;
  }
  return url;
}
```

**Pros:** Strict control
**Cons:** Needs maintenance when domains change
**Effort:** Medium
**Risk:** Low

### Solution C: Use Sanitization Library
Use established library like `sanitize-url`.

**Pros:** Battle-tested
**Cons:** Additional dependency
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- All template files with URL props
- `src/trigger/jobs/send-campaign.ts`
- `src/trigger/jobs/process-scheduled-emails.ts`

**Props requiring validation:**
- `orderUrl`
- `trackingUrl`
- `invoiceUrl`
- `ticketUrl`
- `unsubscribeUrl`
- `quote_url` (in campaigns)

## Acceptance Criteria

- [ ] All URL props validated before rendering
- [ ] Only HTTPS URLs allowed in email links
- [ ] Invalid URLs produce safe fallback or are omitted
- [ ] Tests cover malicious URL scenarios

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- OWASP URL Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- `sanitize-url` npm package
