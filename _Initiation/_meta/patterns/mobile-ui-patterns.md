# Mobile UI Implementation Patterns

## Source

Lessons learned from Inventory Domain mobile implementation (January 2026):
- `src/routes/_authenticated/mobile/receiving.tsx`
- `src/routes/_authenticated/mobile/picking.tsx`
- `src/routes/_authenticated/mobile/counting.tsx`
- `src/components/mobile/inventory-actions.tsx`

## Why This Matters

These patterns prevent real device bugs discovered during implementation:
- `min-h-screen` causes content to be hidden behind mobile browser chrome
- `window.confirm()` blocks JS execution and breaks SSR
- Missing label associations fail WCAG 1.3.1 audits
- Input font-size < 16px triggers iOS auto-zoom

---

## Pattern 1: Mobile Viewport Layout

### Problem
Using `min-h-screen` or `h-screen` doesn't account for mobile browser UI (address bar, bottom navigation).

### Solution
```tsx
// CORRECT
<div className="min-h-dvh bg-muted/30">

// WRONG
<div className="min-h-screen">
```

### iOS Safe Areas
Fixed footers get hidden behind the home indicator on notched iPhones.

```tsx
// CORRECT - add bottom padding for safe area
<div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">

// For fixed footers
<footer className="fixed bottom-0 pb-[env(safe-area-inset-bottom)]">
```

---

## Pattern 2: Confirmation Dialogs

### Problem
`window.confirm()` and `window.alert()`:
- Block JavaScript execution
- Break server-side rendering (SSR)
- Look inconsistent across browsers/devices
- Cannot be styled to match the app

### Solution
Use shadcn/ui `AlertDialog` for all confirmations:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// State
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

// Trigger button (NOT direct action)
<Button onClick={() => setShowConfirmDialog(true)}>Delete</Button>

// Dialog
<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Delete?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmedDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Handler Naming Convention
Split handlers into trigger + confirmed:
- `handleDeleteClick` - opens dialog
- `handleConfirmedDelete` - performs action after confirmation

---

## Pattern 3: Offline Sync Queue

### Problem
Each mobile route was duplicating offline sync logic:
- Manual `useState` for queue
- Manual `localStorage` persistence
- Manual sync logic with retry

### Solution
Use the `useOfflineQueue` hook:

```tsx
import { useOfflineQueue, useOnlineStatus } from "@/hooks";

interface PendingItem {
  id?: string;
  productId: string;
  quantity: number;
  // ... other fields
}

function MobilePage() {
  const isOnline = useOnlineStatus();
  const {
    queue,           // Current items in queue
    addToQueue,      // Add item (auto-generates id)
    syncQueue,       // Sync all items with callback
    isSyncing,       // Loading state
    queueLength,     // Count for badges
  } = useOfflineQueue<PendingItem>("mobile-receiving-queue");

  // Show status
  return (
    <OfflineIndicator
      isOnline={isOnline}
      pendingActions={queueLength}
      onSync={() => syncQueue(async (item) => {
        await serverFunction({ data: item });
      })}
      isSyncing={isSyncing}
    />
  );
}
```

### Hook Location
- `src/hooks/use-online-status.ts` - Network status detection
- `src/hooks/use-persisted-state.ts` - localStorage persistence + queue abstraction

---

## Pattern 4: Form Accessibility

### Label Association (WCAG 1.3.1)
Every input MUST have an associated label via `htmlFor`/`id`:

```tsx
// CORRECT
<Label htmlFor="quantity-input">Quantity</Label>
<Input id="quantity-input" type="number" />

// WRONG - no programmatic association
<Label>Quantity</Label>
<Input type="number" />
```

### Input Font Size
Inputs with font-size < 16px trigger iOS Safari auto-zoom on focus.

```tsx
// CORRECT
<Input className="text-base" />  // 16px

// WRONG - triggers zoom
<Input className="text-sm" />    // 14px
```

### Touch Targets
All interactive elements must be at least 44x44px:

```tsx
// CORRECT
<Button className="min-h-[44px] min-w-[44px]">

// For icon buttons
<Button size="icon" className="h-14 w-14">
```

---

## Pattern 5: Loading States

### Async Data Loading
Use `Skeleton` components that match final layout:

```tsx
// CORRECT - skeleton matches select height
{isLoadingLocations ? (
  <Skeleton className="h-[44px] w-full" />
) : (
  <Select>...</Select>
)}

// WRONG - spinner causes layout shift
{isLoadingLocations ? <Spinner /> : <Select>...</Select>}
```

### Submit Button Loading
Keep original label visible with spinner:

```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
      Submitting...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

---

## Pattern 6: Performance

### Memoize List Items
Prevent re-renders in long lists:

```tsx
// CORRECT
const PickItemRow = memo(function PickItemRow({
  item,
  index,
  isActive,
  onSelect,
}: PickItemRowProps) {
  return <button onClick={() => onSelect(index)}>...</button>;
});

// Usage
{items.map((item, idx) => (
  <PickItemRow key={item.id} item={item} index={idx} ... />
))}
```

### Extract Mock Data
Move mock/fixture data to dedicated files:

```tsx
// src/routes/_authenticated/mobile/__fixtures__/index.ts
export const MOCK_PICK_LIST: PickList = {
  id: "pl-001",
  items: [...],
};

// Component file
import { MOCK_PICK_LIST } from "./__fixtures__";
```

---

## Reusable Components

Import from `@/components/mobile/inventory-actions`:

| Component | Purpose | Touch Target |
|-----------|---------|--------------|
| `BarcodeScanner` | Barcode input with camera button | 44px |
| `QuantityInput` | +/- buttons with number input | 44px buttons, 56px input |
| `OfflineIndicator` | Sync status banner with action | 44px button |
| `MobilePageHeader` | Sticky header with back button | 44px back button |
| `MobileActionButton` | Large action button with icon | 44px min height |
| `MobileInventoryCard` | Card with confirm/cancel actions | 56px buttons |
| `MobileQuickActions` | Grid of action tiles | 44px per tile |

---

## Complete Mobile Page Template

```tsx
import { useState, useCallback, memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useOfflineQueue, useOnlineStatus } from "@/hooks";
import {
  OfflineIndicator,
  MobilePageHeader,
} from "@/components/mobile/inventory-actions";
import { MOCK_DATA } from "./__fixtures__";

function MobilePage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { addToQueue, syncQueue, isSyncing, queueLength } = useOfflineQueue<T>("key");

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleActionClick = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmedAction = useCallback(async () => {
    setShowConfirmDialog(false);
    // Perform action
  }, []);

  return (
    <div className="min-h-dvh bg-muted/30 pb-[env(safe-area-inset-bottom)]">
      <MobilePageHeader
        title="Page Title"
        onBack={() => navigate({ to: "/mobile" })}
      />

      <div className="p-4 space-y-4">
        <OfflineIndicator
          isOnline={isOnline}
          pendingActions={queueLength}
          onSync={() => syncQueue(async (item) => { /* sync */ })}
          isSyncing={isSyncing}
        />

        {isLoading ? (
          <Skeleton className="h-[44px] w-full" />
        ) : (
          <div>{/* Content */}</div>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm?</AlertDialogTitle>
            <AlertDialogDescription>Description here.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MobilePage;
```

---

## Checklist for UI Stories

Before marking a mobile UI story complete:

- [ ] Uses `min-h-dvh` not `min-h-screen`
- [ ] Has `pb-[env(safe-area-inset-bottom)]` if fixed footer
- [ ] Uses `AlertDialog` not `window.confirm()`
- [ ] Uses `useOfflineQueue` hook if offline-capable
- [ ] All inputs have `htmlFor`/`id` label associations
- [ ] Input font-size is `text-base` (16px+)
- [ ] Touch targets are `min-h-[44px] min-w-[44px]`
- [ ] Loading states use `Skeleton` components
- [ ] Submit buttons show spinner + original label
- [ ] List items are memoized with `memo()`
- [ ] Mock data is in `__fixtures__/` directory
