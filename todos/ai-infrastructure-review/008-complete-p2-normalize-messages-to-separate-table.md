---
status: complete
priority: p2
issue_id: "008"
tags: [prd-review, schema, performance, data-integrity, ai-infrastructure]
dependencies: []
---

# Normalize Messages to Separate Table

## Problem Statement

The PRD specifies storing all conversation messages as an unbounded JSONB array in `ai_conversations.messages`. This will cause:
- Performance degradation as conversations grow
- Memory issues with large conversations
- No pagination for long message history
- Inability to index individual messages

## Findings

**Source:** Data Integrity Guardian Agent, Performance Oracle Agent

**Location:** PRD lines 48-49 (ai_conversations.messages field)

**Current design:**
```json
"messages": "jsonb NOT NULL DEFAULT '[]'::jsonb"
```

**Problems:**
1. A conversation could accumulate 100+ messages (megabytes of JSONB)
2. Every read loads the entire message history
3. Cannot query individual messages efficiently
4. No soft-delete for individual messages

## Proposed Solutions

### Option A: Separate Messages Table (Recommended)
- **Pros:** Efficient pagination, indexable, proper normalization
- **Cons:** More complex queries, additional table
- **Effort:** Medium
- **Risk:** Low

### Option B: Implement Message Limits in Application
- **Pros:** Simpler schema
- **Cons:** Still has JSONB performance issues, harder to enforce
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

Option A - Create `ai_conversation_messages` table.

## Technical Details

**New table schema:**
```typescript
export const aiConversationMessages = pgTable(
  "ai_conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system' | 'tool'
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls").$type<ToolCall[]>(),
    toolResults: jsonb("tool_results").$type<ToolResult[]>(),
    tokensUsed: integer("tokens_used"),
    agentName: text("agent_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index("idx_ai_messages_conversation").on(
      table.conversationId,
      table.createdAt
    ),
  })
);
```

**Update ai_conversations table:**
- Remove `messages` JSONB column
- Keep `lastMessageAt` for quick sorting

**Migration strategy:**
1. Create new table
2. Migrate existing messages (if any)
3. Drop old column

## Acceptance Criteria

- [ ] `ai_conversation_messages` table added to PRD
- [ ] Index on (conversation_id, created_at) for pagination
- [ ] Cascade delete when conversation deleted
- [ ] PRD story AI-INFRA-001 updated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from data integrity review | Unbounded JSONB arrays are anti-pattern |

## Resources

- Existing message storage patterns
- PostgreSQL JSONB performance considerations
