# Ralph Loop: Data Migration & Import

## Objective
Implement a complete data import system for onboarding customers with existing data. This is critical functionality - every customer will ask "how do I import my existing data?" Provides CSV import for customers, products, and historical orders with column mapping, validation, duplicate detection, and rollback capability.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine current story.
If progress.txt doesn't exist, start with the first story in the PRD.

## Context

### PRD File
- `_Initiation/_prd/1-foundation/data-migration/data-migration.prd.json`

### Pattern References
- `_Initiation/_prd/1-foundation/patterns/`
- `_Initiation/_ralph/backend-patterns/server-functions.md`
- `drizzle/schema/` - Existing entity schemas (customers, products, orders)
- `src/lib/schemas/` - Existing Zod validation schemas

### Tech Stack
- Runtime: Bun
- Framework: TanStack Start
- Database: PostgreSQL + Drizzle ORM
- CSV Parsing: papaparse
- Validation: Zod
- File Storage: Supabase Storage (temporary)

## Process
1. Read progress.txt for current story
2. Read PRD for story acceptance criteria
3. Implement acceptance criteria
4. Run: `cd renoz-v3 && bun run typecheck`
5. Run: `cd renoz-v3 && bun run test`
6. If pass: Mark story [x] in progress.txt, output completion promise
7. If fail: Debug and fix

## Completion
When ALL stories pass:
<promise>FOUND_MIGRATE_COMPLETE</promise>

## Constraints

### DO
- Use papaparse for CSV parsing (handles edge cases, streaming for large files)
- Process imports in batches of 100 records to avoid memory issues
- Wrap each batch in a transaction (rollback on error)
- Validate ALL rows before starting import (show all errors upfront)
- Display row number, column, and error message for each validation failure
- Support flexible column mapping (user maps CSV columns to entity fields)
- Detect duplicates during import (by email, ABN, or SKU)
- Create categories on-the-fly during product import
- Mark historical orders with isImported flag
- Log all imports with timestamp, user, record count
- Allow rollback within 24 hours of import
- Scope all imports to current user's organization

### DO NOT
- Allow imports larger than 10MB (enforce server-side)
- Allow imports to other organizations (security)
- Process entire file in memory (stream for large files)
- Start import before validation completes
- Skip batch transactions (partial failures corrupt data)
- Allow rollback after 24 hours (data may be modified)
- Send workflow emails/notifications for imported records
- Trigger inventory movements for imported orders

## Key Patterns

### Batch Processing
```typescript
const BATCH_SIZE = 100;

async function processBatch(records: Record[], batchIndex: number) {
  return await db.transaction(async (tx) => {
    const results = [];
    for (const record of records) {
      const result = await insertRecord(tx, record);
      results.push(result);
    }
    return results;
  });
}
```

### Error Aggregation
```typescript
interface ImportError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

// Collect ALL errors before import
const errors: ImportError[] = [];
rows.forEach((row, index) => {
  const result = schema.safeParse(row);
  if (!result.success) {
    result.error.issues.forEach(issue => {
      errors.push({
        row: index + 1, // 1-indexed for user display
        column: issue.path.join('.'),
        message: issue.message,
        value: row[issue.path[0]]
      });
    });
  }
});
```

### Column Mapping
```typescript
interface ColumnMapping {
  csvColumn: string;
  entityField: string;
  required: boolean;
  transform?: (value: string) => any;
}

// User maps columns in UI, then apply mapping
function applyMapping(row: CSVRow, mapping: ColumnMapping[]): EntityRow {
  const result: Record<string, any> = {};
  for (const map of mapping) {
    const value = row[map.csvColumn];
    result[map.entityField] = map.transform
      ? map.transform(value)
      : value;
  }
  return result;
}
```

### Duplicate Detection
```typescript
// Before import, check for duplicates
async function checkDuplicates(
  records: CustomerRecord[],
  matchField: 'email' | 'abn'
): Promise<{ duplicates: DuplicateInfo[], unique: CustomerRecord[] }> {
  const matchValues = records.map(r => r[matchField]).filter(Boolean);
  const existing = await db.query.customers.findMany({
    where: and(
      eq(customers.organizationId, orgId),
      inArray(customers[matchField], matchValues)
    )
  });
  // Return duplicate info with options: skip/merge/create
}
```

## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories - import needs unit and integration tests for data integrity |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | **CRITICAL** - All stories must use Pattern 3 (Saga) for batch rollback |
| Performance Benchmarks | `_Initiation/_meta/patterns/performance-benchmarks.md` | All import stories - must stream efficiently within memory limits |

**IMPORTANT**: Data migration is high-risk. Error recovery patterns are MANDATORY:
- Pattern 3 (Saga with compensation) for batch transactions
- Each batch wrapped in transaction - rollback preserves partial progress
- Detailed error logging: row number, column, reason for every validation failure

## If Stuck
- After 3 iterations: Add blocker to progress.txt
- After 5 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
