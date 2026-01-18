# Error Tracking PRD Execution

> **PRD**: error-tracking.prd.json
> **Stories**: 4
> **Dependencies**: FOUND-SHARED, FOUND-APPSHELL

## Overview

Sentry integration for error monitoring:
- **Server Tracking**: Node.js error capture
- **Client Tracking**: React error capture with session replay
- **Error Boundaries**: Graceful error handling UI

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Execution Order

### Phase 1: SDK Setup (2 stories - parallel)
1. **ERR-001** - Sentry Server Setup
2. **ERR-002** - Sentry Client Setup

### Phase 2: UI Integration (2 stories)
3. **ERR-003** - Error Boundary Component (depends on 002)
4. **ERR-004** - App Error Boundary Integration (depends on 003)

## Key Patterns

### Sentry Initialization
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Error Boundary Usage
```tsx
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <Dashboard />
</Sentry.ErrorBoundary>
```

## Environment Variables

```bash
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

## Validation

```bash
bun run typecheck
python scripts/validate-prd-corpus.py --prd-root "_Initiation/_prd/"
```

## Completion

When ALL error tracking stories pass:
```xml
<promise>ERROR_TRACKING_COMPLETE</promise>
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
