# Jobs Domain Deprecation Notice

**Status**: ⚠️ DEPRECATED  
**Superseded By**: Projects Domain (`src/components/domain/projects/`)  
**SPRINT**: SPRINT-03

## Overview

The `jobs` domain has been superseded by the new `projects` domain as part of the SPRINT-03 project-centric restructure. All new development should use the projects domain.

## Migration Guide

### Import Changes

**Before (Deprecated):**
```typescript
import { ProjectCard } from '@/components/domain/jobs';
import { ChecklistItemCard } from '@/components/domain/jobs/templates';
import { ActiveTimer } from '@/components/domain/jobs/time';
```

**After (Recommended):**
```typescript
// All projects components
import { ProjectCard, ChecklistItemCard, ActiveTimer } from '@/components/domain/projects';

// Or directly from subdomains
import { ChecklistItemCard } from '@/components/domain/projects/checklists';
import { ActiveTimer } from '@/components/domain/projects/time-tracking';
```

### Route Changes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/jobs` | `/projects` | ✅ Active |
| `/jobs/calendar` | `/schedule/calendar` | ✅ Active |
| `/jobs/timeline` | `/schedule/timeline` | ✅ Active |
| `/jobs/kanban` | `/projects` (with view toggle) | ✅ Active |
| `/jobs/:jobId` | `/projects/:projectId` | ✅ Active |

### Component Mappings

| Old Component (Jobs) | New Component (Projects) | Status |
|---------------------|-------------------------|--------|
| `JobCard` | `ProjectCard` | ✅ Migrated |
| `JobList` | `ProjectListGrid/Table` | ✅ Migrated |
| `JobCreateDialog` | `ProjectCreateDialog` | ✅ Migrated |
| `JobDocumentsTab` | `ProjectFilesTab` | ✅ Migrated |
| `JobMaterialsTab` | `ProjectBomTab` | ✅ Migrated |
| `JobTasksTab` | `ProjectTasksTab` | ✅ Migrated |
| `ChecklistItemCard` | `ChecklistItemCard` | ✅ Migrated |
| `ApplyChecklistDialog` | `ApplyChecklistDialog` | ✅ Migrated |
| `ActiveTimer` | `ActiveTimer` | ✅ Migrated |
| `TimeEntryDialog` | `TimeEntryDialog` | ✅ Migrated |

## Active Subdomains (Still in Jobs)

These subdomains remain in the jobs folder but are considered part of the new architecture:

- **`schedule/`** - Cross-project scheduling
- **`technician/`** - Field technician task view
- **`site-visits/`** - Site visit management
- **`installers/`** - Installer management

## Legacy Components (To Be Removed)

The following will be removed in a future cleanup:

- `kanban/` - Old job kanban board
- `materials/` - Old materials management (use BOM)
- `tasks/` - Old task management
- `calendar/` - Old calendar view
- `timeline/` - Old timeline view
- `bulk/` - Old bulk operations
- `jobs-filters.tsx`
- `jobs-filter-bar.tsx`
- `jobs-view-switcher.tsx`
- `jobs-unified-context.tsx`
- `jobs-view-context.tsx`

## Timeline

1. **SPRINT-03** (Current): New projects domain active, jobs domain deprecated
2. **SPRINT-04**: Remove legacy job components that are unused
3. **SPRINT-05**: Full removal of jobs domain (only schedule/technician/site-visits/installers remain)

## Questions?

See `SPRINT-03.md` or ask the team about migration strategies.
