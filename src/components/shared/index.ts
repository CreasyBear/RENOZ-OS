/**
 * Shared Components
 *
 * Reusable UI components for the renoz-v3 application.
 * All components are designed to work with TanStack Form, TanStack Table,
 * and shadcn/ui primitives.
 *
 * @example
 * ```tsx
 * import {
 *   // Forms
 *   FormField, TextField, EmailField, CurrencyField, SelectField, TextareaField,
 *   FormSection,
 *
 *   // Data Tables
 *   DataTable, DataTablePagination,
 *   checkboxColumn, currencyColumn, dateColumn, statusColumn, actionsColumn,
 *
 *   // Modals
 *   ConfirmationModal, AlertModal, FormModal,
 *
 *   // State Displays
 *   LoadingState, ErrorState, EmptyState, EmptyStateContainer,
 *   SearchEmptyState, FilterEmptyState, AccessDeniedState, QueryState,
 *
 *   // Entity Components
 *   EntityAvatar, EntityCard, EntityCombobox,
 *
 *   // Status
 *   StatusBadge, ORDER_STATUS_CONFIG, QUOTE_STATUS_CONFIG,
 * } from '~/components/shared'
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Forms
// ─────────────────────────────────────────────────────────────────────────────
export {
  FormField,
  type FormFieldProps,
} from "./forms/form-field"

export {
  TextField,
  type TextFieldProps,
} from "./forms/text-field"

export {
  EmailField,
  type EmailFieldProps,
} from "./forms/email-field"

export {
  CurrencyField,
  type CurrencyFieldProps,
} from "./forms/currency-field"

export {
  SelectField,
  type SelectFieldProps,
  type SelectOption,
} from "./forms/select-field"

export {
  TextareaField,
  type TextareaFieldProps,
} from "./forms/textarea-field"

export {
  FormSection,
  type FormSectionProps,
} from "./forms/form-section"

export type { FormFieldApi } from "./forms/types"

// ─────────────────────────────────────────────────────────────────────────────
// Data Tables
// ─────────────────────────────────────────────────────────────────────────────
export {
  DataTable,
  type DataTableProps,
} from "./data-table/data-table"

export { DataTablePagination } from "./data-table/data-table-pagination"

export {
  checkboxColumn,
  currencyColumn,
  dateColumn,
  statusColumn,
  entityLinkColumn,
  actionsColumn,
  type ActionItem,
  type StatusConfig as ColumnStatusConfig,
} from "./data-table/column-presets"

// ─────────────────────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────────────────────
export {
  ConfirmationModal,
  type ConfirmationModalProps,
} from "./modals/confirmation-modal"

export {
  AlertModal,
  type AlertModalProps,
} from "./modals/alert-modal"

export {
  FormModal,
  type FormModalProps,
} from "./modals/form-modal"

// ─────────────────────────────────────────────────────────────────────────────
// State Displays
// ─────────────────────────────────────────────────────────────────────────────
export {
  LoadingState,
  type LoadingStateProps,
} from "./loading-state"

export {
  ErrorState,
  type ErrorStateProps,
} from "./error-state"

export {
  EmptyState,
  EmptyStateContainer,
  type EmptyStateProps,
  type EmptyStateContainerProps,
} from "./empty-state"

export {
  SearchEmptyState,
  type SearchEmptyStateProps,
  type SearchSuggestion,
} from "./search-empty-state"

export {
  FilterEmptyState,
  type FilterEmptyStateProps,
  type FilterItem,
} from "./filter-empty-state"

export {
  AccessDeniedState,
  type AccessDeniedStateProps,
  type AccessDeniedVariant,
} from "./access-denied-state"

export {
  QueryState,
  type QueryStateProps,
} from "./query-state"

// ─────────────────────────────────────────────────────────────────────────────
// Entity Components
// ─────────────────────────────────────────────────────────────────────────────
export {
  EntityAvatar,
  type EntityAvatarProps,
} from "./entity-avatar"

export {
  EntityCard,
  type EntityCardProps,
  type EntityCardMetadata,
} from "./entity-card"

export {
  EntityCombobox,
  type EntityComboboxProps,
} from "./entity-combobox"

// ─────────────────────────────────────────────────────────────────────────────
// Format Components
// ─────────────────────────────────────────────────────────────────────────────
export {
  FormatAmount,
  type FormatAmountProps,
} from "./format/format-amount"

export {
  FormatPercent,
  type FormatPercentProps,
} from "./format/format-percent"

export {
  FormatDelta,
  type FormatDeltaProps,
} from "./format/format-delta"

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────
export {
  StatusBadge,
  type StatusBadgeProps,
  type StatusConfig,
  type StatusConfigItem,
} from "./status-badge"

// Re-export semantic colors for convenience
export {
  type SemanticColor,
  getStatusColorClasses,
  getStatusHex,
  STATUS_COLORS,
} from "@/lib/status"

// ─────────────────────────────────────────────────────────────────────────────
// Activity (Core Timeline)
// ─────────────────────────────────────────────────────────────────────────────
export {
  ActivityTimeline,
  type Activity,
  type BaseActivity,
  type ActivityTimelineProps,
} from "./activity-timeline"

// ─────────────────────────────────────────────────────────────────────────────
// Activity (Consolidated Components)
// ─────────────────────────────────────────────────────────────────────────────
// Re-export from @/components/shared/activity for convenience
// Full imports should use: import { ... } from '@/components/shared/activity'
export {
  ActivityFeed,
  ActivityItem,
  ActivityFilters,
  ActivityDashboard,
  UnifiedActivityTimeline,
  StatusTimeline,
  ChangeDiff,
  InlineChangeDiff,
  type ActivityFeedProps,
  type ActivityItemProps,
  type ActivityFiltersProps,
  type ActivityFiltersValue,
  type ActivityDashboardProps,
  type StatusTimelineEvent,
  type StatusTimelineProps,
} from "./activity"

// ─────────────────────────────────────────────────────────────────────────────
// Metric Card & Trend Indicator
// ─────────────────────────────────────────────────────────────────────────────
export {
  MetricCard,
  type MetricCardProps,
  type MetricCardVariant,
} from "./metric-card"

export {
  TrendIndicator,
  type TrendIndicatorProps,
  type TrendStyle,
} from "./trend-indicator"

// ─────────────────────────────────────────────────────────────────────────────
// Detail View Components
// ─────────────────────────────────────────────────────────────────────────────
export {
  // Field grid for displaying entity properties
  DetailGrid,
  type DetailGridField,
  type DetailGridProps,
  // Collapsible sections
  DetailSection,
  DetailSections,
  type DetailSectionProps,
  type DetailSectionsProps,
  // Entity header
  EntityHeader,
  type EntityHeaderProps,
  type EntityHeaderAction,
  // Sheet layout
  SheetLayout,
  SheetLayoutWithEntity,
  type SheetLayoutProps,
  type SheetLayoutWithEntityProps,
} from "./detail-view"
