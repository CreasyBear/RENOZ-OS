# Project Elements Enhancement Plan

> Maximizing schema potential across all project tabs

---

## Current State vs Schema Potential

| Tab | Current | Schema Support | Enhancement Opportunity |
|-----|---------|----------------|------------------------|
| **Workstreams** | Name + drag reorder | `defaultVisitType`, `position`, relations to tasks | Task counts, progress, visit type badges |
| **Tasks** | Simple list | `estimatedHours`, `dueDate`, `priority`, `assigneeId`, `status` | Full task cards with assignees, due dates, priority |
| **Notes** | Text list | `noteType`, `audioData`, `status`, author relations | Type badges, audio player, author info |
| **Files** | Grid placeholder | `fileType`, `fileSize`, `fileUrl`, `position` | File previews, download actions, type icons |
| **BOM** | ✅ Full implementation | All fields utilized | Reference pattern for others |

---

## 1. Enhanced Workstreams Tab

### Schema Fields Available
```typescript
interface ProjectWorkstream {
  name: string
  description?: string
  defaultVisitType?: 'assessment' | 'installation' | 'commissioning' | ...
  position: number
  // Relations:
  // - tasks: JobTask[]
}
```

### Proposed Enhancements

**Workstream Cards:**
```
┌─────────────────────────────────────────────┐
│ [Grip] Assessment Workstream    [Actions ⋯] │
│ Site assessment and initial survey          │
│                                             │
│ [📋] 8 tasks    [◐] 62%    [👤👤] 2 assigned │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ ○ 3 pending  ◐ 2 active  ● 3 completed     │
│                                             │
│ [Visit Type: Assessment]                    │
└─────────────────────────────────────────────┘
```

**Features:**
- Visit type badge with icon
- Task count summary
- Progress bar
- Mini task status breakdown
- Assignee avatars
- Quick "Add Task" button

---

## 2. Enhanced Tasks Tab

### Schema Fields Available
```typescript
interface JobTask {
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 'urgent' | 'high' | 'normal' | 'low'
  estimatedHours?: number
  dueDate?: string
  assigneeId?: string
  workstreamId: string
  position: number
}
```

### Proposed Enhancements

**Task Cards:**
```
┌──────────────────────────────────────────────────────┐
│ ☐ Install solar panels on roof north face          🔴 │ ← Priority
│                                                      │
│ Estimated: 4 hours                    Due: Jan 30    │
│                                                      │
│ [Assessment]            [👤 Jason] [👤 Sarah]        │
│ Workstream              Assignees                    │
│                                                      │
│ [Complete] [Edit] [⋯]                               │
└──────────────────────────────────────────────────────┘
```

**Features:**
- Checkbox for quick completion
- Priority indicator (color coded)
- Due date with warning if overdue
- Estimated hours
- Workstream badge
- Assignee avatars with names
- Inline actions

**Grouping Options:**
- By Workstream (default)
- By Status
- By Assignee
- By Due Date

---

## 3. Enhanced Notes Tab

### Schema Fields Available
```typescript
interface ProjectNote {
  title: string
  content?: string
  noteType: 'general' | 'meeting' | 'audio' | 'site_visit' | 'client_feedback'
  status: 'completed' | 'draft' | 'processing'
  audioData?: {
    durationSeconds: number
    transcript?: string
  }
  createdBy: string
  updatedAt: string
}
```

### Proposed Enhancements

**Note Cards:**
```
┌─────────────────────────────────────────────────────┐
│ [🎙️] Site Visit Recording        Jan 28, 2:30 PM   │
│ Type: Audio Note        Author: [👤] John Smith     │
│                                                     │
│ ▶️  0:00 / 4:32                    [Transcript ▼] │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                     │
│ "Client confirmed panel placement on north..."     │
│                                                     │
│ [Processing...]                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Type-specific icons (🎙️ audio, 📝 general, 🏗️ site visit, 💬 client feedback)
- Audio player with transcript
- Author avatar + name
- Timestamp (relative: "2 hours ago")
- Status badges (Processing for audio transcription)
- Expandable transcript view
- Inline edit/delete

---

## 4. Enhanced Files Tab

### Schema Fields Available
```typescript
interface ProjectFile {
  fileName: string
  fileType: 'proposal' | 'contract' | 'specification' | 'drawing' | 'photo' | ...
  fileSize: number
  fileUrl: string
  title?: string
  description?: string
  position: number
}
```

### Proposed Enhancements

**File Grid:**
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ [📄]             │ │ [🖼️]             │ │ [📐]             │
│                  │ │                  │ │                  │
│ Proposal_v2.pdf  │ │ site_photo_1.jpg │ │ roof_plan.dwg    │
│ 2.4 MB           │ │ 4.1 MB           │ │ 1.8 MB           │
│                  │ │                  │ │                  │
│ [👁️] [⬇️] [⋯]  │ │ [👁️] [⬇️] [⋯]  │ │ [👁️] [⬇️] [⋯]  │
│ View Down  More  │ │ View Down  More  │ │ View Down  More  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

**Features:**
- File type icons (PDF, image, CAD, etc.)
- Thumbnail preview for images
- File size formatting
- Quick actions: View, Download, More
- Grid/List view toggle
- Drag-to-reorder
- Upload progress indicator
- File type filter tabs

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours each)

1. **Tasks Tab Enhancement**
   - Add priority badges
   - Show assignee avatars
   - Add due dates
   - Quick checkbox toggle

2. **Notes Tab Enhancement**
   - Type badges with icons
   - Author info
   - Relative timestamps
   - Audio player (if audioData exists)

### Phase 2: Rich Components (2-4 hours each)

3. **Workstreams Enhancement**
   - Task count summary
   - Progress bars
   - Mini status breakdown
   - Visit type badges

4. **Files Enhancement**
   - File type icons
   - Image previews
   - Download actions
   - View toggle (grid/list)

### Phase 3: Advanced Features

5. **Cross-cutting**
   - Empty states for all tabs
   - Skeleton loaders
   - Inline editing
   - Drag-and-drop improvements

---

## Schema Utilization Checklist

### Workstreams
- [x] `name` - displayed
- [x] `description` - displayed
- [x] `position` - drag reorder
- [ ] `defaultVisitType` - show badge
- [ ] `tasks` relation - count/compute progress

### Tasks
- [x] `title` - displayed
- [ ] `description` - expand/collapse
- [x] `status` - displayed
- [ ] `priority` - badge
- [ ] `estimatedHours` - show
- [ ] `dueDate` - show with warning
- [ ] `assigneeId` - avatar
- [ ] `workstreamId` - grouping
- [ ] `position` - sort order

### Notes
- [x] `title` - displayed
- [x] `content` - displayed
- [ ] `noteType` - badge with icon
- [ ] `status` - show (processing audio)
- [ ] `audioData` - player
- [ ] `createdBy` - author info
- [ ] `updatedAt` - timestamp

### Files
- [x] `fileName` - displayed
- [ ] `fileType` - icon
- [ ] `fileSize` - formatted
- [ ] `fileUrl` - download
- [ ] `title` - show if available
- [ ] `description` - tooltip
- [ ] `position` - drag reorder

---

## Success Metrics

| Tab | Current | Target | Measurement |
|-----|---------|--------|-------------|
| Workstreams | 30% schema | 80% schema | Fields utilized |
| Tasks | 25% schema | 85% schema | Fields utilized |
| Notes | 40% schema | 85% schema | Fields utilized |
| Files | 20% schema | 80% schema | Fields utilized |
| BOM | 95% schema | 95% schema | ✅ Reference |

---

## Visual Consistency

All tabs should follow the BOM tab patterns:
- Summary cards at top (counts, progress, costs)
- Clean table/grid layout
- Hover actions (edit, delete)
- Empty states with CTAs
- Loading skeletons
- Consistent spacing and typography
