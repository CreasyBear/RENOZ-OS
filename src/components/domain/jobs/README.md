# Jobs Kanban Board

A comprehensive kanban board for managing job tasks across all job assignments. Provides visual workflow management with advanced filtering, bulk operations, and real-time collaboration features.

## Features

### Core Functionality

- **Visual Workflow Management**: Four-column kanban board (Pending, In Progress, Completed, Blocked)
- **Drag & Drop**: Intuitive task movement between workflow states
- **Real-time Updates**: Live synchronization across team members
- **Task Overview**: High-level visibility into all job tasks across assignments

### Advanced Filtering

- **Text Search**: Search across task titles, descriptions, job numbers, and customer names
- **Priority Filtering**: Filter by Low, Normal, High, or Urgent priorities
- **Status Filtering**: Filter by current workflow state
- **Assignee Filtering**: Filter tasks by assigned team member
- **Job Type Filtering**: Filter by Installation, Service, or Warranty jobs
- **Due Date Filtering**: Filter by Today, This Week, Overdue, or Upcoming tasks
- **Filter Persistence**: Filters are remembered across browser sessions

### Bulk Operations

- **Bulk Selection**: Select multiple tasks using checkboxes
- **Bulk Status Updates**: Change status of multiple tasks at once
- **Bulk Assignment**: Reassign multiple tasks to team members
- **Bulk Task Creation**: Create multiple tasks with templates

### Task Management

- **Inline Editing**: Edit task details directly on the card
- **Context Menus**: Right-click menus for quick actions
- **Task Templates**: Pre-built templates for common job types
- **Priority Indicators**: Color-coded priority system
- **Metadata Display**: Customer info, job numbers, due dates, time estimates

## User Guide

### Getting Started

1. Navigate to **Jobs → Kanban** in the main navigation
2. Tasks are automatically loaded and displayed across four workflow columns
3. Use filters to focus on specific tasks or job types

### Working with Tasks

#### Moving Tasks

- **Drag & Drop**: Click and drag task cards between columns
- **Keyboard Navigation**: Use Tab to focus cards, then arrow keys to move
- **Bulk Movement**: Select multiple tasks, then use bulk actions

#### Editing Tasks

- **Inline Edit**: Click the edit icon on any task card
- **Quick Actions**: Right-click cards for context menu options
- **Bulk Edit**: Select multiple tasks for bulk status or assignment changes

#### Creating Tasks

- **Single Task**: Click "Add task" button on any column
- **Bulk Creation**: Click "Bulk add" for template-based multi-task creation
- **Templates**: Use pre-built templates for Installation, Service, or Warranty tasks

### Filtering and Search

#### Using Filters

1. Click the **Filters** button in the header
2. Select desired filter criteria
3. Filters apply instantly and show active filter badges
4. Click badges or "Clear all" to remove filters

#### Search Functionality

- Use the search box to find tasks by any text content
- Search includes titles, descriptions, job numbers, and customer names
- Results update in real-time as you type

### Keyboard Shortcuts

- **Tab/Shift+Tab**: Navigate between interactive elements
- **Enter**: Activate buttons or confirm actions
- **Escape**: Cancel operations or close dialogs
- **Arrow Keys**: Navigate during drag operations
- **Space**: Select/deselect checkboxes

## Technical Architecture

### Component Structure

```
jobs-kanban/
├── jobs-board.tsx          # Main kanban container with DnD logic
├── jobs-column.tsx         # Individual workflow columns
├── jobs-card.tsx           # Task cards with inline editing
├── jobs-filters.tsx        # Advanced filtering UI
├── jobs-bulk-actions.tsx   # Bulk operation controls
├── jobs-task-create-dialog.tsx     # Single task creation
├── jobs-bulk-create-dialog.tsx     # Bulk task creation with templates
├── jobs-card-inline-edit.tsx       # Inline editing component
├── jobs-card-context-menu.tsx      # Right-click context menus
└── index.ts               # Component exports
```

### Data Flow

1. **Data Fetching**: `useJobTasksKanban` hook loads tasks from server
2. **Client Filtering**: Filters applied locally for instant results
3. **Optimistic Updates**: UI updates immediately, syncs with server
4. **Real-time Sync**: 30-second polling for live updates

### Performance Optimizations

- **Memoized Filtering**: Efficient client-side filtering
- **Virtualized Rendering**: Smooth scrolling with large task lists
- **Debounced Search**: Reduces computation during typing
- **Lazy Loading**: Components load on demand

## Accessibility

### Screen Reader Support

- Comprehensive ARIA labels on all interactive elements
- Live announcements for drag operations
- Semantic HTML structure throughout

### Keyboard Navigation

- Full keyboard accessibility for all features
- Logical tab order and focus management
- Keyboard shortcuts for common operations

### Mobile Responsiveness

- Touch-friendly interface with proper touch targets
- Responsive column sizing and layouts
- Optimized for tablets and mobile devices

## API Reference

### Props

#### JobsBoard

```typescript
interface JobsBoardProps {
  tasksData?: {
    tasksByStatus: Record<string, KanbanTask[]>;
    allTasks: KanbanTask[];
    total: number;
  };
  isLoading?: boolean;
  onViewTask?: (taskId: string) => void;
  onAddTask?: (columnId: string) => void;
  onSaveTaskEdit?: (taskId: string, data: EditTaskData) => Promise<void>;
  selectedTaskIds?: Set<string>;
  onTaskSelect?: (taskId: string, selected: boolean) => void;
  onBulkAddTask?: (columnId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onChangeTaskPriority?: (taskId: string, priority: string) => void;
  onAssignTask?: (taskId: string, assigneeId: string) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
}
```

#### JobsFilters

```typescript
interface JobsFiltersState {
  priority: 'all' | 'low' | 'normal' | 'high' | 'urgent';
  assigneeId: string | 'all';
  status: 'all' | 'pending' | 'in_progress' | 'completed' | 'blocked';
  jobType: 'all' | 'installation' | 'service' | 'warranty';
  jobId: string | 'all';
  dueDateRange: 'all' | 'today' | 'this_week' | 'overdue' | 'upcoming';
  searchQuery: string;
}
```

## Troubleshooting

### Common Issues

**Tasks not loading**: Check network connection and refresh the page
**Drag not working**: Ensure you're clicking the drag handle (appears on hover)
**Filters not applying**: Verify filter state and refresh data
**Search not finding tasks**: Check spelling and try partial matches

### Performance Tips

- Use filters to reduce visible tasks when dealing with large boards
- Close filter popover when not in use
- Use bulk operations for multiple task changes

## Future Enhancements

- **Job-specific kanban views**: Filter kanban to single job assignments
- **Custom workflow columns**: User-configurable workflow states
- **Task dependencies**: Visual dependency relationships
- **Time tracking integration**: Built-in time entry from kanban
- **Email notifications**: Alerts for task assignments and due dates
- **Advanced reporting**: Kanban analytics and productivity metrics

---

For technical implementation details, see the component JSDoc documentation and source code comments.
