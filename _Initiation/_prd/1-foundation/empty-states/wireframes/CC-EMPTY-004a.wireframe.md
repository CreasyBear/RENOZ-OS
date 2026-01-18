# CC-EMPTY-004a: Welcome Checklist and First-Run Experience

## Overview
Dashboard widget that tracks new user progress through initial setup tasks.

## Layout

### Expanded State
```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐  X │
│  │                                                     │ │
│  │   Getting Started              ┌──────┐             │ │
│  │                                │  33% │  ← Progress │ │
│  │                                │  ○   │    Ring     │ │
│  │                                └──────┘    48px     │ │
│  │                                                     │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │                                                     │ │
│  │  ◉ Add your first customer                          │ │
│  │    Start building your customer database     →      │ │
│  │                                                     │ │
│  │  ○ Add your first product                           │ │
│  │    Set up products to create quotes          →      │ │
│  │                                                     │ │
│  │  ○ Create your first quote                          │ │
│  │    Send a quote to win your first deal       →      │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        Card with shadow
```

### Progress Ring Detail
```
       ┌──────────────┐
       │      33%     │  ← Percentage text
       │    ╭────╮    │     centered
       │   ╱      ╲   │
       │  │   ──   │  │  ← Track (muted)
       │   ╲      ╱   │  ← Fill (primary)
       │    ╰────╯    │
       └──────────────┘
         48px diameter
         stroke-width: 4
```

### Checklist Item States
```
Incomplete:                    Complete:
┌───────────────────────┐     ┌───────────────────────┐
│ ○  Task title         │     │ ✓  Task title         │
│    Description    →   │     │    ~~Description~~    │
└───────────────────────┘     └───────────────────────┘
   Circle icon                   CheckCircle2 (green)
   min-h-12 touch target         text-success
```

## Animations

### Card Enter
```
Initial:  opacity: 0, translateY: 8px
Final:    opacity: 1, translateY: 0
Duration: 300ms ease-out
```

### Item Complete
```
1. Checkmark: scale 0 → 1 (200ms, bounce)
2. Strike-through: draw line (300ms)
3. Progress ring: smooth arc transition (400ms)
```

### Dismiss
```
opacity: 1 → 0, translateY: 0 → -8px
Duration: 200ms ease-in
```

## Reduced Motion
- Card: fade only, no slide
- Item complete: instant checkmark, no animation
- Progress ring: instant change
- Dismiss: fade only

## Accessibility

```html
<div role="region" aria-labelledby="checklist-title">
  <h2 id="checklist-title">Getting Started</h2>

  <div role="progressbar"
       aria-valuenow="33"
       aria-valuemin="0"
       aria-valuemax="100"
       aria-label="Onboarding progress">
    <!-- SVG ring -->
  </div>

  <ul role="list">
    <li role="listitem" aria-checked="true">...</li>
    <li role="listitem" aria-checked="false">...</li>
  </ul>
</div>
```

## Touch Targets
- Checklist item: min-h-12 (48px)
- Dismiss button: min-w-12 min-h-12 (48px)
- Action arrows: min-h-11

## Responsive

### Mobile
- Full-width card
- Progress ring: 40px
- Stacked items

### Tablet+
- Card with max-width constraint
- Progress ring: 48px
