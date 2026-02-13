# no-explicit-any Remediation Plan

**Goal:** Eliminate all 267 `@typescript-eslint/no-explicit-any` violations using schema-at-source practices. No bandaids.

**Standards:** [SCHEMA-TRACE.md](../SCHEMA-TRACE.md) §4 Type Definition Standards, [STANDARDS.md](../STANDARDS.md)

---

## Principles

1. **Schema at source** — Types live in `lib/schemas/{domain}/`, never inline in components/hooks/server.
2. **Trace-through** — Follow data flow: UI → Hook → Server → DB. Types flow from schema.
3. **No `any`** — Use `unknown` for truly unknown values; use domain types for known shapes; use `Record<string, T>` for flexible objects.
4. **ServerFn boundary** — `flexibleJsonSchema` (z.record(z.string(), z.any())) is the documented exception for JSONB/wire types; see SCHEMA-TRACE.md §4.

---

## Remediation Strategy by Context

### 1. Error / Catch / Unknown Values

| Pattern | Replace | Location |
|---------|---------|----------|
| `catch (e: any)` | `catch (e: unknown)` + narrow | Everywhere |
| `Record<string, any>` for metadata | `Record<string, unknown>` | error-handling.ts, AppError.details |
| `(...args: any[]) => R` | `<T extends unknown[]>(...args: T) => R` | withErrorHandling |

### 2. Third-Party / External API Responses

| Pattern | Replace | Location |
|---------|---------|----------|
| Google/Outlook API responses | Define interfaces for consumed fields in `lib/schemas/integrations/` | gmail.ts, outlook.ts |
| OAuth provider responses | Define in `lib/schemas/oauth/` | oauth/*.ts |

### 3. Database / Drizzle

| Pattern | Replace | Location |
|---------|---------|----------|
| `PostgresJsDatabase<any>` | `PostgresJsDatabase<typeof schema>` or generic | oauth/*, email-sync, etc. |
| `rowData: any` | Typed from Drizzle select result | price-imports.ts |
| `as any` on return | Explicit return type from schema | custom-fields.ts, job-templates.ts |

### 4. Form / React Hook Form

| Pattern | Replace | Location |
|---------|---------|----------|
| `form.watch()` in deps | Extract to variable, use in deps | template-editor, use-template-editor |
| `(item: any)` in map | Import entity type from schema | quote-versions, job-data-parsing |

### 5. Generic / Polymorphic

| Pattern | Replace | Location |
|---------|---------|----------|
| `(value: any)` | `<T>(value: T)` or `(value: unknown)` | monitoring.ts, health-check.ts |
| `(data: any)` | Domain type from schema | settings-sections-extended, preferences |

### 6. JSONB / Flexible JSON

| Pattern | Replace | Location |
|---------|---------|----------|
| `Record<string, any>` for filters | `FlexibleJson` from patterns (ServerFn boundary) | custom-fields, system-settings |
| Arbitrary JSON in components | `Record<string, unknown>` or domain schema | inventory, dashboard |

---

## Phased Execution

### Phase 1: Shared Schema & Lib (Foundation)
- [x] `lib/error-handling.ts` — AppError.details, ErrorContext.metadata, withErrorHandling (Record<string, unknown>, unknown[])
- [ ] `lib/health-check.ts`
- [ ] `lib/monitoring.ts`

### Phase 2: Server Functions (Source of Truth)
- [ ] `server/functions/settings/custom-fields.ts` — Explicit return types
- [x] `server/functions/settings/system-settings.ts` — entityType: AuditEntityType
- [x] `server/functions/suppliers/price-imports.ts` — rowData: Record<string, string>
- [ ] `server/functions/oauth/*` — DB types, connection types
- [ ] `server/functions/jobs/job-templates.ts`, `job-documents.ts`, `job-data-parsing.ts`
- [ ] `server/functions/pipeline/quote-versions.tsx`

### Phase 3: Hooks & Contexts
- [ ] `hooks/orders/use-fulfillment-exports.ts`
- [ ] `hooks/users/use-preferences.ts`
- [ ] `contexts/inventory-context.tsx`

### Phase 4: Components
- [x] `components/domain/inventory/containers/inventory-detail-container.tsx` — MovementWithRelations, InventoryCostLayerRow
- [x] `components/domain/inventory/unified-inventory-dashboard.tsx` — TriggeredAlert, DashboardTopMovingItem
- [x] `contexts/inventory-context.tsx` — TriggeredAlert
- [x] `routes/_authenticated/inventory/alerts-page.tsx` — AlertListItem
- [ ] `components/domain/settings/*`
- [ ] `components/domain/communications/*` (from full lint)
- [ ] `components/domain/customers/*`
- [ ] `components/integrations/oauth/*`
- [ ] `components/mobile/*`

### Phase 5: Email Providers & OAuth Lib
- [ ] `lib/email-providers/gmail.ts`
- [ ] `lib/email-providers/outlook.ts`
- [ ] `lib/oauth/calendar-sync.ts`, `connections.ts`, `contacts-client.ts`

---

## Schema Additions (New Types)

Create as needed:

| Schema File | Types to Add |
|-------------|--------------|
| `lib/schemas/_shared/patterns.ts` | `JsonValue` (recursive), document `FlexibleJson` |
| `lib/schemas/integrations/` | `GmailMessage`, `OutlookEvent`, etc. (consumed fields only) |
| `lib/schemas/oauth/` | `OAuthConnection`, `CalendarEventWire`, etc. |
| `lib/schemas/settings/` | `ListCustomFieldsResult`, `CustomFieldResponse` (if not exists) |

---

## Verification

After each phase:
```bash
npx eslint src --no-error-on-unmatched-pattern 2>&1 | grep "no-explicit-any" | wc -l
```

Target: 0 (except documented FlexibleJson in patterns.ts).
