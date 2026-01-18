# CC-EMPTY-002a: Empty States with Call-to-Action

## Overview
Empty states with clear, actionable CTAs to guide users toward creating content.

## Layouts

### Single CTA (Primary)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Illustration]                       │
│                                                         │
│                  No customers yet                       │
│                                                         │
│         Add your first customer to get started          │
│         with tracking sales and relationships.          │
│                                                         │
│                ┌──────────────────┐                     │
│                │  + Add Customer  │  ← Primary button   │
│                └──────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Dual CTA (Primary + Secondary)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Illustration]                       │
│                                                         │
│                  No products yet                        │
│                                                         │
│          Add products manually or import from           │
│          a spreadsheet to get started.                  │
│                                                         │
│     ┌──────────────────┐   ┌──────────────────┐        │
│     │  + Add Product   │   │  Import CSV      │        │
│     └──────────────────┘   └──────────────────┘        │
│         Primary               Secondary/Outline         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Link CTA (Learn More)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Illustration]                       │
│                                                         │
│              No integrations connected                  │
│                                                         │
│       Connect your accounting software to sync          │
│       invoices and payments automatically.              │
│                                                         │
│                ┌──────────────────┐                     │
│                │  Connect Xero    │                     │
│                └──────────────────┘                     │
│                                                         │
│              Learn more about integrations →            │
│                    (text link)                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## CTA Variants

| Variant | Use Case | Button Style |
|---------|----------|--------------|
| Primary | Main action (Add, Create) | `variant="default"` |
| Secondary | Alternative action (Import, Connect) | `variant="outline"` |
| Link | Documentation, help | Text link with arrow |

## Props Extension

```typescript
interface EmptyStateWithCTAProps extends BaseEmptyStateProps {
  primaryAction: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  learnMoreLink?: {
    label: string
    href: string
  }
}
```

## Accessibility
- Buttons: Clear, action-oriented labels ("Add Customer" not "Add")
- Link: Opens in same tab unless external (then `target="_blank"` with `rel="noopener"`)
- Focus order: Primary → Secondary → Link
