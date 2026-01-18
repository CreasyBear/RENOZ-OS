# Ralph Loop: Jobs Domain Phase

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. Do NOT create local formatCurrency functions or duplicate UI patterns.

## Objective
Build the Jobs/Projects domain for battery installation and field work management. Jobs track work at customer sites including tasks, BOMs, time tracking, and commissioning checklists. This domain is critical for v1 field operations.

## Required Reading

> **IMPORTANT:** These patterns are MANDATORY for all story implementations in this domain.

| Pattern | File | Applies To | Key Requirements |
|---------|------|------------|------------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories | TDD flow, 80% server coverage, story-level tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Server stories (DOM-JOBS-001b, time tracking, templates) | Offline conflict resolution for mobile, saga for templates |
| Performance | `_Initiation/_meta/patterns/performance-benchmarks.md` | API & UI stories | Calendar <1s, costing reports <3s, time entries <500ms |
| 3-Click Rule | `_Initiation/_meta/patterns/ux-3-click-rule.md` | UI stories | FAB timer (1 tap), swipe task complete (1 action), 48px targets |

## Premortem Remediation: Optional SLA Tracking for Job Completion

**Source:** `_meta/remediation-sla-engine.md`

This domain MAY use the unified SLA calculation engine for optional job completion SLAs.

### Key Concept

Unlike Support and Warranty where SLA is mandatory, **Jobs domain SLA is OPTIONAL**:
- Job templates can optionally specify an `slaConfigurationId` for completion targets
- When a job is created from a template with SLA config, SLA tracking starts
- Job completion records the resolution timestamp
- Job reschedule may adjust the SLA target

### Schema Changes

| Table | Column | Purpose |
|-------|--------|---------|
| `job_templates` | `slaConfigurationId` | Optional FK to sla_configurations for completion SLA |
| `job_assignments` | `sla_tracking_id` | Optional FK to sla_tracking for per-job SLA state |

### Example SLA Configuration for Jobs

```typescript
// Optional - only create if job completion SLAs are needed
{
  domain: 'jobs',
  name: 'Residential Install Completion SLA',
  responseTargetValue: null, // Jobs don't have response SLA
  responseTargetUnit: null,
  resolutionTargetValue: 2,
  resolutionTargetUnit: 'days',
  atRiskThresholdPercent: 25,
}
```

### Implementation Pattern

```typescript
// When creating job from template
import { SlaStateManager } from '@/lib/sla/state-manager';

if (template.slaConfigurationId) {
  const tracking = await SlaStateManager.startTracking({
    organizationId,
    domain: 'jobs',
    entityType: 'job_assignment',
    entityId: job.id,
    configId: template.slaConfigurationId,
  });
  // Store tracking ID on job
  await updateJob(job.id, { slaTrackingId: tracking.id });
}

// When completing job
if (job.slaTrackingId) {
  await SlaStateManager.recordResolution(job.slaTrackingId, new Date(), userId);
}
```

### DO NOT Implement

- Mandatory SLA tracking for all jobs (it's optional)
- Response SLA for jobs (only resolution/completion)
- Custom SLA calculation logic (use unified engine if needed)

## Current State
Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with DOM-JOBS-001a.

## Context

### PRD File
- `opc/_Initiation/_prd/2-domains/jobs/jobs.prd.json` - All 18 stories for Jobs domain

### Wireframe Files
| Story ID | Wireframe File |
|----------|----------------|
| DOM-JOBS-001c | `./wireframes/jobs-task-management.wireframe.md` |
| DOM-JOBS-002c | `./wireframes/jobs-bom-tracking.wireframe.md` |
| DOM-JOBS-003c | `./wireframes/jobs-time-tracking.wireframe.md` |
| DOM-JOBS-004c | `./wireframes/jobs-checklist.wireframe.md` |
| DOM-JOBS-005a/b | `./wireframes/jobs-scheduling-calendar.wireframe.md` |
| DOM-JOBS-007c | `./wireframes/jobs-templates.wireframe.md` |
| DOM-JOBS-008b | `./wireframes/jobs-costing-report.wireframe.md` |

### Reference Files
- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Wireframes index: `./wireframes/index.md`

### Tech Stack
- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Drag-Drop**: @dnd-kit/core (for calendar and task reordering)

## Story Execution Order

Stories are organized by feature group with strict dependency chains. Schema stories must complete before server function stories, which must complete before UI stories.

### Phase 1: Task Management (Priority 1)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-001a | Job Task Management: Schema | schema | None | 2 |
| DOM-JOBS-001b | Job Task Management: Server Functions | server-function | DOM-JOBS-001a | 2 |
| DOM-JOBS-001c | Job Task Management: UI | ui-component | DOM-JOBS-001b | 3 |

### Phase 2: BOM Tracking (Priority 2)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-002a | Job BOM Tracking: Schema | schema | None | 2 |
| DOM-JOBS-002b | Job BOM Tracking: Server Functions | server-function | DOM-JOBS-002a | 3 |
| DOM-JOBS-002c | Job BOM Tracking: UI | ui-component | DOM-JOBS-002b | 3 |

### Phase 3: Time Tracking (Priority 3)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-003a | Time Tracking: Schema | schema | None | 2 |
| DOM-JOBS-003b | Time Tracking: Server Functions | server-function | DOM-JOBS-003a | 2 |
| DOM-JOBS-003c | Time Tracking: UI | ui-component | DOM-JOBS-003b | 3 |

### Phase 4: Commissioning Checklists (Priority 4)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-004a | Commissioning Checklist: Schema | schema | None | 2 |
| DOM-JOBS-004b | Commissioning Checklist: Server Functions | server-function | DOM-JOBS-004a | 3 |
| DOM-JOBS-004c | Commissioning Checklist: UI | ui-component | DOM-JOBS-004b | 4 |

### Phase 5: Job Scheduling Calendar (Priority 5)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-005a | Job Scheduling Calendar: Basic | ui-component | None | 3 |
| DOM-JOBS-005b | Job Scheduling Calendar: Drag-Drop | ui-component | DOM-JOBS-005a | 3 |

### Phase 6: Job Templates (Priority 7)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-007a | Job Templates: Schema | schema | DOM-JOBS-001c, DOM-JOBS-002c, DOM-JOBS-004c | 2 |
| DOM-JOBS-007b | Job Templates: Server Functions | server-function | DOM-JOBS-007a | 3 |
| DOM-JOBS-007c | Job Templates: UI | ui-component | DOM-JOBS-007b | 3 |

### Phase 7: Job Costing Reports (Priority 8)
| Story ID | Name | Type | Dependencies | Est. Iterations |
|----------|------|------|--------------|-----------------|
| DOM-JOBS-008a | Job Costing Report: Server Functions | server-function | DOM-JOBS-002c, DOM-JOBS-003c | 3 |
| DOM-JOBS-008b | Job Costing Report: UI | ui-component | DOM-JOBS-008a | 3 |

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **For UI stories**: Read the corresponding wireframe file first
4. **Implement the acceptance criteria** completely
5. **Run verification**:
   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```
6. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Blockers Identified

### Schema Tables Required (Must Exist Before Jobs Domain)
The PRD specifies these tables must exist:
- `organizations` - EXISTS
- `job_assignments` - EXISTS
- `users` - EXISTS
- `customers` - EXISTS
- `orders` - EXISTS
- `products` - EXISTS
- `inventory_items` - EXISTS

### Schema Tables Created By Jobs Domain
| Table | Created By Story |
|-------|------------------|
| `job_tasks` | DOM-JOBS-001a |
| `job_materials` | DOM-JOBS-002a |
| `job_time_entries` | DOM-JOBS-003a |
| `checklist_templates` | DOM-JOBS-004a |
| `job_checklists` | DOM-JOBS-004a |
| `job_checklist_items` | DOM-JOBS-004a |
| `job_templates` | DOM-JOBS-007a |

### Server Functions Created By Jobs Domain
| File | Functions | Created By |
|------|-----------|------------|
| `job-tasks.ts` | listJobTasks, createTask, updateTask, deleteTask, reorderTasks | DOM-JOBS-001b |
| `job-materials.ts` | listJobMaterials, addJobMaterial, updateJobMaterial, removeJobMaterial, reserveJobStock, calculateJobMaterialCost | DOM-JOBS-002b |
| `job-time.ts` | startTimer, stopTimer, createManualEntry, updateTimeEntry, deleteTimeEntry, getJobTimeEntries, calculateJobLaborCost | DOM-JOBS-003b |
| `checklists.ts` | listChecklistTemplates, createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, applyChecklistToJob, updateChecklistItem, getJobChecklist | DOM-JOBS-004b |
| `jobs.ts` | rescheduleJob (added) | DOM-JOBS-005b |
| `job-templates.ts` | listJobTemplates, createJobTemplate, updateJobTemplate, deleteJobTemplate, createJobFromTemplate | DOM-JOBS-007b |
| `job-costing.ts` | calculateJobCost, getJobProfitability, getJobCostingReport | DOM-JOBS-008a |

## Domain-Specific Constraints

### Mobile-First UI Design
Jobs domain is primarily used by field technicians. All UI stories MUST follow:
- **Touch targets**: Minimum 44px, prefer 48px for primary actions
- **One-handed operation**: Primary actions reachable by thumb
- **Outdoor visibility**: High contrast, no subtle grays, bold typography
- **Glove-friendly**: Extra padding, forgiving hit areas
- **Offline-capable**: Clear sync status indicators

### Existing Job Infrastructure
The following already exists and should NOT be recreated:
- Job CRUD operations in `src/server/functions/jobs.ts`
- Job assignments to technicians
- Photo capture (before/during/after/issue)
- Public sign-off page with token
- Job status tracking
- Customer signature capture
- Serial number verification
- GPS location tracking
- Mobile-responsive installer views (`installer/jobs/$jobId.tsx`)
- Today's jobs dashboard for installers
- Weekly schedule view (list format)
- Issue reporting from field
- Installer to office messaging
- PWA infrastructure

### Component Patterns
Follow these existing patterns from the codebase:
- SortableList for drag-drop reordering (use @dnd-kit)
- FormDialog for add/edit dialogs
- DataTable for list views (TanStack Table)
- TabPanel for job detail tabs
- Sheet/BottomSheet for mobile dialogs

### Business Terminology
- **Job Types**: Battery installation, Inverter install, Full system commissioning, Warranty service
- **Typical Jobs**: Residential (1-2 days), Commercial (3-5 days), Large commercial (1-2 weeks)
- Use generic terms, NOT branded product names (e.g., "Battery System" not specific brand names)

## Completion

When ALL 18 jobs stories pass:
```xml
<promise>JOBS_DOMAIN_COMPLETE</promise>
```

## Constraints

### DO
- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story
- Read wireframe files before implementing UI stories
- Use REUI reference components where specified in wireframes

### DO NOT
- Modify existing job functionality (only extend)
- Skip acceptance criteria
- Use client-side auth checks alone (always server-side first)
- Create components that duplicate existing patterns
- Hardcode configuration values
- Ignore mobile-first design requirements

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── _authed/
│   │   │   ├── jobs/
│   │   │   │   └── calendar.tsx           # DOM-JOBS-005a/b
│   │   │   ├── settings/
│   │   │   │   ├── job-templates.tsx      # DOM-JOBS-007c
│   │   │   │   └── checklist-templates.tsx # DOM-JOBS-004c
│   │   │   └── reports/
│   │   │       └── job-costing.tsx        # DOM-JOBS-008b
│   │   └── installer/
│   │       └── jobs/
│   │           └── $jobId.tsx             # Modified for tabs
│   ├── components/
│   │   └── domain/
│   │       └── jobs/
│   │           ├── job-tasks-list.tsx     # DOM-JOBS-001c
│   │           ├── task-card.tsx
│   │           ├── task-dialog.tsx
│   │           ├── job-materials-tab.tsx  # DOM-JOBS-002c
│   │           ├── material-card.tsx
│   │           ├── quantity-control.tsx
│   │           ├── barcode-scanner.tsx
│   │           ├── job-time-tab.tsx       # DOM-JOBS-003c
│   │           ├── active-timer.tsx
│   │           ├── floating-timer.tsx
│   │           ├── time-entry-dialog.tsx
│   │           ├── job-checklist-tab.tsx  # DOM-JOBS-004c
│   │           ├── checklist-item.tsx
│   │           ├── signature-pad.tsx
│   │           ├── job-calendar.tsx       # DOM-JOBS-005a/b
│   │           ├── unscheduled-jobs-sidebar.tsx
│   │           ├── schedule-job-dialog.tsx
│   │           ├── job-template-form.tsx  # DOM-JOBS-007c
│   │           ├── template-preview-panel.tsx
│   │           ├── job-costing-table.tsx  # DOM-JOBS-008b
│   │           └── costing-filter-bar.tsx
│   ├── lib/
│   │   ├── schema/
│   │   │   ├── job-tasks.ts               # DOM-JOBS-001a
│   │   │   ├── job-materials.ts           # DOM-JOBS-002a
│   │   │   ├── job-time-entries.ts        # DOM-JOBS-003a
│   │   │   ├── checklists.ts              # DOM-JOBS-004a
│   │   │   └── job-templates.ts           # DOM-JOBS-007a
│   │   └── schemas/
│   │       ├── job-tasks.ts               # Zod schemas
│   │       ├── job-materials.ts
│   │       ├── job-time.ts
│   │       ├── checklists.ts
│   │       ├── job-templates.ts
│   │       └── job-costing.ts
│   └── server/
│       └── functions/
│           ├── job-tasks.ts               # DOM-JOBS-001b
│           ├── job-materials.ts           # DOM-JOBS-002b
│           ├── job-time.ts                # DOM-JOBS-003b
│           ├── checklists.ts              # DOM-JOBS-004b
│           ├── job-templates.ts           # DOM-JOBS-007b
│           └── job-costing.ts             # DOM-JOBS-008a
├── drizzle/
│   └── migrations/                        # Generated migrations
└── tests/
    └── integration/
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues -> Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts -> Verify policy SQL syntax
  - Import errors -> Check TanStack Start path aliases
  - Drag-drop issues -> Check @dnd-kit configuration
  - Timer state issues -> Use localStorage for persistence

## Progress Template

```markdown
# Jobs Domain Phase Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
### Phase 1: Task Management
- [ ] DOM-JOBS-001a: Job Task Management: Schema
- [ ] DOM-JOBS-001b: Job Task Management: Server Functions
- [ ] DOM-JOBS-001c: Job Task Management: UI

### Phase 2: BOM Tracking
- [ ] DOM-JOBS-002a: Job BOM Tracking: Schema
- [ ] DOM-JOBS-002b: Job BOM Tracking: Server Functions
- [ ] DOM-JOBS-002c: Job BOM Tracking: UI

### Phase 3: Time Tracking
- [ ] DOM-JOBS-003a: Time Tracking: Schema
- [ ] DOM-JOBS-003b: Time Tracking: Server Functions
- [ ] DOM-JOBS-003c: Time Tracking: UI

### Phase 4: Commissioning Checklists
- [ ] DOM-JOBS-004a: Commissioning Checklist: Schema
- [ ] DOM-JOBS-004b: Commissioning Checklist: Server Functions
- [ ] DOM-JOBS-004c: Commissioning Checklist: UI

### Phase 5: Job Scheduling Calendar
- [ ] DOM-JOBS-005a: Job Scheduling Calendar: Basic
- [ ] DOM-JOBS-005b: Job Scheduling Calendar: Drag-Drop

### Phase 6: Job Templates
- [ ] DOM-JOBS-007a: Job Templates: Schema
- [ ] DOM-JOBS-007b: Job Templates: Server Functions
- [ ] DOM-JOBS-007c: Job Templates: UI

### Phase 7: Job Costing Reports
- [ ] DOM-JOBS-008a: Job Costing Report: Server Functions
- [ ] DOM-JOBS-008b: Job Costing Report: UI

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- Read wireframe files before implementing UI stories
- Mobile-first design is critical for field technicians
- Timer must persist across navigation and app restart
```

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Target:** renoz-v3 Jobs Domain Phase
**Total Stories:** 18
**Estimated Total Iterations:** 46
