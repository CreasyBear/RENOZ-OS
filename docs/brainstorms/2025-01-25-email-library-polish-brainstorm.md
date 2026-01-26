---
date: 2025-01-25
topic: email-library-polish
---

# Email Library Polish: Dynamic Org Branding

## What We're Building

Transform the email template library from hardcoded "Renoz" branding to dynamic, per-organization theming. Each organization's emails will use their own logo, colors, and locale settings - making the CRM truly white-label capable.

**Customer experience goal:** Premium + Energetic (Stripe meets Linear)

## Why Context-Based Approach

We chose implicit context injection over explicit props because:
- Multi-tenant CRM means branding is *mandatory*, not optional
- Trigger jobs already have `organizationId` in payloads
- New templates automatically get branding without boilerplate
- Impossible to accidentally send unbranded emails

## Key Decisions

1. **`renderOrgEmail(orgId, element)`** - New render function that fetches org branding and injects via React context
2. **`OrgEmailContext`** - Provides branding (logo, colors) and settings (locale, currency, timezone, dateFormat)
3. **Components consume context** - Button uses `primaryColor`, Header uses `logoUrl`, formatters use `locale`
4. **Fallback to sensible defaults** - If org has no branding configured, use professional defaults
5. **Keep `renderEmail()` for non-org contexts** - System emails, dev previews, etc.

## What Changes

### New Files
- `src/lib/email/context.tsx` - OrgEmailContext provider and hook
- `src/lib/email/render-org.ts` - renderOrgEmail function with DB fetch

### Modified Files
- `src/lib/email/components/theme.tsx` - Consume context for dynamic colors
- `src/lib/email/components/button.tsx` - Use primaryColor from context
- `src/lib/email/components/header.tsx` - Use logoUrl from context
- `src/lib/email/components/footer.tsx` - Use org name, website from context
- `src/lib/email/format.ts` - Accept locale/currency/timezone overrides
- `src/lib/email/index.ts` - Export new functions
- `src/trigger/jobs/warranty-notifications.ts` - Use renderOrgEmail

### Component Enhancements
- **Header**: Display org logo (with fallback to text)
- **Button**: Primary uses `primaryColor`, secondary uses `secondaryColor`
- **Footer**: Show org name, website, proper unsubscribe
- **Formatters**: Respect org locale for dates/currency

## Visual Enhancements

Beyond branding, improve the aesthetic:
- Add subtle gradient or accent line using org colors
- Better typography hierarchy
- Status badges with more visual pop
- Consistent spacing system

## Open Questions

- Should we cache org branding to avoid repeated DB fetches? (Probably yes for campaigns)
- Do we need org-specific email signatures integration?

## Next Steps

Execute the implementation - create context, update components, wire up trigger jobs.
