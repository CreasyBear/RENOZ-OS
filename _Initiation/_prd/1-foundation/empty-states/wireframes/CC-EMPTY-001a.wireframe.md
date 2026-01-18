# CC-EMPTY-001a: Empty State Component Patterns

## Overview
Base empty state component patterns that all other empty states build upon.

## Components

### BaseEmptyState
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    ┌──────────┐                         │
│                    │   Icon   │  (optional)             │
│                    │  48x48   │                         │
│                    └──────────┘                         │
│                                                         │
│                   Title (optional)                      │
│                   font-semibold                         │
│                                                         │
│              Description/Message text                   │
│              text-muted-foreground                      │
│              max-w-sm centered                          │
│                                                         │
│                 ┌─────────────┐                         │
│                 │   Action    │  (optional)             │
│                 └─────────────┘                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### EmptyStateContainer
```
┌─────────────────────────────────────────────────────────┐
│  role="status"  aria-live="polite"                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │              [BaseEmptyState]                     │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Variants:                                              │
│  - page: py-24, full-width                              │
│  - inline: py-12, constrained                           │
│  - card: within Card component                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Props

```typescript
interface BaseEmptyStateProps {
  icon?: LucideIcon
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  className?: string
}

interface EmptyStateContainerProps {
  variant?: "page" | "inline" | "card"
  children: React.ReactNode
}
```

## Accessibility
- Container: `role="status"`, `aria-live="polite"`
- Icon: `aria-hidden="true"` (decorative)
- Focus management: Action button receives focus when appropriate

## Spacing
- Icon to title: 16px (mb-4)
- Title to message: 4px (mb-1)
- Message to action: 16px (mb-4)
- Container padding: py-12 (inline), py-24 (page)
