# Testing Standards for renoz-v3

> **Purpose**: Define testing requirements and expectations for all PRD stories
> **Last Updated**: 2026-01-17
> **Status**: Active

---

## Story-Level Testing Requirements

### Schema Stories
- Migration runs successfully (up and down)
- TypeScript types inferred correctly
- Indexes created and used by query planner

### Server Stories
- Unit tests for business logic (isolated, mocked DB)
- Integration tests for server functions (real DB, test tenant)
- Error cases explicitly tested

### UI Stories
- Component renders without errors
- Keyboard navigation works
- Loading/error/empty states covered
- Mobile viewport renders correctly

---

## Critical Path Tests (Required before each phase)

### Foundation Phase
```bash
# Auth works
bun test:e2e -- --grep "login flow"

# Multi-tenant isolation
bun test:integration -- --grep "tenant isolation"
```

### Domain Phase
```bash
# Customer CRUD
bun test:e2e -- --grep "customer management"

# Quote to order flow
bun test:e2e -- --grep "quote acceptance"
```

### Integration Phase
```bash
# Xero sync (mocked)
bun test:integration -- --grep "xero sync"

# Email delivery (mocked)
bun test:integration -- --grep "email send"
```

---

## Test File Structure
```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Server + DB tests
├── e2e/            # Full browser tests
└── fixtures/       # Shared test data
```

---

## Coverage Expectations

| Component Type | Line Coverage | Required Tests |
|----------------|---------------|----------------|
| Server functions | 80% | Unit + integration |
| UI components | N/A | Render + 1 interaction minimum |
| Critical paths | 100% | Happy path e2e |
| Utility functions | 90% | Unit tests |

---

## When to Write Tests

| Phase | Testing Activity |
|-------|-----------------|
| **During implementation** | Write tests alongside code (TDD preferred) |
| **Before PR** | All acceptance criteria have corresponding tests |
| **Never** | After implementation is "done" |

### TDD Flow for Ralph Loop

```
1. Read story acceptance criteria
2. Write failing test that verifies criterion
3. Implement code to pass test
4. Refactor if needed
5. Repeat for next criterion
6. Mark story complete only when all tests pass
```

---

## Acceptance Criteria Testing

Each acceptance criterion in a story MUST be:

1. **Testable** - Can be verified with automated test
2. **Tested** - Has corresponding test before story completion
3. **Traced** - Test name references the story ID

### Naming Convention

```typescript
// Unit test
describe('CUS-001: Create Customer Schema', () => {
  it('should have all required fields', () => { ... });
  it('should enforce type enum values', () => { ... });
});

// E2E test
test('CUS-003: Customer DataTable displays pagination', async () => { ... });
```

---

## Test Categories

### Unit Tests (`tests/unit/`)
- Pure functions, utilities, validators
- Mocked dependencies
- Fast execution (< 100ms each)
- Run on every save during development

### Integration Tests (`tests/integration/`)
- Server functions with real database
- Test tenant isolation
- API contract verification
- Run before commit

### E2E Tests (`tests/e2e/`)
- Full browser automation
- Critical user journeys
- Run before merge

---

## Mocking Guidelines

### Mock External Services
- Xero API
- Email delivery (Resend)
- File storage
- Third-party webhooks

### Do NOT Mock
- Database (use test tenant)
- RLS policies (critical for security)
- Authentication (use test users)

---

## Test Data Management

### Test Tenant
- ID: `test-tenant-001`
- Isolated data per test run
- Cleaned up after test suite

### Fixtures
```typescript
// tests/fixtures/customers.ts
export const testCustomer = {
  id: 'cus_test_001',
  name: 'Test Customer',
  email: 'test@example.com',
  type: 'residential',
  status: 'active',
};
```

---

## CI/CD Integration

```yaml
# Run on every PR
test:unit:
  script: bun test:unit

test:integration:
  script: bun test:integration
  services:
    - postgres:16

test:e2e:
  script: bun test:e2e
  only:
    - main
    - merge_requests
```

---

*These standards ensure consistent quality across all renoz-v3 development.*
