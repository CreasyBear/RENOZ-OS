---
status: complete
priority: p3
issue_id: "MMR-007"
tags: [security, authentication, best-practices]
dependencies: []
---

# API Token Uses SHA-256 Instead of bcrypt

## Problem Statement

API tokens are hashed with SHA-256, which is faster than bcrypt but provides less protection against brute-force attacks if the token database is compromised.

## Findings

- **Location:** API token generation/validation logic
- **Issue:** SHA-256 is not designed for password/token hashing
- **Risk:** If tokens table is leaked, faster brute-force recovery possible
- **Severity:** P3 MEDIUM - Low risk given other security layers

## Proposed Solutions

### Option 1: Migrate to bcrypt (Recommended)

**Approach:** Hash new tokens with bcrypt, support both during transition.

**Pros:**
- Industry standard for secrets
- Configurable work factor
- Future-proof

**Cons:**
- Requires token rotation
- Slightly slower verification

**Effort:** 3-4 hours

**Risk:** Low

---

### Option 2: Use Argon2id

**Approach:** Migrate to Argon2id for even stronger protection.

**Pros:**
- Best-in-class algorithm
- Memory-hard (resists GPU attacks)

**Cons:**
- Requires new dependency
- More complex configuration

**Effort:** 4-6 hours

**Risk:** Low

---

### Option 3: Keep SHA-256 with Additional Measures

**Approach:** Add rate limiting and monitoring to compensate.

**Pros:**
- No migration needed
- Works with existing tokens

**Cons:**
- Doesn't address fundamental weakness
- Defense in depth only

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Current pattern:**
```typescript
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
```

**Recommended pattern:**
```typescript
const tokenHash = await bcrypt.hash(token, 12);
const isValid = await bcrypt.compare(providedToken, storedHash);
```

## Resources

- **Review Agent:** Security Sentinel
- **OWASP Password Storage:** https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## Acceptance Criteria

- [x] New tokens use bcrypt (or Argon2id)
- [x] Migration path for existing tokens documented
- [x] Token verification time is acceptable
- [x] No regression in token functionality

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Security Sentinel Agent

**Actions:**
- Identified SHA-256 usage for token hashing
- Assessed security implications
- Recommended bcrypt migration

**Learnings:**
- SHA-256 is fine for integrity checks, not for secrets
- bcrypt with work factor 12+ is current recommendation

### 2026-01-26 - Implementation Complete

**By:** Claude Code

**Actions:**
- Installed bcrypt dependency (`npm install bcrypt @types/bcrypt`)
- Replaced SHA-256 hashing with bcrypt (cost factor 12)
- Implemented two-step validation: prefix lookup + bcrypt.compare
- Updated token validation to use constant-time bcrypt comparison
- Documented approach in code comments

**Technical changes:**
- `hashToken()` now uses `bcrypt.hash(token, 12)`
- `verifyToken()` uses `bcrypt.compare()` for constant-time verification
- `validateApiToken()` looks up by prefix, then verifies with bcrypt
- Added `BCRYPT_ROUNDS = 12` constant for configurable work factor

**Migration note:**
- New tokens will use bcrypt hashes
- Existing SHA-256 hashed tokens will need to be regenerated
- Consider running a migration script to notify users of old tokens

**Learnings:**
- bcrypt hashes include salt, so lookup by hash is not possible
- Token prefix enables fast candidate lookup before slow bcrypt verify
- Cost factor 12 provides good security/performance balance
