---
status: pending
priority: p3
issue_id: EMAIL-TPL-009
tags: [code-review, developer-experience, email-templates]
dependencies: [EMAIL-TPL-003]
---

# Email Preview Development Server

## Problem Statement

No local preview for email templates during development. Developers must send test emails to verify changes, slowing iteration.

**Impact**: LOW - Developer productivity improvement.

## Findings

### Evidence

1. **No preview route** exists for email templates
2. **Current workflow**: Modify template → send test email → check inbox → repeat
3. **Midday pattern**: Uses React Email's built-in dev server

### Agent Source
- code-simplicity-reviewer: "Nice-to-have, lower priority"

## Proposed Solutions

### Option A: React Email Dev Server (Recommended)
Use React Email's built-in preview with `email dev` command.

**Pros**:
- Built-in to React Email
- Hot reload
- Multiple client previews

**Cons**: Separate dev server
**Effort**: Small
**Risk**: Low

### Option B: In-App Preview Route
Create `/dev/email-preview` route in app.

**Pros**: Single server
**Cons**: More custom code, no hot reload
**Effort**: Medium
**Risk**: Low

## Recommended Action

Option A - Use React Email dev server.

## Technical Details

### Setup
```bash
# Add to package.json scripts
"email:dev": "email dev --dir src/lib/email/templates --port 3001"
```

### Directory Structure for React Email
```
src/lib/email/
├── templates/
│   ├── orders/
│   │   └── confirmation.tsx  # Must export default
│   └── ...
└── ...
```

### Template Export Pattern
```typescript
// src/lib/email/templates/orders/confirmation.tsx
import { OrderConfirmation } from "./confirmation";

// Default export for React Email dev server
export default OrderConfirmation;

// Preview props for dev server
OrderConfirmation.PreviewProps = {
  customerName: "John Doe",
  orderNumber: "ORD-2024-001",
  total: 299.99,
  // ... sample data
};
```

## Acceptance Criteria

- [ ] `npm run email:dev` starts preview server
- [ ] All templates have PreviewProps for realistic preview
- [ ] Hot reload works on template changes
- [ ] README documents preview workflow

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From code-simplicity-reviewer review |

## Resources

- React Email CLI: https://react.email/docs/cli
