# Error States Foundation Wireframe

**Purpose:** Consistent error handling patterns across the application for 404s, 500s, session expiration, and network failures
**Priority:** FOUNDATION (Phase: core-infrastructure)
**Design Aesthetic:** Reassuring and actionable - clear messaging with recovery paths

---

## Dependencies

> **STATUS: READY** - Core UI components exist, can be implemented now.

| Dependency Type | Requirement | Status |
|-----------------|-------------|--------|
| **UI Components** | shadcn/ui card, button, alert | AVAILABLE |
| **Error Boundary** | React error boundary | STANDARD |
| **Auth System** | Session detection | PLANNED |
| **Network Detection** | Online/offline detection | STANDARD |

### Renoz Business Context
- **Industry**: Australian B2B battery/battery installation
- **Support**: Business hours 9am-5pm AEST
- **Error Reporting**: Support ticket integration

---

## 1. 404 Not Found Page

**Route:** `/404` or unmatched routes
**When:** User navigates to non-existent page

```
+================================================================+
|  HEADER BAR (Optional - may not render if route unknown)        |
+================================================================+
|                                                                |
|                                                                |
|                      [404 Icon - Lost/Search]                  |
|                    ┌─────────────────────┐                     |
|                    │   ┌───┐   ┌───┐    │                     |
|                    │   │   │   │   │    │                     |
|                    │   └───┘   └───┘    │                     |
|                    │      ┌───┐         │                     |
|                    │      │   │         │                     |
|                    │      └───┘         │                     |
|                    └─────────────────────┘                     |
|                                                                |
|                       Page Not Found                           |
|                                                                |
|          We couldn't find the page you're looking for.         |
|          The link might be broken or the page may have         |
|          been moved.                                           |
|                                                                |
|    +--------------------------------------------------+        |
|    | [🔍] Search for orders, customers, products...   |        |
|    +--------------------------------------------------+        |
|                                                                |
|            [Go to Dashboard]    [Contact Support]              |
|                                                                |
|                  Common destinations:                          |
|                  • Dashboard                                   |
|                  • Customers                                   |
|                  • Orders                                      |
|                  • Products                                    |
|                                                                |
+================================================================+
```

### Component Structure

```tsx
// components/error-pages/not-found.tsx
<div className="flex min-h-screen items-center justify-center p-4">
  <Card className="max-w-md text-center">
    <CardHeader>
      <Icon404 /> {/* Custom 404 illustration */}
      <CardTitle>Page Not Found</CardTitle>
    </CardHeader>
    <CardContent>
      <p>We couldn't find the page you're looking for...</p>

      <SearchBar
        placeholder="Search for orders, customers, products..."
        onSearch={handleGlobalSearch}
      />

      <div className="flex gap-2 justify-center">
        <Button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
        <Button variant="outline" onClick={contactSupport}>
          Contact Support
        </Button>
      </div>

      <QuickLinks links={commonDestinations} />
    </CardContent>
  </Card>
</div>
```

### Accessibility

```tsx
// ARIA announcements
<div role="alert" aria-live="polite">
  Page not found. You can search for content or return to the dashboard.
</div>

// Skip to main actions
<a href="#recovery-actions" className="sr-only focus:not-sr-only">
  Skip to recovery options
</a>
```

---

## 2. 500 Error / Error Boundary

**When:** Unhandled JavaScript error, API failure, critical system error

```
+================================================================+
|  HEADER BAR (May be broken if global error)                    |
+================================================================+
|                                                                |
|                                                                |
|                   [Error Icon - Alert Triangle]                |
|                    ┌─────────────────────┐                     |
|                    │         /\          │                     |
|                    │        /  \         │                     |
|                    │       /____\        │                     |
|                    │         !           │                     |
|                    └─────────────────────┘                     |
|                                                                |
|                   Something Went Wrong                         |
|                                                                |
|          We encountered an unexpected error. Our team          |
|          has been notified and is working on a fix.            |
|                                                                |
|              Error ID: ERR-2026-01-10-A3B8C9D1                |
|                                                                |
|            [Try Again]    [Go to Dashboard]                    |
|                                                                |
|    +--------------------------------------------------+        |
|    | [▼] Technical Details (for support)              |        |
|    +--------------------------------------------------+        |
|    | Error: Failed to fetch customer data             |        |
|    | Component: CustomerDetailView                    |        |
|    | Time: 2026-01-10 14:32:15 AEST                   |        |
|    | [Copy Error Details]                             |        |
|    +--------------------------------------------------+        |
|                                                                |
|              [Report Issue to Support]                         |
|                                                                |
+================================================================+
```

### Component Structure

```tsx
// components/error-boundary/error-fallback.tsx
<div className="flex min-h-screen items-center justify-center p-4">
  <Card className="max-w-lg text-center">
    <CardHeader>
      <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
      <CardTitle>Something Went Wrong</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-4">
        We encountered an unexpected error. Our team has been
        notified and is working on a fix.
      </p>

      <div className="bg-muted p-2 rounded text-sm font-mono mb-4">
        Error ID: {errorId}
      </div>

      <div className="flex gap-2 justify-center mb-4">
        <Button onClick={retry}>Try Again</Button>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>

      <Collapsible>
        <CollapsibleTrigger>
          <Button variant="ghost" size="sm">
            Technical Details
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="text-left bg-muted p-3 rounded text-xs font-mono">
            <div>Error: {error.message}</div>
            <div>Component: {error.componentStack}</div>
            <div>Time: {timestamp}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyErrorDetails}
          >
            Copy Error Details
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <Button
        variant="link"
        onClick={reportIssue}
        className="mt-4"
      >
        Report Issue to Support
      </Button>
    </CardContent>
  </Card>
</div>
```

### Error Boundary Implementation

```tsx
// app/error.tsx (Next.js app router)
'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/error-boundary/error-fallback'
import { logError } from '@/lib/error-reporting'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service
    logError(error, {
      context: 'app-error-boundary',
      digest: error.digest,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <ErrorFallback
      error={error}
      errorId={error.digest}
      retry={reset}
    />
  )
}
```

### Accessibility

```tsx
// Error announcements
<div role="alert" aria-live="assertive">
  An error has occurred. Error ID: {errorId}.
  You can try again or return to the dashboard.
</div>

// Focus management
useEffect(() => {
  // Focus on primary action
  retryButtonRef.current?.focus()
}, [])
```

---

## 3. Session Expired

**When:** JWT token expired, auth session invalidated, forced logout

```
+================================================================+
|  HEADER BAR (Reduced - no user menu)                           |
+================================================================+
|                                                                |
|                                                                |
|                     [Lock Icon - Expired]                      |
|                    ┌─────────────────────┐                     |
|                    │     ┌───────┐       │                     |
|                    │     │ 🔒 X  │       │                     |
|                    │     └───────┘       │                     |
|                    └─────────────────────┘                     |
|                                                                |
|                    Session Expired                             |
|                                                                |
|          Your session has expired for security reasons.        |
|          Please log in again to continue.                      |
|                                                                |
|                   Last active: 2 hours ago                     |
|                                                                |
|                    [Log In Again]                              |
|                                                                |
|              Your unsaved changes may be lost.                 |
|                                                                |
+================================================================+
```

### Component Structure

```tsx
// components/auth/session-expired.tsx
<div className="flex min-h-screen items-center justify-center p-4">
  <Card className="max-w-md text-center">
    <CardHeader>
      <Lock className="h-16 w-16 text-muted-foreground mx-auto" />
      <CardTitle>Session Expired</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-2">
        Your session has expired for security reasons.
        Please log in again to continue.
      </p>

      {lastActive && (
        <p className="text-sm text-muted-foreground mb-4">
          Last active: {formatRelativeTime(lastActive)}
        </p>
      )}

      <Button
        onClick={handleLogin}
        className="w-full"
      >
        Log In Again
      </Button>

      {hasUnsavedChanges && (
        <Alert variant="warning" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your unsaved changes may be lost.
          </AlertDescription>
        </Alert>
      )}
    </CardContent>
  </Card>
</div>
```

### Auth Integration

```tsx
// lib/auth/session-monitor.ts
export function useSessionMonitor() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()

      if (!session || isExpired(session)) {
        // Store current location for redirect after login
        sessionStorage.setItem('returnUrl', battery.location.pathname)

        // Redirect to session expired page
        router.push('/session-expired')
      }
    }

    // Check every minute
    const interval = setInterval(checkSession, 60000)

    return () => clearInterval(interval)
  }, [router])
}
```

### Accessibility

```tsx
// Session expiry announcement
<div role="alert" aria-live="polite">
  Your session has expired. Please log in again to continue.
</div>

// Preserve return URL for screen reader users
<VisuallyHidden>
  After logging in, you will be returned to {returnUrl}
</VisuallyHidden>
```

---

## 4. Network Error / Offline

**When:** Network connection lost, API unreachable, timeout

```
+================================================================+
|  HEADER BAR (Cached/Offline Mode)                              |
|  [!] You're offline - some features unavailable                |
+================================================================+
|                                                                |
|                                                                |
|                   [Offline Icon - Cloud X]                     |
|                    ┌─────────────────────┐                     |
|                    │      ☁️ ✕           │                     |
|                    │                     │                     |
|                    │   No Connection     │                     |
|                    └─────────────────────┘                     |
|                                                                |
|                   No Internet Connection                       |
|                                                                |
|          We couldn't reach the server. Check your              |
|          connection and try again.                             |
|                                                                |
|                   Retrying in 5 seconds...                     |
|                   [●●●○○] (progress indicator)                 |
|                                                                |
|                    [Try Again Now]                             |
|                                                                |
|    +--------------------------------------------------+        |
|    | [i] Offline Mode                                 |        |
|    +--------------------------------------------------+        |
|    | You can still view cached data, but changes      |        |
|    | won't sync until you're back online.             |        |
|    +--------------------------------------------------+        |
|                                                                |
+================================================================+
```

### Network Error Inline (Within Page)

```
+================================================================+
|  HEADER BAR                                                     |
+================================================================+
|  Customer Details                                              |
|  +----------------------------------------------------------+  |
|  | [!] Connection lost - showing cached data                |  |
|  |     [Retry] | Auto-retry in 10s...                        |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [Customer details - greyed/disabled for unsupported actions]  |
|                                                                |
+================================================================+
```

### Component Structure

```tsx
// components/error-states/network-error.tsx
<div className="flex min-h-screen items-center justify-center p-4">
  <Card className="max-w-md text-center">
    <CardHeader>
      <CloudOff className="h-16 w-16 text-muted-foreground mx-auto" />
      <CardTitle>No Internet Connection</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-4">
        We couldn't reach the server. Check your connection
        and try again.
      </p>

      {autoRetry && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            Retrying in {countdown} seconds...
          </p>
          <Progress value={(countdown / maxCountdown) * 100} />
        </div>
      )}

      <Button
        onClick={handleRetry}
        disabled={isRetrying}
      >
        {isRetrying ? 'Retrying...' : 'Try Again Now'}
      </Button>

      <Alert className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Offline Mode</AlertTitle>
        <AlertDescription>
          You can still view cached data, but changes won't
          sync until you're back online.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
</div>
```

### Network Detection Hook

```tsx
// hooks/use-network-status.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [autoRetry, setAutoRetry] = useState(true)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Connection restored')
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Connection lost')
    }

    battery.addEventListener('online', handleOnline)
    battery.addEventListener('offline', handleOffline)

    return () => {
      battery.removeEventListener('online', handleOnline)
      battery.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isOnline && autoRetry) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Trigger retry
            checkConnection()
            return 10 // Reset countdown
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isOnline, autoRetry])

  return { isOnline, autoRetry, countdown }
}
```

### Inline Network Error Banner

```tsx
// components/network/offline-banner.tsx
export function OfflineBanner() {
  const { isOnline, countdown, retry } = useNetworkStatus()

  if (isOnline) return null

  return (
    <Alert variant="warning" className="rounded-none border-x-0">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          Connection lost - showing cached data
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">
            Auto-retry in {countdown}s
          </span>
          <Button size="sm" variant="outline" onClick={retry}>
            Retry Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
```

### Accessibility

```tsx
// Network status announcements
<div role="status" aria-live="polite">
  {isOnline
    ? 'Connection restored. You are online.'
    : 'Connection lost. You are offline. Retrying in ' + countdown + ' seconds.'
  }
</div>

// Focus management during retry
useEffect(() => {
  if (isRetrying) {
    retryButtonRef.current?.setAttribute('aria-busy', 'true')
  } else {
    retryButtonRef.current?.setAttribute('aria-busy', 'false')
  }
}, [isRetrying])
```

---

## Global Error Toast Patterns

### Quick Error Toast (Non-Critical)

```tsx
// For minor errors that don't block the user
toast.error('Failed to save changes', {
  action: {
    label: 'Retry',
    onClick: handleRetry,
  },
})
```

### Critical Error Toast (Requires Action)

```tsx
// For errors that need immediate attention
toast.error('Payment failed', {
  duration: Infinity, // Stays until dismissed
  action: {
    label: 'Update Payment Method',
    onClick: () => router.push('/settings/billing'),
  },
})
```

---

## Error State Routing Logic

```tsx
// app/layout.tsx or error boundary
export function getErrorRoute(error: Error): string {
  // 404 errors
  if (error.message.includes('not found') || error.status === 404) {
    return '/404'
  }

  // Auth errors
  if (error.message.includes('session') || error.status === 401) {
    return '/session-expired'
  }

  // Network errors
  if (error.message.includes('network') || error.status === 0) {
    return '/offline'
  }

  // Generic 500
  return '/error'
}
```

---

## Shared Error Components

### ErrorIcon Component

```tsx
// components/error-states/error-icon.tsx
type ErrorType = '404' | '500' | 'session' | 'network'

export function ErrorIcon({ type }: { type: ErrorType }) {
  const icons = {
    '404': SearchX,
    '500': AlertTriangle,
    'session': Lock,
    'network': CloudOff,
  }

  const Icon = icons[type]

  return (
    <div className="mb-6 flex justify-center">
      <Icon className="h-24 w-24 text-muted-foreground" />
    </div>
  )
}
```

### ErrorLayout Wrapper

```tsx
// components/error-states/error-layout.tsx
export function ErrorLayout({
  icon,
  title,
  description,
  actions,
  details,
  children,
}: ErrorLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {icon}
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>

          {actions && (
            <div className="flex gap-2 justify-center">
              {actions}
            </div>
          )}

          {details && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  Technical Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="text-left bg-muted p-3 rounded text-xs">
                  {details}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {children}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Error Reporting Integration

### Client-Side Error Logger

```tsx
// lib/error-reporting.ts
export async function logError(
  error: Error,
  context: {
    component?: string
    userId?: string
    timestamp: string
    digest?: string
  }
) {
  // Send to error tracking service (Sentry, LogRocket, etc.)
  try {
    await fetch('/api/errors', {
      method: 'POST',
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        ...context,
      }),
    })
  } catch (e) {
    // Fail silently - don't crash on error reporting
    console.error('Failed to report error:', e)
  }
}
```

### Generate Error IDs

```tsx
// lib/error-id.ts
export function generateErrorId(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `ERR-${timestamp}-${random}`
}
```

---

## Accessibility Standards (WCAG 2.1 AA)

### Keyboard Navigation

- **Tab Order:** Icon > Title > Description > Primary Action > Secondary Action
- **Escape:** Close collapsible details
- **Enter/Space:** Activate retry/return actions
- **Focus Visible:** Clear focus indicators on all interactive elements

### Screen Reader Support

```tsx
// Error page structure
<main role="main" aria-labelledby="error-title">
  <h1 id="error-title">{errorTitle}</h1>

  <div role="alert" aria-live="polite">
    {errorDescription}
  </div>

  <div role="region" aria-label="Recovery actions">
    <Button>Primary Action</Button>
    <Button>Secondary Action</Button>
  </div>
</main>
```

### Color Contrast

- **Error Icons:** Minimum 3:1 contrast ratio
- **Text:** 4.5:1 for body text, 3:1 for large text
- **Buttons:** Distinct from background, clear focus states

### Focus Management

```tsx
// Focus on primary action when error renders
useEffect(() => {
  primaryActionRef.current?.focus()
}, [])

// Trap focus in error modal/page until action taken
useFocusTrap(errorContainerRef, { active: true })
```

---

## Success Metrics

- **Error Recovery Rate:** >90% users successfully recover from errors
- **Time to Recovery:** <30 seconds from error to successful action
- **Support Ticket Reduction:** 50% fewer tickets for common errors
- **Error ID Reporting:** 100% of critical errors generate trackable IDs
- **Accessibility:** All error states navigable by keyboard only

---

## Integration Points

- **Error Boundary:** app/error.tsx, app/global-error.tsx
- **Auth System:** lib/auth/session-monitor.ts
- **Network Detection:** hooks/use-network-status.ts
- **Error Reporting:** lib/error-reporting.ts
- **Toast System:** components/ui/toast.tsx (shadcn)
- **Router:** Next.js app router for error pages

---

## Testing Checklist

- [ ] 404 page renders for unknown routes
- [ ] Error boundary catches unhandled exceptions
- [ ] Session expiry redirects to login
- [ ] Network errors trigger auto-retry
- [ ] Error IDs are generated and logged
- [ ] All error states are keyboard accessible
- [ ] Screen readers announce errors appropriately
- [ ] Focus management works correctly
- [ ] Retry mechanisms function properly
- [ ] Error details can be copied for support
