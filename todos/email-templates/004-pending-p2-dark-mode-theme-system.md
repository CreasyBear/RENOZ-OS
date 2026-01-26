---
status: pending
priority: p2
issue_id: EMAIL-TPL-004
tags: [code-review, design, email-templates]
dependencies: [EMAIL-TPL-003]
---

# Implement Dark Mode Theme System

## Problem Statement

Current email templates have no dark mode support. Modern email clients (Apple Mail, Gmail, Outlook) support dark mode, and emails without it appear jarring with bright white backgrounds.

**Impact**: MEDIUM - User experience, modern design expectations.

## Findings

### Evidence

1. **warranty-expiring.tsx**: Hardcoded white background, black text
2. **Database templates**: Inline styles with fixed colors
3. **No theme file** exists in codebase

### Midday Implementation
```typescript
// _reference/.midday-reference/packages/email/components/theme.tsx
export const theme = {
  colorScheme: "light dark",
  colors: {
    background: "#FFFFFF",
    backgroundDark: "#121212",
    text: "#1A1A1A",
    textDark: "#FAFAFA",
    // ...
  },
  // Media query CSS for dark mode
};
```

### Agent Source
- pattern-recognition-specialist: "Adopt Midday's theme system"
- architecture-strategist: "Dark mode support"

## Proposed Solutions

### Option A: CSS Media Query Approach (Recommended)
Use `@media (prefers-color-scheme: dark)` with fallback colors.

**Pros**:
- Native browser support
- No JavaScript needed
- Works in Gmail, Apple Mail, Outlook (latest)

**Cons**: Older email clients ignore it (acceptable fallback)
**Effort**: Medium
**Risk**: Low

### Option B: Separate Light/Dark Templates
Generate two versions of each email.

**Pros**: Full control
**Cons**: 2x maintenance, can't detect preference at send time
**Effort**: Large
**Risk**: High - maintenance nightmare

## Recommended Action

Option A - Implement CSS media query based theme.

## Technical Details

### Theme File
```typescript
// src/lib/email/components/theme.tsx
export const colors = {
  // Light mode (default)
  background: "#FFFFFF",
  text: "#1A1A1A",
  muted: "#6B7280",
  primary: "#2563EB",
  border: "#E5E7EB",

  // Dark mode overrides
  dark: {
    background: "#121212",
    text: "#FAFAFA",
    muted: "#9CA3AF",
    primary: "#60A5FA",
    border: "#374151",
  },
};

export const darkModeCSS = `
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: ${colors.dark.background} !important; }
    .email-text { color: ${colors.dark.text} !important; }
    .email-muted { color: ${colors.dark.muted} !important; }
    .email-border { border-color: ${colors.dark.border} !important; }
  }
`;
```

### Usage in Templates
```tsx
import { Html, Head, Body } from "@react-email/components";
import { darkModeCSS, colors } from "../components/theme";

export function OrderConfirmation(props) {
  return (
    <Html>
      <Head>
        <style>{darkModeCSS}</style>
      </Head>
      <Body className="email-body" style={{ backgroundColor: colors.background }}>
        {/* content */}
      </Body>
    </Html>
  );
}
```

## Acceptance Criteria

- [ ] Theme file with light/dark color tokens
- [ ] Dark mode CSS media queries in all templates
- [ ] Visual testing in Apple Mail dark mode
- [ ] Fallback to light mode in older clients
- [ ] Consistent branding colors across all emails

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From pattern-recognition-specialist review |

## Resources

- Midday theme: `_reference/.midday-reference/packages/email/components/theme.tsx`
- Can I Email dark mode: https://www.caniemail.com/features/css-at-media-prefers-color-scheme/
