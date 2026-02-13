/**
 * Shared Kanban Types
 *
 * Generic types for kanban board, column, and card components.
 * Designed to be extended by domain-specific implementations.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// BOARD TYPES
// ============================================================================

export interface KanbanColumn<TStatus extends string = string> {
  /** Unique column key (maps to item status) */
  key: TStatus;
  /** Display title */
  title: string;
  /** Column accent color (CSS color value) */
  color?: string;
  /** Status icon */
  icon?: LucideIcon;
  /** Aggregate value to display (e.g., total value) */
  aggregate?: {
    label: string;
    value: ReactNode;
  };
  /** Can items be dropped here? */
  acceptsDrop?: boolean;
  /** Can items be dragged from here? */
  allowsDrag?: boolean;
  /** WIP limit for the column */
  wipLimit?: number;
}

export interface KanbanBoardProps<TItem, TStatus extends string = string> {
  /** Column definitions */
  columns: KanbanColumn<TStatus>[];
  /** All items */
  items: TItem[];
  /** Get column key/status for an item */
  getColumnKey: (item: TItem) => TStatus;
  /** Get unique item key */
  getItemKey: (item: TItem) => string;
  /** Called when item is moved to a different column */
  onMove: (
    itemKey: string,
    fromColumn: TStatus,
    toColumn: TStatus,
    index: number
  ) => void | Promise<void>;
  /** Render card content */
  renderCard: (item: TItem) => ReactNode;
  /** Called when card is clicked */
  onCardClick?: (item: TItem) => void;
  /** Column header actions */
  columnActions?: (column: KanbanColumn<TStatus>) => ReactNode;
  /** Column add handler */
  onAddItem?: (column: KanbanColumn<TStatus>) => void;
  /** Board-level actions */
  boardActions?: ReactNode;
  /** Custom column renderer */
  renderColumn?: (
    column: KanbanColumn<TStatus>,
    items: TItem[]
  ) => ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Reduced motion mode */
  reducedMotion?: boolean;
}

// ============================================================================
// CARD TYPES
// ============================================================================

export type KanbanPriority = "low" | "medium" | "high" | "urgent";

export interface KanbanCardStatus {
  key: string;
  name: string;
  icon?: LucideIcon;
}

export interface KanbanCardMetadata {
  comments?: number;
  attachments?: number;
  links?: number;
}

export interface KanbanCardProgress {
  completed: number;
  total: number;
}

export interface KanbanCardAssignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface KanbanCardTag {
  id?: string;
  label: string;
  color?: string;
}

export interface KanbanCardProps {
  /** Card title */
  title: string;
  /** Card description (shows below title) */
  description?: string;
  /** Subtitle (alternative to description) */
  subtitle?: string;
  /** Value to display (e.g., price, amount) */
  value?: ReactNode;
  /** Status with icon */
  status?: KanbanCardStatus;
  /** Priority level */
  priority?: KanbanPriority;
  /** Tags/labels */
  tags?: KanbanCardTag[];
  /** Due date */
  dueDate?: Date | string;
  /** Metadata counters */
  metadata?: KanbanCardMetadata;
  /** Progress tracking */
  progress?: KanbanCardProgress;
  /** Assignees */
  assignees?: KanbanCardAssignee[];
  /** Is this card selected? */
  isSelected?: boolean;
  /** Is this card being dragged? */
  isDragging?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Selection change handler */
  onSelect?: (selected: boolean) => void;
  /** Additional actions to render */
  actions?: ReactNode;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface KanbanFilters {
  priority?: KanbanPriority | "all";
  assignee?: string | "all" | "me" | "unassigned";
  search?: string;
  tags?: string[];
}

export interface KanbanFilterOption<T = string> {
  id: T;
  name: string;
  icon?: LucideIcon;
  color?: string;
}

export interface KanbanFiltersProps {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  priorityOptions?: KanbanFilterOption<KanbanPriority | "all">[];
  assigneeOptions?: KanbanFilterOption[];
  tagOptions?: KanbanFilterOption[];
}

// ============================================================================
// TOOLBAR TYPES
// ============================================================================

export type KanbanViewMode = "board" | "table";

export interface KanbanToolbarProps {
  viewMode?: KanbanViewMode;
  onViewModeChange?: (mode: KanbanViewMode) => void;
  filters?: KanbanFilters;
  onFiltersChange?: (filters: KanbanFilters) => void;
  onAddItem?: () => void;
  addItemLabel?: string;
  showViewToggle?: boolean;
  showFilters?: boolean;
  children?: ReactNode;
}

// ============================================================================
// MOVE EVENT TYPES
// ============================================================================

export interface KanbanMoveEvent<TStatus extends string = string> {
  itemId: string;
  fromColumn: TStatus;
  toColumn: TStatus;
  index: number;
}
