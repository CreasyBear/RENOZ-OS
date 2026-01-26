---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, email-templates, dry, refactoring]
dependencies: ["017"]
---

# Template Boilerplate Duplication - Need EmailLayout Component

## Problem Statement

Every email template contains nearly identical boilerplate structure (~50 lines). This violates DRY and makes consistency hard to maintain. Changes to the layout require editing 7 files.

**Why it matters:** A simple change like updating the container border radius requires modifying all 7 templates. Inconsistencies are likely to creep in over time.

## Findings

**Duplicated pattern in all 7 templates:**

```tsx
<EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
  <Body
    className={`my-auto mx-auto font-sans ${themeClasses.body}`}
    style={lightStyles.body}
  >
    <Container
      className="my-[40px] mx-auto p-0 max-w-[600px]"
      style={{
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: lightStyles.container.borderColor,
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <Header ... />
      {/* Content */}
      <Footer ... />
    </Container>
  </Body>
</EmailThemeProvider>
```

**Files affected:**
- `src/lib/email/templates/customers/welcome.tsx`
- `src/lib/email/templates/orders/order-confirmation.tsx`
- `src/lib/email/templates/orders/order-shipped.tsx`
- `src/lib/email/templates/orders/invoice.tsx`
- `src/lib/email/templates/support/ticket-created.tsx`
- `src/lib/email/templates/support/ticket-resolved.tsx`
- `src/lib/email/templates/warranty/warranty-expiring.tsx`

**Estimated duplicate code:** ~350 lines across all templates

**Discovered by:** pattern-recognition-specialist agent

## Proposed Solutions

### Solution A: Create EmailLayout Component (Recommended)
Extract boilerplate into a reusable layout component.

```typescript
// src/lib/email/components/email-layout.tsx
interface EmailLayoutProps {
  previewText: string;
  headerTagline?: string;
  children: ReactNode;
  footerProps?: Partial<FooterProps>;
}

export function EmailLayout({
  previewText,
  headerTagline,
  children,
  footerProps
}: EmailLayoutProps) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body className={...} style={lightStyles.body}>
        <Container className={...} style={{...}}>
          <Header tagline={headerTagline} />
          {children}
          <Footer {...footerProps} />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
```

**Template after refactor:**
```typescript
export function OrderConfirmation(props: OrderConfirmationProps) {
  return (
    <EmailLayout previewText={previewText} headerTagline="Order Confirmation">
      {/* Just the content, no boilerplate */}
    </EmailLayout>
  );
}
```

**Pros:** Single source of truth, ~40% template LOC reduction
**Cons:** Requires refactoring all templates
**Effort:** Medium
**Risk:** Low

### Solution B: Keep Current Structure
Accept duplication as acceptable for 7 templates.

**Pros:** No refactoring work
**Cons:** Maintenance burden, inconsistency risk
**Effort:** None
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**New file to create:**
- `src/lib/email/components/email-layout.tsx`

**Files to refactor:**
- All 7 template files

**Expected LOC reduction:** ~250 lines total

## Acceptance Criteria

- [ ] EmailLayout component created
- [ ] All templates refactored to use EmailLayout
- [ ] Visual appearance unchanged
- [ ] PreviewProps still work for development

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- All template files in `src/lib/email/templates/`
- React Email layout best practices
