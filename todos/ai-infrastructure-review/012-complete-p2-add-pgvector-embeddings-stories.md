---
status: complete
priority: p2
issue_id: "012"
tags: [prd-review, schema, pgvector, memory, ai-infrastructure]
dependencies: []
---

# Add pgvector Long-Term Memory Stories

## Problem Statement

The PRD describes a three-tier memory architecture with pgvector for long-term memory, but no stories define:
- The embeddings table schema
- The embedding generation pipeline
- The retrieval augmentation pattern

Without these, the "learned preferences" and "pattern insights" features cannot be implemented.

## Findings

**Source:** Architecture Strategist Agent

**Location:** PRD lines 338-345 (longTerm memory section)

**PRD specifies:**
```json
"longTerm": {
  "backend": "Postgres + pgvector",
  "ttl": "permanent",
  "contents": ["learned preferences", "user corrections", "pattern insights"],
  "embedding": "bge-large-en-v1.5 (1024 dim)"
}
```

**Missing:**
1. No schema for embeddings table
2. No story for embedding generation
3. No story for retrieval augmentation

## Proposed Solutions

### Option A: Add Stories to Current PRD (Recommended)
- **Pros:** Complete memory architecture
- **Cons:** Extends PRD scope
- **Effort:** Medium (3 new stories)
- **Risk:** Low

### Option B: Defer to Future PRD
- **Pros:** Keeps v1.0 scope smaller
- **Cons:** Long-term memory won't work in v1.0
- **Effort:** None for now
- **Risk:** Low

## Recommended Action

Option A - Add stories AI-INFRA-020, AI-INFRA-021, AI-INFRA-022.

## Technical Details

**New story AI-INFRA-020: Long-Term Memory Schema:**
```json
{
  "id": "AI-INFRA-020",
  "name": "Long-Term Memory Embeddings Schema",
  "type": "schema",
  "acceptance_criteria": [
    "Table ai_long_term_memory exists in drizzle/schema/_ai/",
    "Fields: id, organization_id, user_id, content_type, content, embedding (vector(1024)), metadata, created_at",
    "HNSW index on embedding for approximate nearest neighbor",
    "Partition by organization_id for multi-tenant isolation"
  ]
}
```

**Schema:**
```typescript
export const aiLongTermMemory = pgTable(
  "ai_long_term_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id"),
    contentType: text("content_type").notNull(), // 'preference', 'correction', 'insight'
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    embeddingIdx: index("idx_ai_memory_embedding_hnsw")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
  })
);
```

**New story AI-INFRA-021: Embedding Pipeline:**
```json
{
  "id": "AI-INFRA-021",
  "name": "Embedding Generation Pipeline",
  "acceptance_criteria": [
    "Function generateEmbedding(text) returns 1024-dim vector",
    "Uses bge-large-en-v1.5 model",
    "Batch embedding support for efficiency",
    "Triggers on user corrections and explicit feedback"
  ]
}
```

**New story AI-INFRA-022: Retrieval Augmentation:**
```json
{
  "id": "AI-INFRA-022",
  "name": "Memory Retrieval Augmentation",
  "acceptance_criteria": [
    "Function retrieveRelevantMemory(query, limit) returns similar memories",
    "Similarity threshold configurable",
    "Memory injected into agent context via injectMemoryContext()"
  ]
}
```

## Acceptance Criteria

- [ ] Stories AI-INFRA-020, 021, 022 added to PRD
- [ ] Schema includes pgvector HNSW index
- [ ] Embedding model specified (bge-large-en-v1.5)
- [ ] Dependencies updated for story ordering

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from architecture review | Long-term memory needs explicit implementation stories |

## Resources

- pgvector documentation
- Hugging Face bge-large-en-v1.5 model
