# CC-EMPTY-003a: Empty State Illustrations

## Overview
Consistent illustration style for empty states across the application.

## Illustration Grid

### Generic Illustrations
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│             │  │             │  │             │
│  no-data    │  │ no-results  │  │   error     │
│             │  │             │  │             │
│  [folder]   │  │ [magnifier] │  │  [warning]  │
│             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│             │  │             │  │             │
│  success    │  │  offline    │  │ empty-inbox │
│             │  │             │  │             │
│ [checkmark] │  │   [cloud]   │  │   [inbox]   │
│             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Domain-Specific Illustrations
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│             │  │             │  │             │
│ no-customers│  │  no-orders  │  │ no-products │
│             │  │             │  │             │
│  [people]   │  │   [cart]    │  │   [box]     │
│             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│             │  │             │  │             │
│no-inventory │  │  no-quotes  │  │ no-opps     │
│             │  │             │  │             │
│ [warehouse] │  │  [document] │  │  [target]   │
│             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Design Specifications

### Style
```
┌─────────────────────────────────────────┐
│                                         │
│   Stroke: 1.5-2px consistent            │
│   Style: Minimal line art               │
│   Colors:                               │
│   - stroke: currentColor                │
│   - fill: primary/20 or muted           │
│                                         │
│   ViewBox: 0 0 120 120                  │
│                                         │
└─────────────────────────────────────────┘
```

### Sizes
```
┌───────┐  ┌──────────┐  ┌───────────────┐
│  sm   │  │    md    │  │      lg       │
│ 80x80 │  │ 120x120  │  │   200x200     │
└───────┘  └──────────┘  └───────────────┘
  mobile     default       page-level
```

## Component API

```typescript
interface EmptyStateIllustrationProps {
  variant:
    | "no-data" | "no-results" | "error" | "success" | "offline" | "empty-inbox"
    | "no-customers" | "no-orders" | "no-products" | "no-inventory" | "no-quotes" | "no-opportunities"
  size?: "sm" | "md" | "lg"
  animate?: boolean  // subtle float animation
  className?: string
}
```

## Theme Adaptation

```
Light Mode:              Dark Mode:
stroke: text-muted       stroke: text-muted (auto)
fill: muted/50           fill: muted/30
```

## Animation (Optional)

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.animate-float {
  animation: float 5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-float { animation: none; }
}
```

## Accessibility
- `role="img"`
- `aria-hidden="true"` (decorative - message conveyed by text)
