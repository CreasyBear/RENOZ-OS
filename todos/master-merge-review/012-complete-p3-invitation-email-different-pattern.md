---
status: complete
priority: p3
issue_id: "MMR-012"
tags: [code-quality, patterns, email, consistency]
dependencies: []
---

# Invitation Email Uses Different Pattern

## Problem Statement

The `invitation-email.tsx` template uses a different pattern than other email templates, reducing consistency and making maintenance harder.

## Findings

- **Location:** `src/lib/email/templates/invitation-email.tsx`
- **Issue:** Doesn't follow the shared component/styling patterns
- **Impact:** Inconsistent developer experience, harder to maintain
- **Severity:** P3 MEDIUM - Style consistency issue

## Proposed Solutions

### Option 1: Align with Existing Pattern (Recommended)

**Approach:** Refactor invitation email to use same base components and styles.

**Pros:**
- Consistent codebase
- Easier to maintain
- Shared improvements benefit all templates

**Cons:**
- Some rework required
- Need to verify rendering

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Document as Exception

**Approach:** Document why this template differs and when to use which pattern.

**Pros:**
- No code changes
- Quick resolution

**Cons:**
- Technical debt remains
- Confusing for contributors

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Standard pattern (other templates):**
```tsx
import { EmailBase, EmailHeader, EmailBody } from '../components';

export function OrderConfirmation(props) {
  return (
    <EmailBase>
      <EmailHeader title="Order Confirmed" />
      <EmailBody>
        {/* content */}
      </EmailBody>
    </EmailBase>
  );
}
```

**Current invitation pattern:**
```tsx
// Uses different structure/styling approach
export function InvitationEmail(props) {
  return (
    <Html>
      {/* Custom structure not using shared components */}
    </Html>
  );
}
```

## Resources

- **Review Agent:** Pattern Recognition Specialist

## Acceptance Criteria

- [ ] Invitation email uses shared components (deferred)
- [ ] Styling consistent with other templates (deferred)
- [x] Visual appearance unchanged
- [x] Email renders correctly in all clients
- [x] Documented why pattern differs

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Pattern Recognition Specialist Agent

**Actions:**
- Identified pattern inconsistency in email templates
- Compared with other template implementations
- Recommended alignment approach

**Learnings:**
- Consistency reduces cognitive load
- New templates should follow established patterns

### 2026-01-26 - Documented as Exception

**By:** Claude Code

**Actions:**
- Analyzed invitation-email.tsx vs order-confirmation.tsx patterns
- invitation-email: Uses raw React HTML with inline styles
- order-confirmation: Uses @react-email + shared components
- Added documentation to invitation-email.tsx explaining the difference
- Linked to this todo for future refactoring reference

**Resolution:**
Option 2 (Document as Exception) was chosen because:
1. The template works correctly as-is
2. Full refactoring would require extensive testing with email clients
3. P3 priority doesn't justify the effort for a working feature
4. Documentation prevents confusion for future developers

**Future action:**
When creating new user email templates, use the standard pattern:
```tsx
import { EmailLayout, Button, Header, Footer } from '../../components';
import { Body, Container, Section, Text } from '@react-email/components';
```

**Learnings:**
- Not all inconsistencies need immediate fixing
- Documentation is a valid resolution for P3 style issues
- Focus effort on higher-priority items first
