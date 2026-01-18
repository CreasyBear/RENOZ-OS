# Auth Extensions PRD Execution

> **PRD**: auth-extensions.prd.json
> **Stories**: 8
> **Dependencies**: FOUND-AUTH, FOUND-AUTH-004, FOUND-SCHEMA, FOUND-SHARED

## Overview

This PRD adds security extensions to the foundation auth system:
- **MFA (TOTP)**: Two-factor authentication via authenticator apps
- **Password Reset UI**: Self-service password recovery flow
- **Session Management**: View and terminate active sessions

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Execution Order

Execute stories in dependency order:

### Phase 1: Schema (2 stories)
1. **AUTH-EXT-001** - MFA Backup Codes Schema
2. **AUTH-EXT-002** - User Sessions Schema

### Phase 2: Server Functions (2 stories)
3. **AUTH-EXT-003** - MFA Server Functions (depends on 001)
4. **AUTH-EXT-007** - Session Management API (depends on 002)

### Phase 3: UI Components (4 stories)
5. **AUTH-EXT-004** - MFA Setup UI (depends on 003)
6. **AUTH-EXT-005** - Login Flow MFA Integration (depends on 004, FOUND-AUTH-004)
7. **AUTH-EXT-006** - Password Reset UI (depends on FOUND-AUTH-004)
8. **AUTH-EXT-008** - Session Management UI (depends on 007)

## Key Patterns

### Supabase MFA Integration
```typescript
// Enrollment
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});
// Returns: { id, totp: { qr_code, secret, uri } }

// Challenge and Verify
const { data, error } = await supabase.auth.mfa.challengeAndVerify({
  factorId,
  code: '123456'
});
```

### Backup Code Generation
```typescript
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const codes = Array.from({ length: 10 }, () =>
  crypto.randomBytes(4).toString('hex') // e.g., "a1b2c3d4"
);
const hashes = await Promise.all(
  codes.map(code => bcrypt.hash(code, 10))
);
// Store hashes, return plain codes ONCE
```

### Password Strength Calculation
```typescript
const getStrength = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  if (/\d/.test(password)) score += 25;
  if (/[!@#$%^&*]/.test(password)) score += 25;
  return score;
};
```

## UI Components Reference

| Component | Location | Dependencies |
|-----------|----------|--------------|
| Dialog | @/components/ui/dialog | shadcn/ui |
| InputOTP | @/components/ui/input-otp | input-otp package |
| Card | @/components/ui/card | shadcn/ui |
| Badge | @/components/ui/badge | shadcn/ui |
| Progress | @/components/ui/progress | shadcn/ui |
| AlertDialog | @/components/ui/alert-dialog | shadcn/ui |
| Skeleton | @/components/ui/skeleton | shadcn/ui |

## Icons (lucide-react)

- `Smartphone` - Mobile device sessions
- `Laptop` - Desktop sessions
- `Tablet` - Tablet sessions
- `Trash2` - Terminate session
- `Mail` - Password reset sent
- `Shield` - MFA enabled indicator
- `Key` - Backup codes

## Validation

After each story, verify:
```bash
bun run typecheck
bun run test
```

After all stories:
```bash
python scripts/validate-prd-corpus.py --prd-root "_Initiation/_prd/"
```

## Wireframe References

- Login with MFA: `1-foundation/auth/wireframes/login.wireframe.md`
- Security settings: `2-domains/settings/wireframes/SET-001c.wireframe.md`

## Completion

When ALL auth extension stories pass:
```xml
<promise>AUTH_EXTENSIONS_COMPLETE</promise>
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
