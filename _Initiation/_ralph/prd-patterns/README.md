# PRD Patterns for Ralph Compliance

> **Making PRDs Ralph-Ready: Structure, Content, and Validation Standards**
> **Based on**: Systematic audit of 44 PRDs
> **Purpose**: Ensure PRDs are optimized for autonomous execution

---

## Overview

PRDs must be structured for both human readability and Ralph autonomous execution. Our audit revealed that current PRDs have good content but need optimization for AI consumption.

**Key Finding**: 82% overall compliance, but critical blockers prevent reliable execution.

---

## Required Ralph Fields

Every story must include these exact fields:

```json
{
  "id": "CATEGORY-NNN",
  "name": "Human-readable story title",
  "description": "Clear, specific description of work",
  "priority": 1,
  "status": "pending",
  "acceptance_criteria": ["Specific, testable criteria"],
  "dependencies": ["Array of story IDs"],
  "estimated_iterations": 3,
  "completion_promise": "STORY_ID_COMPLETE"
}
```

### Field Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier (DOMAIN-NNN format) |
| `name` | string | ✅ | Short, descriptive title |
| `description` | string | ✅ | What needs to be done |
| `priority` | number | ✅ | Execution order (1 = highest) |
| `status` | string | ✅ | "pending", "in_progress", "completed" |
| `acceptance_criteria` | array | ✅ | Testable completion conditions |
| `dependencies` | array | ✅ | Story IDs that must complete first |
| `estimated_iterations` | number | ✅ | Expected Ralph loop iterations |
| `completion_promise` | string | ✅ | "STORY_ID_COMPLETE" format |

---

## Forbidden Fields (Break Ralph)

❌ **Never include these in story objects:**

- `"passes": false` (conflicts with `status`)
- `"type": "ui-component"` (Ralph can't parse)
- `"ui_spec": {...}` (too complex for Ralph)
- `"files_to_modify": [...]` (metadata, not requirements)

**Solution**: Move forbidden fields to `enhancements` object:

```json
{
  "id": "DOM-CUST-001",
  "name": "Customer Tags: UI Components",
  "description": "Create UI for managing customer tags",
  // ... required Ralph fields ...
  "enhancements": {
    "type": "ui-component",
    "ui_spec": { /* detailed UI requirements */ },
    "files_to_modify": [/* file list */],
    "wireframe_reference": "path/to/wireframe.md"
  }
}
```

---

## Acceptance Criteria Patterns

### ✅ Good Criteria (Ralph-Can-Verify)

```json
"acceptance_criteria": [
  "File src/components/domain/customers/tag-badge.tsx exists and renders colored tag badge with name and color props",
  "File src/components/domain/customers/tag-selector.tsx exists as multi-select combobox for tags with search",
  "Customer detail page loads tag badge component showing tags below customer name",
  "npm run typecheck passes without TypeScript errors",
  "Component renders in < 200ms (performance requirement)"
]
```

### ❌ Bad Criteria (Ralph-Cannot-Verify)

```json
"acceptance_criteria": [
  "Create UI for managing customer tags",
  "Add proper styling and responsiveness",
  "Ensure good user experience",
  "Make it look nice"
]
```

### Criteria Writing Rules

1. **Start with "File"** - Specify exact file paths
2. **Include component/function names** - Be specific about what to create
3. **Add measurable outcomes** - Performance, accessibility requirements
4. **Include TypeScript compilation** - "npm run typecheck passes"
5. **Specify integration points** - Where/how component is used

---

## Story Templates by Type

### Schema Stories

```json
{
  "id": "DOM-CUST-001a",
  "name": "Customer Tags: Schema",
  "description": "Create database schema for customer tags and tag assignments",
  "priority": 1,
  "status": "pending",
  "acceptance_criteria": [
    "File lib/schema/customer-tags.ts exists with customerTags table definition",
    "Table includes id (uuid), name (varchar), color (varchar), orgId (uuid FK), timestamps",
    "Proper RLS policies following existing schema patterns",
    "Migration file created in drizzle/migrations/",
    "Types exported: CustomerTag, CustomerTagInsert, CustomerTagUpdate",
    "npm run db:generate succeeds",
    "npm run typecheck passes"
  ],
  "dependencies": [],
  "estimated_iterations": 3,
  "completion_promise": "DOM_CUST_001A_COMPLETE"
}
```

### Server Function Stories

```json
{
  "id": "DOM-CUST-001b",
  "name": "Customer Tags: Server Functions",
  "description": "Create server functions for tag CRUD and assignment operations",
  "priority": 2,
  "status": "pending",
  "acceptance_criteria": [
    "File src/server/functions/customer-tags.ts exists",
    "createTag function validates and creates tags using withRLSContext",
    "getTags function returns all tags for organization",
    "updateTag function updates with version checking",
    "deleteTag function soft-deletes and unassigns",
    "All functions use Zod schemas from lib/schemas/customer-tags.ts",
    "npm run typecheck passes"
  ],
  "dependencies": ["DOM-CUST-001a"],
  "estimated_iterations": 4,
  "completion_promise": "DOM_CUST_001B_COMPLETE"
}
```

### UI Component Stories

```json
{
  "id": "DOM-CUST-001c",
  "name": "Customer Tags: UI Components",
  "description": "Create UI components for managing and displaying customer tags",
  "priority": 3,
  "status": "pending",
  "acceptance_criteria": [
    "File src/components/domain/customers/tag-badge.tsx exists and renders colored badges",
    "File src/components/domain/customers/tag-selector.tsx exists as accessible multi-select",
    "Tag selector shows empty state 'No tags yet' when no tags exist",
    "Keyboard navigation: Tab through options, Enter/Space to select",
    "ARIA labels present for screen reader support",
    "Customer detail page integrates tag components",
    "npm run typecheck passes",
    "Component loads in < 200ms with 10 tags"
  ],
  "dependencies": ["DOM-CUST-001b"],
  "estimated_iterations": 5,
  "completion_promise": "DOM_CUST_001C_COMPLETE",
  "enhancements": {
    "type": "ui-component",
    "ui_spec": { /* detailed UI requirements */ },
    "wireframe_reference": "memory-bank/prd/_wireframes/domains/DOM-CUST-001c.wireframe.md"
  }
}
```

---

## Dependency Patterns

### Correct Format

```json
"dependencies": ["DOM-CUST-001a", "DOM-CUST-001b"]
```

### Anti-Patterns

```json
// ❌ Wrong: Objects instead of strings
"dependencies": [
  {"id": "DOM-CUST-001a", "status": "required"}
]

// ❌ Wrong: Inconsistent format
"dependencies": {
  "required": ["DOM-CUST-001a"],
  "optional": ["DOM-CUST-001b"]
}
```

---

## Compliance Validation

### Automated Checks

- [ ] All required Ralph fields present
- [ ] No forbidden fields in story objects
- [ ] Completion promise follows STORY_ID_COMPLETE format
- [ ] Acceptance criteria start with "File" or include specific paths
- [ ] Dependencies are string arrays
- [ ] estimated_iterations is a number 1-10

### Manual Review

- [ ] Acceptance criteria are specific and testable
- [ ] Story fits within context window limits
- [ ] Dependencies form valid execution order
- [ ] Priority values are sequential

---

## Migration Guide

### From Current PRDs to Ralph-Compliant

1. **Remove conflicting fields**:

   ```bash
   # Remove 'passes' field from all stories
   jq 'del(.stories[].passes)' prd.json > prd-clean.json
   ```

2. **Move extra fields to enhancements**:

   ```json
   // Before
   {
     "type": "ui-component",
     "ui_spec": {...}
   }

   // After
   {
     "enhancements": {
       "type": "ui-component",
       "ui_spec": {...}
     }
   }
   ```

3. **Rewrite vague criteria**:

   ```json
   // Before
   ["Create UI for tags", "Add styling"]

   // After
   ["File src/components/tag-badge.tsx exists and renders colored badges", "Component uses CSS variables for theming"]
   ```

---

## References

- **Audit Results**: `../../_audits/systematic-ralph-audit.json`
- **Ralph Guidelines**: `../../_meta/ralph-guidelines.md`
- **Story Templates**: `./story-templates/`
- **Validation Tools**: `../validation-tools/`
