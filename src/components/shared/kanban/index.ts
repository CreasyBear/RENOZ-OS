/**
 * Kanban Components
 *
 * Shared kanban board components with drag-and-drop, virtualization,
 * and automatic rendering strategy based on item count.
 *
 * Features:
 * - Standard view: < 30 items (simple list)
 * - Virtualized view: 30-50 items (virtual scrolling)
 * - Summary view: > 50 items (collapsed aggregation)
 *
 * @example
 * ```tsx
 * import {
 *   KanbanBoard,
 *   KanbanToolbar,
 *   SortableKanbanCard,
 *   type KanbanColumn,
 *   type KanbanMoveEvent,
 * } from '~/components/shared/kanban'
 *
 * <KanbanBoard
 *   columns={columns}
 *   items={items}
 *   getColumnKey={(item) => item.status}
 *   getItemKey={(item) => item.id}
 *   onMove={handleMove}
 *   renderCard={(item) => <SortableKanbanCard id={item.id} title={item.title} />}
 * />
 * ```
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Board types
  KanbanColumn as KanbanColumnDef,
  KanbanBoardProps,
  KanbanMoveEvent,
  // Card types
  KanbanPriority,
  KanbanCardStatus,
  KanbanCardMetadata,
  KanbanCardProgress,
  KanbanCardAssignee,
  KanbanCardTag,
  KanbanCardProps,
  // Filter types
  KanbanFilters,
  KanbanFilterOption,
  KanbanFiltersProps,
  // Toolbar types
  KanbanViewMode,
  KanbanToolbarProps,
} from "./types";

// =============================================================================
// BOARD COMPONENTS
// =============================================================================

export {
  KanbanBoard,
  type KanbanBoardComponentProps,
} from "./kanban-board";

export {
  KanbanBoardEnhanced,
  type KanbanBoardEnhancedProps,
} from "./kanban-board-enhanced";

export {
  KanbanColumn,
  KanbanColumnAuto,
  KanbanColumnVirtualized,
  KanbanColumnSummary,
  KanbanColumnHeader,
  VIRTUALIZATION_THRESHOLD,
  SUMMARY_THRESHOLD,
  type KanbanColumnProps,
  type KanbanColumnAutoProps,
  type KanbanColumnVirtualizedProps,
  type KanbanColumnSummaryProps,
  type KanbanColumnHeaderProps,
} from "./kanban-column";

// =============================================================================
// CARD COMPONENTS
// =============================================================================

export {
  KanbanCard,
  SortableKanbanCard,
  KanbanCardOverlay,
  type KanbanCardBaseProps,
  type SortableKanbanCardProps,
  type KanbanCardOverlayProps,
} from "./kanban-card";

// =============================================================================
// PRIMITIVES
// =============================================================================

export {
  PriorityIndicator,
  CompletedIndicator,
  MetadataPill,
  ProgressRing,
  AvatarStack,
  getInitials,
  isPastDate,
  type PriorityIndicatorProps,
  type CompletedIndicatorProps,
  type MetadataPillProps,
  type ProgressRingProps,
  type AvatarStackProps,
} from "./primitives";

// =============================================================================
// TOOLBAR & FILTERS
// =============================================================================

export {
  KanbanToolbar,
  KanbanToolbarCompact,
  type KanbanToolbarCompactProps,
} from "./kanban-toolbar";

export {
  KanbanFiltersPopover,
  KanbanFilterChips,
  type KanbanFiltersComponentProps,
  type KanbanFilterChipsProps,
} from "./kanban-filters";

// =============================================================================
// SORT
// =============================================================================

export {
  KanbanSortDropdown,
  DEFAULT_SORT_OPTIONS,
  type KanbanSortField,
  type KanbanSortDirection,
  type KanbanSortOption,
  type KanbanSortValue,
  type KanbanSortDropdownProps,
} from "./kanban-sort";

// =============================================================================
// QUICK ADD
// =============================================================================

export {
  KanbanQuickAdd,
  ColumnQuickAdd,
  type QuickAddData,
  type KanbanQuickAddProps,
  type ColumnQuickAddProps,
} from "./kanban-quick-add";

// =============================================================================
// MOBILE & RESPONSIVE
// =============================================================================

export {
  MobileColumnTabs,
  MobileColumnNavigator,
  MobileKanbanBoard,
  ResponsiveKanbanBoard,
  type MobileColumnTabsProps,
  type MobileColumnNavigatorProps,
  type MobileKanbanBoardProps,
  type ResponsiveKanbanBoardProps,
} from "./kanban-mobile";

// =============================================================================
// CONTEXT & STATE
// =============================================================================

export {
  SelectionProvider,
  useSelection,
  KeyboardNavigationProvider,
  useKeyboardNavigation,
  useOptimisticMoves,
  type SelectionContextValue,
  type SelectionProviderProps,
  type KeyboardNavigationContextValue,
  type KeyboardNavigationProviderProps,
  type OptimisticMove,
} from "./kanban-context";

// =============================================================================
// ANIMATIONS
// =============================================================================

export {
  AnimatedCard,
  AnimatedCardList,
  AnimatedCollapse,
  AnimatedColumn,
  AnimatedDropIndicator,
  SuccessPulse,
  StaggerContainer,
  StaggerItem,
  cardSpring,
  columnSpring,
  quickTransition,
  standardTransition,
  type AnimatedCardProps,
  type AnimatedCollapseProps,
  type AnimatedColumnProps,
  type AnimatedDropIndicatorProps,
  type SuccessPulseProps,
  type StaggerContainerProps,
} from "./kanban-animations";

// =============================================================================
// COLLAPSIBLE COLUMNS
// =============================================================================

export {
  KanbanColumnCollapsible,
  useCollapsedColumns,
  type KanbanColumnCollapsibleProps,
  type UseCollapsedColumnsOptions,
} from "./kanban-column-collapsible";

// =============================================================================
// SKELETONS
// =============================================================================

export {
  KanbanCardSkeleton,
  KanbanColumnSkeleton,
  KanbanBoardSkeleton,
  KanbanToolbarSkeleton,
  KanbanPageSkeleton,
  type KanbanCardSkeletonProps,
  type KanbanColumnSkeletonProps,
  type KanbanBoardSkeletonProps,
  type KanbanToolbarSkeletonProps,
  type KanbanPageSkeletonProps,
} from "./kanban-skeletons";

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

export { KanbanErrorBoundary } from "./kanban-error-boundary";
