---
status: complete
priority: p2
issue_id: EMAIL-TPL-003
tags: [code-review, architecture, email-templates]
dependencies: []
---

# Unify Template System to React Email

## Problem Statement

Currently 4 competing template systems exist:
1. **Database templates** (`email_templates` table) - HTML strings with `{{variable}}` interpolation
2. **Inline HTML** in trigger jobs - Raw HTML strings
3. **React raw tables** - `warranty-expiring.tsx` using basic HTML tables
4. **React Email** - Not yet adopted

This fragmentation causes maintenance burden, inconsistent styling, and makes dark mode/theming impossible to implement consistently.

**Impact**: MEDIUM - Developer productivity, visual consistency.

## Findings

### Evidence

1. **send-campaign.ts**: Uses database templates (string interpolation)
2. **process-scheduled-emails.ts**: Uses database templates
3. **warranty-notifications.ts**: Uses React component but with raw HTML tables
4. **send-email.ts**: Inline HTML strings

### Midday Pattern
- Single React Email system
- All templates as `.tsx` components
- Shared theme, components, consistent structure

### Agent Source
- architecture-strategist: "Template system fragmentation"
- pattern-recognition-specialist: "Adopt Midday's React Email structure"

## Proposed Solutions

### Option A: Full React Email Migration (Recommended)
Migrate all templates to React Email components in `src/lib/email/templates/`.

**Pros**:
- Single source of truth
- Auto-escaping (security)
- Dark mode support
- Preview in browser
- Shared components

**Cons**: Requires migrating existing database templates
**Effort**: Large
**Risk**: Medium

### Option B: Hybrid System
Keep database templates for marketing (user-editable), use React Email for transactional.

**Pros**: Flexibility for marketing team
**Cons**: Two systems to maintain, styling inconsistency
**Effort**: Medium
**Risk**: Medium - complexity

### Option C: Template Engine for Database Templates
Add proper templating (Handlebars/EJS) with partials to database templates.

**Pros**: Keeps existing system
**Cons**: No dark mode, harder to style, string-based security issues
**Effort**: Medium
**Risk**: High - doesn't solve core issues

## Recommended Action

Option A - Migrate to React Email, convert database templates to seed data for React components.

## Technical Details

### Target Structure
```
src/lib/email/
├── components/          # Shared components
│   ├── theme.tsx       # Dark mode CSS, colors
│   ├── footer.tsx      # Standard footer
│   ├── header.tsx      # Logo, branding
│   └── button.tsx      # CTA buttons
├── templates/          # Email templates by domain
│   ├── orders/
│   │   ├── order-confirmation.tsx
│   │   ├── order-shipped.tsx
│   │   └── invoice.tsx
│   ├── customers/
│   │   └── welcome.tsx
│   ├── warranty/
│   │   ├── registration.tsx
│   │   └── expiring.tsx
│   └── support/
│       ├── ticket-created.tsx
│       └── ticket-resolved.tsx
├── render.ts           # renderEmailTemplate() helper
└── index.ts            # Barrel exports
```

### Migration Steps
1. Install `@react-email/components`
2. Create theme/shared components
3. Migrate templates one domain at a time
4. Update trigger jobs to use React components
5. Deprecate database templates (or convert to "custom templates" feature)

## Acceptance Criteria

- [ ] All transactional emails use React Email
- [ ] Shared theme with dark mode support
- [ ] Consistent footer/header across all emails
- [ ] Database templates converted or deprecated
- [ ] Email preview works in development

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From architecture-strategist review |

## Resources

- React Email docs: https://react.email/docs
- Midday templates: `_reference/.midday-reference/packages/email/`
