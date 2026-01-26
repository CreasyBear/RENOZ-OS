---
status: pending
priority: p2
issue_id: "013"
tags: [code-review, email-templates, multi-tenant, branding]
dependencies: []
---

# Templates Hardcode "Renoz" Instead of Using Org Context

## Problem Statement

Email templates hardcode `brandName="Renoz"` and `companyName="Renoz"` instead of using the organization context system. This defeats the purpose of the multi-tenant branding infrastructure.

**Why it matters:** All organizations using this CRM will receive emails branded as "Renoz" instead of their own company name.

## Findings

**Files affected:**
- `src/lib/email/templates/orders/order-confirmation.tsx` (lines 116, 461)
- `src/lib/email/templates/orders/order-shipped.tsx`
- `src/lib/email/templates/orders/invoice.tsx`
- `src/lib/email/templates/support/ticket-created.tsx`
- `src/lib/email/templates/support/ticket-resolved.tsx`
- `src/lib/email/templates/warranty/warranty-expiring.tsx`
- `src/lib/email/templates/customers/welcome.tsx`

**Example (order-confirmation.tsx):**
```typescript
<Header brandName="Renoz" tagline="Order Confirmation" />
// ...
<Footer
  companyName="Renoz"
  supportEmail={supportEmail}
/>
```

The `Header` and `Footer` components already support pulling from org context if no explicit prop is passed, but templates are overriding with hardcoded values.

**Discovered by:** kieran-typescript-reviewer agent, architecture-strategist agent

## Proposed Solutions

### Solution A: Remove Hardcoded Props (Recommended)
Remove `brandName` and `companyName` props from templates, let components use context.

```typescript
// Before
<Header brandName="Renoz" tagline="Order Confirmation" />
<Footer companyName="Renoz" supportEmail={supportEmail} />

// After
<Header tagline="Order Confirmation" />
<Footer supportEmail={supportEmail} />
```

**Pros:** Clean, leverages existing context system
**Cons:** Requires verifying all templates
**Effort:** Small
**Risk:** Low

### Solution B: Use Context Explicitly in Templates
Call `useOrgEmail()` in templates and pass settings explicitly.

```typescript
const { settings } = useOrgEmail();
<Header brandName={settings.name} tagline="Order Confirmation" />
```

**Pros:** Explicit data flow
**Cons:** More verbose, redundant with component internals
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- All 7 template files in `src/lib/email/templates/`

**Components already context-aware:**
- `Header` component uses `useOrgEmail()` for `brandName` fallback
- `Footer` component uses `useOrgEmail()` for `companyName` fallback

## Acceptance Criteria

- [ ] No hardcoded "Renoz" in any email template
- [ ] All templates use org context for company/brand name
- [ ] Preview props still work for development

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/components/header.tsx` - shows context usage
- `src/lib/email/components/footer.tsx` - shows context usage
