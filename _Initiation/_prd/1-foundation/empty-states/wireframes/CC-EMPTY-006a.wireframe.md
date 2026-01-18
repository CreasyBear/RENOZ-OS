# CC-EMPTY-006a: Zero Data State Messaging

## Overview
Domain-specific empty state messages that provide context and guidance when no data exists.

## Message Template Structure

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Illustration]                       │
│                     no-{domain}                         │
│                                                         │
│                     {Title}                             │
│              Clear, friendly headline                   │
│                                                         │
│                   {Description}                         │
│         Explains why empty + what to do next            │
│           2-3 sentences, helpful tone                   │
│                                                         │
│                  ┌─────────────┐                        │
│                  │  {Action}   │                        │
│                  └─────────────┘                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Domain Messages

### Customers
```
┌─────────────────────────────────────────┐
│         [no-customers illustration]     │
│                                         │
│          No customers yet               │
│                                         │
│   Add your first customer to start      │
│   building your business relationships  │
│   and tracking their orders.            │
│                                         │
│          [+ Add Customer]               │
└─────────────────────────────────────────┘
```

### Products
```
┌─────────────────────────────────────────┐
│          [no-products illustration]     │
│                                         │
│           No products yet               │
│                                         │
│   Add products to your catalog to       │
│   start creating quotes and tracking    │
│   inventory levels.                     │
│                                         │
│          [+ Add Product]                │
└─────────────────────────────────────────┘
```

### Orders
```
┌─────────────────────────────────────────┐
│           [no-orders illustration]      │
│                                         │
│            No orders yet                │
│                                         │
│   Orders will appear here once          │
│   customers accept your quotes.         │
│   Create a quote to get started.        │
│                                         │
│          [Create Quote]                 │
└─────────────────────────────────────────┘
```

### Opportunities/Pipeline
```
┌─────────────────────────────────────────┐
│       [no-opportunities illustration]   │
│                                         │
│        No opportunities yet             │
│                                         │
│   Track your sales pipeline by          │
│   adding opportunities. Each one        │
│   represents a potential deal.          │
│                                         │
│        [+ Add Opportunity]              │
└─────────────────────────────────────────┘
```

### Inventory
```
┌─────────────────────────────────────────┐
│         [no-inventory illustration]     │
│                                         │
│          No inventory yet               │
│                                         │
│   Stock levels will appear here once    │
│   you add products and receive          │
│   inventory shipments.                  │
│                                         │
│          [+ Add Product]                │
└─────────────────────────────────────────┘
```

### Quotes
```
┌─────────────────────────────────────────┐
│          [no-quotes illustration]       │
│                                         │
│           No quotes yet                 │
│                                         │
│   Create quotes for your customers      │
│   to start winning deals. Accepted      │
│   quotes become orders automatically.   │
│                                         │
│          [+ Create Quote]               │
└─────────────────────────────────────────┘
```

## Message Guidelines

### DO
- Use friendly, helpful tone
- Explain the purpose of the feature
- Provide clear next action
- Keep description to 2-3 sentences

### DON'T
- Use "No data" or generic messages
- Blame the user ("You haven't added...")
- Use jargon or technical terms
- Show multiple competing CTAs

## Constants File

```typescript
// src/lib/empty-states/constants/empty-messages.ts

export const EMPTY_MESSAGES = {
  customers: {
    title: "No customers yet",
    description: "Add your first customer to start building your business relationships and tracking their orders.",
    action: "Add Customer",
    illustration: "no-customers"
  },
  products: {
    title: "No products yet",
    description: "Add products to your catalog to start creating quotes and tracking inventory levels.",
    action: "Add Product",
    illustration: "no-products"
  },
  // ... etc
} as const
```

## Accessibility
- `role="status"` on container
- `aria-live="polite"` for dynamic updates
- Action button has descriptive label
