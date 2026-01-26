---
status: pending
priority: p2
issue_id: "SEC-004"
tags: [helicopter-review, security, ai-infrastructure, multi-tenant, group-3]
dependencies: []
---

# SEC-004: Conversation Missing Organization Validation

## Problem Statement

When fetching or updating conversations, there's no validation that the conversation belongs to the requesting user's organization. This could allow cross-tenant conversation access if IDs are guessed.

## Findings

**Source:** Security Sentinel Agent + Helicopter Review

**Location:** `src/lib/ai/memory/redis-provider.ts` and `src/routes/api/ai/chat.ts`

**Current state:**
```typescript
// No org validation when getting conversation
const conversation = await memoryProvider.getOrCreateConversation(
  ctx.user.id,
  ctx.organizationId,
  context?.conversationId  // What if this belongs to different org?
);
```

**Risk:**
- User could pass conversationId from different organization
- Could access another organization's AI conversation history
- Potential data leakage across tenants

## Proposed Solutions

### Option A: Validate Org on Conversation Fetch (Recommended)
- **Pros:** Simple, direct fix
- **Cons:** Additional query
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: Include Org in Conversation Key
- **Pros:** Impossible to access wrong org
- **Cons:** Requires migration of existing conversations
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

## Recommended Action

Option A - Add organization validation when fetching existing conversations.

## Technical Details

**Files to modify:**
- `src/lib/ai/memory/redis-provider.ts`

**Implementation:**
```typescript
// src/lib/ai/memory/redis-provider.ts

export class RedisMemoryProvider {
  async getOrCreateConversation(
    userId: string,
    organizationId: string,
    conversationId?: string
  ): Promise<Conversation> {
    // If conversationId provided, validate it belongs to this org
    if (conversationId) {
      const existing = await db.query.aiConversations.findFirst({
        where: eq(aiConversations.id, conversationId),
        columns: { id: true, organizationId: true },
      });

      if (!existing) {
        // Conversation not found, create new one
        return this.createConversation(userId, organizationId);
      }

      if (existing.organizationId !== organizationId) {
        // SECURITY: Conversation belongs to different org
        console.warn(
          `[Security] User ${userId} attempted to access conversation ${conversationId} from org ${existing.organizationId} (user org: ${organizationId})`
        );
        // Return new conversation instead of exposing error details
        return this.createConversation(userId, organizationId);
      }

      // Valid conversation, return it
      return this.loadConversation(conversationId);
    }

    // No conversationId, create new
    return this.createConversation(userId, organizationId);
  }
}
```

**Alternative: Include org in conversation ID pattern:**
```typescript
// Conversation IDs could include org prefix
const compositeId = `${organizationId}:${conversationId}`;
// This makes cross-org access impossible by design
```

## Acceptance Criteria

- [ ] Conversation fetch validates organization ownership
- [ ] Invalid org access logged as security warning
- [ ] New conversation created instead of error (no information leakage)
- [ ] Existing conversations still accessible by rightful owners
- [ ] TypeScript compiles without errors
- [ ] Unit test for cross-org access attempt

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Always validate resource ownership, don't trust client-provided IDs |

## Resources

- `src/lib/ai/memory/redis-provider.ts` - Current implementation
- OWASP Insecure Direct Object Reference (IDOR) prevention
