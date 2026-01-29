# Reference Project Patterns to Adopt

> Patterns from `_reference/project-management-reference` to incorporate into Jobs Domain

---

## Overview

The reference project demonstrates excellent UX patterns for project management. Here are the specific elements we should adopt:

---

## 1. Data Hierarchy: Text Over IDs

### Pattern
Always show **human-readable text** instead of raw IDs or UUIDs.

### Reference Example
```tsx
// project-card.tsx - Lines 50-61
const secondaryLine = (() => {
  const a = project.client      // "Acme Corp" not "cli_123"
  const b = project.typeLabel   // "Solar Installation" not "solar"
  const c = project.durationLabel // "3 weeks" not dates
  if (a || b || c) {
    return [a, b, c].filter(Boolean).join(" • ")
  }
  if (project.tags && project.tags.length > 0) {
    return project.tags.join(" • ")
  }
  return ""
})()
```

### Implementation for Renoz

**Files to update:**
- `project-card.tsx` - ✅ Already has secondary line pattern
- `project-list.tsx` - Add client name to table view
- `ProjectWorkstreamsView.tsx` - Show assignee names, not IDs
- `bom-dialogs.tsx` - ✅ Already shows product names

**Code pattern:**
```tsx
// Instead of showing workstreamId
<span>{workstream.name}</span>

// Instead of raw status
<span>{formatStatus(project.status)}</span> // "In Progress" not "in_progress"
```

---

## 2. Card Layout Priorities

### Pattern (project-card.tsx Lines 96-184)

**Visual hierarchy:**
1. **Header row** - Due date + Status/Priority + Actions
2. **Title** - Project name (prominent, semibold)
3. **Secondary line** - Context (client • type • duration)
4. **Meta row** (list view) - Date + Priority
5. **Footer** - Progress + Assignee

### Key Design Decisions

| Element | Treatment | Rationale |
|---------|-----------|-----------|
| Title | `text-[15px] font-semibold leading-6` | Readable, scannable |
| Status | Pill with colored dot | Visual status recognition |
| Due date | Icon + relative date | Quick temporal context |
| Progress | Circular + percentage | At-a-glance completion |
| Assignee | Avatar only (no name) | Space efficiency |

### Reference Card Structure
```
┌─────────────────────────────────────┐
│ 📅 Due Jan 30    [Status●] [⋯]      │  ← Header
├─────────────────────────────────────┤
│ Project Title                       │  ← Primary (15px semibold)
│ Client • Type • Duration            │  ← Secondary (muted)
├─────────────────────────────────────┤
│ ◐ 75%                    [👤]       │  ← Footer
└─────────────────────────────────────┘
```

---

## 3. Empty States

### Pattern (project-cards-view.tsx Lines 25-39)

```tsx
<div className="flex h-60 flex-col items-center justify-center text-center">
  <div className="p-3 bg-muted rounded-md mb-4">
    <FolderOpen className="h-6 w-6 text-foreground" />
  </div>
  <h3 className="mb-2 text-lg font-semibold text-foreground">No projects yet</h3>
  <p className="mb-6 text-sm text-muted-foreground">Create your first project to get started</p>
  <button className="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-accent transition-colors cursor-pointer">
    <Plus className="mr-2 inline h-4 w-4" />
    Create new project
  </button>
</div>
```

### Elements to Adopt

1. **Icon container** - `bg-muted` with rounded corners
2. **Clear headline** - "No X yet" pattern
3. **Helpful subtext** - Action-oriented description
4. **Primary CTA** - Direct creation button
5. **Visual hierarchy** - Icon → Title → Description → Action

### Files to Add Empty States

- `ProjectWorkstreamsView.tsx` - No workstreams
- `ProjectNotesTab` - No notes
- `ProjectFilesTab` - No files
- `ProjectBomTab` - No BOM items

---

## 4. Dashed "Add New" Card

### Pattern (project-cards-view.tsx Lines 45-51)

```tsx
<button className="rounded-2xl border border-dashed border-border/60 bg-background p-6 text-center text-sm text-muted-foreground hover:border-solid hover:border-border/80 hover:text-foreground transition-colors min-h-[180px] flex flex-col items-center justify-center cursor-pointer">
  <Plus className="mb-2 h-5 w-5" />
  Create new project
</button>
```

### Usage in Renoz

Add to grid views as the last item:
- Project grid (already has separate button)
- Workstream cards
- File grid
- BOM items

---

## 5. Board View Pattern

### Pattern (project-board-view.tsx)

**Column structure:**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ [◐] Planned  │ [◑] Active   │ [◒] Complete │              │
│     5        │     3        │     8        │              │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │              │
│ │ Project  │ │ │ Project  │ │ │ Project  │ │              │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │              │
│ ┌──────────┐ │              │ ┌──────────┐ │              │
│ │ Project  │ │              │ │ Project  │ │              │
│ └──────────┘ │              │ └──────────┘ │              │
│ [+ Add...]   │ [+ Add...]   │ [+ Add...]   │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Key Features

1. **Status columns** with icons + count badges
2. **Drag-and-drop** between columns
3. **Column actions** (+ button, overflow menu)
4. **Add button at bottom** of each column
5. **Visual separation** - `bg-muted` columns, `bg-background` cards

### Implementation

**New component:** `ProjectBoardView.tsx` for projects page
- Use existing dnd-kit integration
- Column headers with status icons
- Count badges
- Quick-add at column bottom

---

## 6. My Tasks Breakdown

### Pattern (MyTasksPage.tsx)

**Grouping by project:**
```tsx
// Groups tasks by parent project
const groups = projects.map((project) => ({
  project,
  tasks: getProjectTasks(project.id)
}))
```

**Visual structure:**
```
┌────────────────────────────────────────┐
│ [📁] Project Name            [◐] 75%  │  ← Project header
├────────────────────────────────────────┤
│ ☐ Task 1                    [tag] [👤] │
│ ☐ Task 2                    [tag] [👤] │
│ ☐ Task 3                    [tag] [👤] │
├────────────────────────────────────────┤
│ [📁] Another Project         [◐] 30%  │
├────────────────────────────────────────┤
│ ☐ Task 1                    [tag] [👤] │
│ ☑ Task 2 (done)             [tag] [👤] │
└────────────────────────────────────────┘
```

### Elements to Adopt

1. **Project grouping** - Tasks nested under projects
2. **Progress per project** - Circular indicator in header
3. **Checkbox toggle** - Quick complete/uncomplete
4. **Tags inline** - Visual categorization
5. **Assignee avatar** - At row end

### Implementation

**Update:** `ProjectTasksTab.tsx`
- Group tasks by workstream (not project)
- Show workstream progress
- Inline checkbox for quick status toggle
- Tag badges for task types

---

## 7. Responsive Grid

### Pattern

```tsx
// project-cards-view.tsx Line 21, 41
className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

// project-board-view.tsx Line 153
className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
```

### Breakpoints

| Viewport | Columns | Use Case |
|----------|---------|----------|
| Mobile | 1 | Single column, full width |
| sm (640px) | 2 | Cards side by side |
| lg (1024px) | 3 | Project grid |
| xl (1280px) | 4 | Board view columns |

### Files to Update

- `ProjectListGrid` - ✅ Already has responsive grid
- `ProjectFilesGrid` - Add responsive breakpoints
- `ProjectWorkstreamsView` - Ensure mobile-friendly

---

## 8. Loading Skeletons

### Pattern (project-board-view.tsx Lines 122-141)

```tsx
if (loading) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {COLUMN_ORDER.map((s) => (
        <div key={s} className="rounded-xl bg-background/60">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-6" />
          </div>
          <div className="p-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Key Principles

1. **Match layout structure** - Skeleton mirrors final layout
2. **Preserve spacing** - Same padding/margins as content
3. **Multiple items** - Show 3 skeletons to indicate list
4. **Consistent shapes** - Cards, headers, text lines

---

## 9. Drag & Drop UX

### Pattern (project-board-view.tsx Lines 78-119)

**Visual feedback during drag:**
```tsx
<div
  draggable
  className={`transition-all ${
    draggingId === p.id
      ? "cursor-grabbing opacity-70 shadow-lg scale-[0.98]"
      : "cursor-grab"
  }`}
>
```

**Drop zone styling:**
```tsx
<div
  className="rounded-xl bg-muted min-h-[120px]"
  onDragOver={onDragOver}
  onDrop={onDropTo(status)}
>
```

### Implementation

Already partially implemented in `ProjectWorkstreamsView.tsx`. Enhance with:
- `cursor-grab` / `cursor-grabbing`
- Scale transform on drag
- Opacity reduction
- Shadow elevation

---

## 10. Quick Actions Menu

### Pattern (project-board-view.tsx Lines 97-116)

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
      <DotsThreeVertical className="h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-40 p-2" align="end">
    <div className="space-y-1">
      {COLUMN_ORDER.map((s) => (
        <button
          key={s}
          className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-accent"
          onClick={() => moveProject(p.id, s)}
        >
          Move to {s}
        </button>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

### Usage

Replace `DropdownMenu` with `Popover` for:
- Quick status changes
- Move to workstream
- Priority changes

---

## Implementation Checklist

### Phase 1: Text Hierarchy
- [ ] Add formatters for all status/priority values
- [ ] Replace IDs with names in all views
- [ ] Add secondary context lines

### Phase 2: Visual Patterns
- [ ] Implement dashed "Add New" card
- [ ] Add empty states to all tabs
- [ ] Create loading skeletons

### Phase 3: Layout
- [ ] Responsive grid for files
- [ ] Board view for projects
- [ ] Task grouping by workstream

### Phase 4: Interactions
- [ ] Enhanced drag-drop feedback
- [ ] Popover quick actions
- [ ] Inline checkbox toggles

---

## Success Criteria

| Pattern | Current State | Target State |
|---------|---------------|--------------|
| Text over IDs | Mixed | 100% human-readable |
| Empty states | Toast "coming soon" | Full empty state UI |
| Skeletons | Spinner only | Layout-matching skeletons |
| Responsiveness | Basic | 4-column responsive grid |
| DnD feedback | Basic | Scale + shadow + opacity |
