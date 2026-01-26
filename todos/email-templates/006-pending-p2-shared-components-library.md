---
status: pending
priority: p2
issue_id: EMAIL-TPL-006
tags: [code-review, architecture, email-templates]
dependencies: [EMAIL-TPL-003]
---

# Create Shared Email Components Library

## Problem Statement

Each email template duplicates header, footer, button, and layout code. This causes inconsistency and maintenance burden. Changes to branding require updating every template.

**Impact**: MEDIUM - Developer productivity, brand consistency.

## Findings

### Evidence

1. **warranty-expiring.tsx**: Has inline header/footer HTML
2. **Database templates**: Each contains full HTML structure
3. **No shared components** exist

### Midday Pattern
```
packages/email/components/
├── theme.tsx      # Colors, dark mode
├── footer.tsx     # Unsubscribe, address, social
├── logo.tsx       # Brand logo component
└── button.tsx     # CTA button with styles
```

### Agent Source
- pattern-recognition-specialist: "Adopt Midday's component composition"
- code-simplicity-reviewer: "YAGNI - keep components minimal"

## Proposed Solutions

### Option A: Minimal Shared Components (Recommended)
Create only: `theme.tsx`, `footer.tsx`, `header.tsx`, `button.tsx`.

**Pros**:
- Covers 80% of duplication
- Simple to maintain
- YAGNI-compliant

**Cons**: May need more later
**Effort**: Small
**Risk**: Low

### Option B: Full Component Library
Create extensive library with `Text`, `Link`, `Image`, wrappers, etc.

**Pros**: Maximum reuse
**Cons**: Over-engineering, React Email already has these
**Effort**: Large
**Risk**: Medium - unnecessary abstraction

## Recommended Action

Option A - Start minimal with 4 core components.

## Technical Details

### Component Structure
```
src/lib/email/components/
├── theme.tsx       # Color tokens, dark mode CSS
├── header.tsx      # Logo, optional nav
├── footer.tsx      # Company info, unsubscribe, social
├── button.tsx      # Primary/secondary CTA buttons
└── index.ts        # Barrel export
```

### Footer Component
```tsx
// src/lib/email/components/footer.tsx
import { Section, Text, Link } from "@react-email/components";
import { colors } from "./theme";

interface FooterProps {
  unsubscribeUrl?: string;
  companyName?: string;
  companyAddress?: string;
}

export function Footer({
  unsubscribeUrl,
  companyName = "Renoz",
  companyAddress = "123 Main St, City, State 12345",
}: FooterProps) {
  return (
    <Section style={{ marginTop: 32, borderTop: `1px solid ${colors.border}` }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        © {new Date().getFullYear()} {companyName}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        {companyAddress}
      </Text>
      {unsubscribeUrl && (
        <Link href={unsubscribeUrl} style={{ color: colors.muted, fontSize: 12 }}>
          Unsubscribe
        </Link>
      )}
    </Section>
  );
}
```

### Header Component
```tsx
// src/lib/email/components/header.tsx
import { Section, Img } from "@react-email/components";

interface HeaderProps {
  logoUrl?: string;
}

export function Header({ logoUrl = "/logo.png" }: HeaderProps) {
  return (
    <Section style={{ marginBottom: 24 }}>
      <Img src={logoUrl} width={120} height={40} alt="Renoz" />
    </Section>
  );
}
```

## Acceptance Criteria

- [ ] `theme.tsx` with color tokens and dark mode CSS
- [ ] `header.tsx` with logo
- [ ] `footer.tsx` with company info, unsubscribe link
- [ ] `button.tsx` with primary/secondary variants
- [ ] All templates use shared components
- [ ] Barrel export in `index.ts`

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From pattern-recognition-specialist review |

## Resources

- Midday components: `_reference/.midday-reference/packages/email/components/`
- React Email components: https://react.email/docs/components
