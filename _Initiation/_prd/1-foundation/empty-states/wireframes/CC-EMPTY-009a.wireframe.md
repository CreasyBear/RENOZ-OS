# CC-EMPTY-009a: Permission and Access Empty States

## Overview
Empty states for access denied, insufficient permissions, and upgrade prompts.

## Variants

### Access Denied (No Permission)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [access-denied illustration]         │
│                       (lock icon)                       │
│                                                         │
│               You don't have access                     │
│                                                         │
│        This area requires additional permissions.       │
│        Contact your administrator to request access.    │
│                                                         │
│                ┌────────────────────┐                   │
│                │ Request Access     │                   │
│                └────────────────────┘                   │
│                                                         │
│                    ← Go Back                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Role Insufficient
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [access-denied illustration]         │
│                                                         │
│            Admin access required                        │
│                                                         │
│       This feature is only available to                 │
│       organization administrators.                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Your role: Sales                               │   │
│  │  Required: Admin or Owner                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                ┌────────────────────┐                   │
│                │ Contact Admin      │                   │
│                └────────────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Feature Not Available (Plan Limit)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [upgrade illustration]               │
│                      (sparkles)                         │
│                                                         │
│            Unlock Advanced Reports                      │
│                                                         │
│       Custom reporting is available on Pro              │
│       and Enterprise plans.                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✓ Export to Excel                              │   │
│  │  ✓ Scheduled reports                            │   │
│  │  ✓ Custom date ranges                           │   │
│  │  ✓ Team sharing                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                ┌────────────────────┐                   │
│                │ Upgrade to Pro     │                   │
│                └────────────────────┘                   │
│                                                         │
│              Compare plans →                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Organization Suspended
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [warning illustration]               │
│                                                         │
│            Account suspended                            │
│                                                         │
│       Your organization's account has been              │
│       suspended due to payment issues.                  │
│                                                         │
│       Please update your billing information            │
│       to restore access.                                │
│                                                         │
│                ┌────────────────────┐                   │
│                │ Update Billing     │                   │
│                └────────────────────┘                   │
│                                                         │
│              Contact support →                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Props

```typescript
interface AccessDeniedStateProps {
  variant: "no-permission" | "role-required" | "plan-limit" | "suspended"

  // For no-permission / role-required
  requiredPermission?: string
  requiredRole?: string[]
  currentRole?: string
  onRequestAccess?: () => void
  adminEmail?: string

  // For plan-limit
  featureName?: string
  currentPlan?: string
  requiredPlan?: string
  benefits?: string[]
  onUpgrade?: () => void

  // For suspended
  suspensionReason?: string
  onUpdateBilling?: () => void

  // Common
  onGoBack?: () => void
}
```

## Request Access Flow

```
┌────────────────────────────────────────┐
│  Request Access                        │
├────────────────────────────────────────┤
│                                        │
│  Feature: Financial Reports            │
│  Required: finance.read permission     │
│                                        │
│  Message to admin:                     │
│  ┌──────────────────────────────────┐  │
│  │ I need access to view financial  │  │
│  │ reports for the Q4 review...     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─────────┐  ┌─────────────────────┐  │
│  │ Cancel  │  │ Send Request        │  │
│  └─────────┘  └─────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

## Accessibility

```html
<div role="alert" aria-live="assertive">
  <h2>You don't have access</h2>
  <p>This area requires additional permissions.</p>

  <div role="group" aria-label="Role information">
    <p>Your role: <strong>Sales</strong></p>
    <p>Required: <strong>Admin or Owner</strong></p>
  </div>

  <button>Request Access</button>
  <a href="#" onClick={goBack}>Go Back</a>
</div>
```

## Visual Indicators

```
┌─────────────────────────────────────┐
│  Access Denied States               │
│                                     │
│  - Icon: Lock (red/destructive)     │
│  - Border: left-4 border-destructive│
│  - Background: destructive/5        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Upgrade Prompts                    │
│                                     │
│  - Icon: Sparkles (primary)         │
│  - Border: left-4 border-primary    │
│  - Background: primary/5            │
│  - Benefits: checkmarks (success)   │
└─────────────────────────────────────┘
```

## Touch Targets
- Action buttons: min-h-11
- Go Back link: min-h-11
- Compare plans link: min-h-11
