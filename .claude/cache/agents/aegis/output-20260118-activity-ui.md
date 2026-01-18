# Security Assessment: Activity UI Components
Generated: 2026-01-18

## Executive Summary
- **Risk Level:** MEDIUM
- **Findings:** 0 critical, 2 high, 3 medium, 2 low
- **Immediate Actions Required:** Yes (HIGH findings require attention)

## Threat Model
- **Assumed attackers:** Authenticated users attempting privilege escalation, data exfiltration
- **Attack vectors:** XSS via user-generated content, authorization bypass, data exposure
- **Assets to protect:** Activity audit logs, user PII, organization data isolation

---

## Findings

### HIGH: Admin Route Lacks Role-Based Access Control

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/routes/_authenticated/admin/activities/index.tsx\`
**Vulnerability:** Missing Authorization Check
**Risk:** Any authenticated user can access the admin analytics dashboard. The route is under \`/_authenticated/admin/\` but there is no \`admin/route.tsx\` file implementing role checks. The \`_authenticated\` wrapper only checks for authentication, not authorization.

**Evidence:**
\`\`\`typescript
// src/routes/_authenticated/admin/activities/index.tsx:14-17
export const Route = createFileRoute("/_authenticated/admin/activities/")({
  component: ActivityAnalyticsPage,
});
// No beforeLoad with role check - any authenticated user can access
\`\`\`

The parent \`_authenticated.tsx\` only checks for session existence:
\`\`\`typescript
// src/routes/_authenticated.tsx:18-26
beforeLoad: async ({ location }) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw redirect({ to: '/login', ... })
  }
  return { user: session.user }
}
// No role/permission check
\`\`\`

**Remediation:**
1. Create \`src/routes/_authenticated/admin/route.tsx\` with role checking:
\`\`\`typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionContext } from '@/lib/server/protected'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async () => {
    const ctx = await getSessionContext()
    if (!['owner', 'admin'].includes(ctx.role)) {
      throw redirect({ to: '/dashboard' })
    }
    return ctx
  },
})
\`\`\`

---

### HIGH: CSV Export Injection Vulnerability

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-timeline.tsx:78-94\`
**Vulnerability:** CSV Injection (Formula Injection)
**Risk:** User-controlled content (names, descriptions, changes) is written directly to CSV without sanitization. Malicious content like \`=HYPERLINK("http://evil.com","Click")\` or \`=cmd|'/c calc'!A0\` could execute when opened in Excel.

**Evidence:**
\`\`\`typescript
// activity-timeline.tsx:78-94
function exportToCSV(activities: ActivityWithUser[], entityType: string) {
  const headers = ["Date", "Time", "Action", "User", "Description", "Changes"];
  const rows = activities.map((a) => {
    const date = new Date(a.createdAt);
    return [
      format(date, "yyyy-MM-dd"),
      format(date, "HH:mm:ss"),
      a.action,
      a.user?.name ?? a.user?.email ?? "System",  // User-controlled
      a.description ?? "",                         // User-controlled
      a.changes?.fields?.join(", ") ?? "",        // User-controlled
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  // No sanitization of cell content
\`\`\`

**Remediation:**
1. Sanitize CSV cell content to prevent formula injection:
\`\`\`typescript
function sanitizeCSVCell(value: string): string {
  // Escape double quotes
  let safe = value.replace(/"/g, '""');
  // Prefix formula characters with single quote to prevent execution
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe;
  }
  return safe;
}

// In exportToCSV:
const csv = [headers, ...rows]
  .map((row) => row.map((cell) => `"${sanitizeCSVCell(String(cell))}"`).join(","))
  .join("\n");
\`\`\`

---

### MEDIUM: Potential PII Exposure in Leaderboard

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-leaderboard.tsx:94-104\`
**Vulnerability:** Data Exposure
**Risk:** The leaderboard displays full email addresses as fallback when user name is null. This could expose email addresses to users who should not see other users' emails based on their role.

**Evidence:**
\`\`\`typescript
// activity-leaderboard.tsx:94-104
function LeaderboardRow({ entry, maxCount }: { entry: LeaderboardEntry; maxCount: number }) {
  // ...
  <p className="font-medium text-sm truncate">
    {entry.userName ?? entry.userEmail}  // Falls back to full email
  </p>
\`\`\`

**Remediation:**
1. Mask email addresses:
\`\`\`typescript
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}

// In LeaderboardRow:
{entry.userName ?? maskEmail(entry.userEmail)}
\`\`\`

---

### MEDIUM: Sensitive Data in Activity Changes

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/change-diff.tsx:40-58\`
**Vulnerability:** Sensitive Data Display
**Risk:** The \`ChangeDiff\` component displays before/after values without any filtering. If sensitive fields (passwords, API keys, SSN, etc.) are accidentally logged in the activity changes, they will be displayed to any user who can view activities.

**Evidence:**
\`\`\`typescript
// change-diff.tsx:40-58
function formatValue(value: unknown): string {
  if (value === null) return "null";
  // ... no filtering of sensitive field values
  if (typeof value === "string") return value;
  // Displays any value directly
}
\`\`\`

\`\`\`typescript
// change-diff.tsx:115-125
{fields.map((field) => (
  <FieldDiff
    field={field}
    before={before?.[field]}  // Raw value display
    after={after?.[field]}    // Raw value display
    compact={compact}
  />
))}
\`\`\`

**Remediation:**
1. Implement a sensitive field filter:
\`\`\`typescript
const SENSITIVE_FIELDS = ['password', 'apiKey', 'secret', 'token', 'ssn', 'creditCard'];

function isSensitiveField(field: string): boolean {
  return SENSITIVE_FIELDS.some(s => field.toLowerCase().includes(s));
}

function formatValue(value: unknown, field?: string): string {
  if (field && isSensitiveField(field)) return '[REDACTED]';
  // ... rest of function
}
\`\`\`

2. Better: Prevent sensitive fields from being logged in the first place (server-side).

---

### MEDIUM: IP Address and User Agent Exposure

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/schemas/activities.ts:75-78\`
**Vulnerability:** PII Exposure
**Risk:** The activity schema includes \`ipAddress\` and \`userAgent\` fields which are returned to the client. These could be used for fingerprinting or tracking users.

**Evidence:**
\`\`\`typescript
// activities.ts:75-78
export const activitySchema = z.object({
  // ...
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  // These are included in ActivityWithUser returned to clients
});
\`\`\`

**Remediation:**
1. Exclude these fields from client responses unless user has admin role:
\`\`\`typescript
// In server function, strip sensitive fields for non-admins
const sanitizedActivity = {
  ...activity,
  ipAddress: ctx.role === 'admin' ? activity.ipAddress : null,
  userAgent: ctx.role === 'admin' ? activity.userAgent : null,
};
\`\`\`

---

### LOW: Missing URL Parameter Sanitization

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/routes/_authenticated/activities/index.tsx:19-28\`
**Vulnerability:** Insufficient Input Validation
**Risk:** While Zod validation is used, the \`.catch(undefined)\` pattern silently swallows invalid input rather than rejecting it. This could mask injection attempts or indicate probing.

**Evidence:**
\`\`\`typescript
// activities/index.tsx:19-28
const activitySearchSchema = z.object({
  entityType: activityEntityTypeSchema.optional().catch(undefined),
  action: activityActionSchema.optional().catch(undefined),
  userId: z.string().optional().catch(undefined),  // No UUID validation
  dateFrom: z.coerce.date().optional().catch(undefined),
  dateTo: z.coerce.date().optional().catch(undefined),
});
\`\`\`

**Remediation:**
1. Add UUID validation for userId:
\`\`\`typescript
userId: z.string().uuid().optional().catch(undefined),
\`\`\`

2. Consider logging invalid parameter attempts for security monitoring.

---

### LOW: No Rate Limiting on Export

**Location:** \`/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-timeline.tsx:78-94\` and \`activity-dashboard.tsx:203-217\`
**Vulnerability:** Resource Exhaustion
**Risk:** Export functions can be called repeatedly without rate limiting. A malicious user could trigger many exports to cause resource exhaustion.

**Evidence:**
\`\`\`typescript
// activity-timeline.tsx - exportToCSV called directly on button click
<Button onClick={() => exportToCSV(activities, entityType)}>
\`\`\`

**Remediation:**
1. Add client-side debouncing:
\`\`\`typescript
const [isExporting, setIsExporting] = React.useState(false);
const handleExport = async () => {
  if (isExporting) return;
  setIsExporting(true);
  try {
    exportToCSV(activities, entityType);
  } finally {
    setTimeout(() => setIsExporting(false), 2000);
  }
};
\`\`\`

2. For larger exports, implement server-side rate limiting.

---

## Positive Security Findings

### GOOD: No XSS Vulnerabilities Detected
The codebase does not use \`dangerouslySetInnerHTML\`, \`innerHTML\`, or \`__html\`. All user content is rendered through React's JSX which auto-escapes. Verified in all activity components.

### GOOD: Server-Side Organization Isolation
All server functions use \`withAuth\` and filter by \`organizationId\`:
\`\`\`typescript
// activities.ts:51
conditions.push(eq(activities.organizationId, ctx.organizationId));
\`\`\`

### GOOD: Permission-Based API Access
Server functions check permissions via \`withAuth({ permission: PERMISSIONS.activity?.read })\`.

### GOOD: Input Validation with Zod
All server function inputs are validated with Zod schemas before processing.

---

## Dependency Vulnerabilities

No specific dependency audit was performed in this review. Recommend running:
\`\`\`bash
npm audit
\`\`\`

---

## Secrets Exposure Check

- \`.env\` files: Not checked in this review (out of scope)
- Hardcoded secrets: None found in activity UI components
- Secret management: N/A for UI components

---

## Recommendations

### Immediate (HIGH)
1. **Create admin route guard** - Add \`src/routes/_authenticated/admin/route.tsx\` with role checking
2. **Fix CSV injection** - Sanitize cell content before export

### Short-term (MEDIUM)
1. **Mask emails in leaderboard** - Protect user email addresses
2. **Filter sensitive fields** - Prevent display of sensitive data in change diffs
3. **Strip IP/UA for non-admins** - Remove fingerprinting data from client responses

### Long-term (Hardening)
1. **Add security logging** - Log invalid URL parameter attempts
2. **Implement rate limiting** - Add debouncing and server-side limits on exports
3. **Audit activity logging** - Ensure sensitive fields are never logged to activities table
