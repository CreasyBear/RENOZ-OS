# Ralph Loop: Global Search (Cross-Domain)

## Objective
Implement cross-domain global search infrastructure enabling users to find customers, orders, quotes, and jobs by any identifier. The Cmd+K command palette provides power users with instant access to any entity in the system, reducing navigation time and improving operational efficiency.

## Required Reading

Before implementing any story, review these critical resources:

### Frontend Components
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

### Pattern Files

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | API & Command Palette | Search <500ms, scale to 1M+ entities, use PostgreSQL FTS |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | Command Palette, Recent Items | Cmd+K (1 action), keyboard nav, recent items on empty |

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with CROSS-SEARCH-001.

## Context

### PRD File
- `_Initiation/_prd/5-cross-domain/search/search.prd.json` - Complete search domain specification

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui
- Foundation PROMPT: `_Initiation/_prd/1-foundation/PROMPT.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Search**: PostgreSQL Full-Text Search (tsvector/tsquery)
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State Management**: TanStack Query

### Why PostgreSQL FTS (Not Elasticsearch)
- Simplicity: No additional infrastructure to manage
- Performance: Adequate for <1M entities with proper indexing
- Cost: No additional service costs
- Integration: Native Drizzle ORM support
- Consistency: Same transaction guarantees as source data

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

Execute stories in dependency order from search.prd.json:

### Phase 1: Schema Foundation
1. **CROSS-SEARCH-001** - Search Index Schema
   - Creates: search_index and recent_items tables
   - Features: tsvector, GIN index, RLS policies
   - Promise: `CROSS_SEARCH_001_COMPLETE`

### Phase 2: Backend Services
2. **CROSS-SEARCH-002** - Search Indexing Service
   - Creates: Database triggers for auto-indexing
   - Features: Trigger-based updates, batch processing
   - Promise: `CROSS_SEARCH_002_COMPLETE`

3. **CROSS-SEARCH-003** - Search API
   - Creates: globalSearch() server function
   - Features: Full-text search, ranking, <500ms response
   - Promise: `CROSS_SEARCH_003_COMPLETE`

### Phase 3: User Interface
4. **CROSS-SEARCH-004** - Command Palette UI
   - Creates: Cmd+K modal with search
   - Features: Keyboard navigation, debounced search
   - Promise: `CROSS_SEARCH_004_COMPLETE`

5. **CROSS-SEARCH-005** - Recent Items Service
   - Creates: Recent items tracking and display
   - Features: Auto-tracking, command palette integration
   - Promise: `CROSS_SEARCH_005_COMPLETE`

## File Structure

Search domain files follow this structure:

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── search-index.ts      # search_index table
│   │   │   ├── recent-items.ts      # recent_items table
│   │   │   └── index.ts             # Export all schemas
│   │   └── schemas/
│   │       └── search.ts            # Zod validation schemas
│   ├── server/
│   │   └── functions/
│   │       ├── search.ts            # globalSearch API
│   │       ├── search-indexing.ts   # Indexing service
│   │       └── recent-items.ts      # Recent items API
│   ├── hooks/
│   │   ├── use-global-search.ts     # Search query hook
│   │   ├── use-command-palette.ts   # Palette state hook
│   │   └── use-recent-items.ts      # Recent items hook
│   └── components/
│       └── shared/
│           ├── command-palette.tsx      # Main palette component
│           ├── search-result-item.tsx   # Result item component
│           └── recent-items-section.tsx # Recent items section
└── drizzle/
    └── migrations/
        ├── 020_search_index.ts      # Schema migration
        └── 021_search_triggers.ts   # Trigger migration
```

## Constraints

### DO
- Use PostgreSQL full-text search (tsvector/tsquery)
- Create GIN indexes for search_vector columns
- Implement debounced search (300ms) in UI
- Support full keyboard navigation
- Ensure <500ms response time for all searches
- Use Zod for all input validation
- Implement proper RLS policies
- Follow shadcn/ui patterns for command palette
- Test on 10k+ entities for performance validation

### DO NOT
- Use external search services (Elasticsearch, Algolia, etc.)
- Skip keyboard accessibility
- Hardcode entity type mappings (make configurable)
- Block UI during search operations
- Store search queries for analytics (privacy)
- Create N+1 query patterns in result fetching

## PostgreSQL FTS Reference

### Creating tsvector
```sql
-- Combine multiple fields with weights
UPDATE search_index SET search_vector =
  setweight(to_tsvector('english', coalesce(entity_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(entity_number, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(entity_email, '')), 'C');
```

### Querying with tsquery
```sql
SELECT * FROM search_index
WHERE organization_id = $1
  AND search_vector @@ plainto_tsquery('english', $2)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC
LIMIT 20;
```

### Drizzle ORM Pattern
```typescript
// Use sql template for FTS operations
import { sql } from 'drizzle-orm';

const results = await db
  .select()
  .from(searchIndex)
  .where(
    and(
      eq(searchIndex.organizationId, orgId),
      sql`${searchIndex.searchVector} @@ plainto_tsquery('english', ${query})`
    )
  )
  .orderBy(
    sql`ts_rank(${searchIndex.searchVector}, plainto_tsquery('english', ${query})) DESC`
  )
  .limit(20);
```

## Completion Promise

When ALL search domain stories pass successfully:
```xml
<promise>CROSS_SEARCH_COMPLETE</promise>
```

## Key Success Metrics

- Search response time < 500ms for any query
- Command palette opens in < 100ms
- Full keyboard navigation support
- Recent items load in < 200ms
- Zero TypeScript errors
- All tests passing
- RLS policies protecting search data
- Accessible to screen readers (WCAG 2.1 AA)

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - tsvector syntax errors -> Check PostgreSQL FTS documentation
  - Drizzle FTS queries -> Use sql`` template literals
  - Keyboard focus issues -> Check focus trap implementation
  - Performance issues -> Verify GIN indexes are created

## Progress Template

```markdown
# Global Search Infrastructure Progress
# PRD: search.prd.json
# Started: [DATE]
# Updated: [DATE]

## Stories (5 total)

- [ ] CROSS-SEARCH-001: Search Index Schema
- [ ] CROSS-SEARCH-002: Search Indexing Service
- [ ] CROSS-SEARCH-003: Search API
- [ ] CROSS-SEARCH-004: Command Palette UI
- [ ] CROSS-SEARCH-005: Recent Items Service

## Current Story
Not started

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- Progress tracking initialized
```

---

**Document Version:** 1.0
**Created:** 2026-01-17
**Target:** renoz-v3 Global Search Infrastructure
**Completion Promise:** CROSS_SEARCH_COMPLETE
