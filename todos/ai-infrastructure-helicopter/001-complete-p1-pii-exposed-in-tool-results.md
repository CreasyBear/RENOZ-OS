---
status: complete
priority: p1
issue_id: "SEC-001"
tags: [helicopter-review, security, ai-infrastructure, pii]
dependencies: []
---

# SEC-001: Sensitive PII Exposed in Tool Results

## Problem Statement

Customer email and phone fields are returned in AI tool results, which are then included in conversational responses. This exposes PII to the AI model and potentially logs, violating the security pattern requirement to filter sensitive fields.

This is a CRITICAL security violation that could lead to PII leakage in AI responses or logs.

## Findings

**Source:** Security Sentinel Agent + Helicopter Review

**Location:** `src/lib/ai/tools/customer-tools.ts:141-159`

**Current behavior:**
- `getCustomer` and `searchCustomers` tools return full customer records
- Email and phone fields are included in tool results
- AI model receives these values and may include them in responses

**Pattern requirement (from `patterns/04-tool-patterns.md`):**
```typescript
// Filter sensitive fields before returning to AI
return filterSensitiveFields(customer, ['ssn', 'tax_id', 'bank_account', 'email', 'phone']);
```

**Risk:**
- AI may include email/phone in conversational responses
- PII may be logged in tool call logs
- Violates data minimization principle

## Proposed Solutions

### Option A: Add filterSensitiveFields Utility (Recommended)
- **Pros:** Reusable across all tools, consistent filtering
- **Cons:** Need to update all existing tools
- **Effort:** Small (1-2 hours)
- **Risk:** Low

```typescript
// src/lib/ai/tools/utils.ts
export function filterSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = ['email', 'phone', 'ssn', 'tax_id', 'bank_account']
): Partial<T> {
  const filtered = { ...data };
  for (const field of sensitiveFields) {
    delete filtered[field];
  }
  return filtered;
}
```

### Option B: Return Only Necessary Fields
- **Pros:** More explicit, better type safety
- **Cons:** More verbose, need to define return type for each tool
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

### Option C: Field-Level Permissions
- **Pros:** Most flexible, role-based access
- **Cons:** Complex implementation, overkill for current needs
- **Effort:** Large (1-2 days)
- **Risk:** Medium - complexity

## Recommended Action

Option A - Create a `filterSensitiveFields` utility and apply it to all customer-related tool results.

## Technical Details

**Affected files:**
- `src/lib/ai/tools/customer-tools.ts` - getCustomer, searchCustomers
- `src/lib/ai/tools/order-tools.ts` - any customer data returned
- `src/lib/ai/tools/utils.ts` - CREATE: filterSensitiveFields function

**Sensitive fields to filter:**
- `email`
- `phone`
- `ssn` (if exists)
- `tax_id` (if exists)
- `bank_account` (if exists)

## Acceptance Criteria

- [ ] `filterSensitiveFields` utility exists in `src/lib/ai/tools/utils.ts`
- [ ] All customer tool results pass through `filterSensitiveFields`
- [ ] Unit tests verify email and phone are not in tool results
- [ ] AI cannot access customer email or phone through any tool

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Security patterns require PII filtering in all tool results |
| 2026-01-26 | **FIXED** - Added email/phone to filterSensitiveFields in types.ts, updated CustomerWithMeta/CustomerSearchResult types, applied filter to searchCustomers results | PII filtering must be comprehensive and applied at tool boundaries |

## Resources

- `patterns/04-tool-patterns.md` - Tool patterns with filtering example
- `patterns/07-shared-prompts.md` - Security instructions about PII
- OWASP Data Protection guidelines
