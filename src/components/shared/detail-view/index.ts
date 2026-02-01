/**
 * Detail View Shared Components
 *
 * Reusable components for building entity detail views.
 * Based on patterns from Midday and Project Management references.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

// Grid for displaying entity fields
export {
  DetailGrid,
  type DetailGridField,
  type DetailGridProps,
} from './detail-grid';

// Collapsible sections
export {
  DetailSection,
  DetailSections,
  type DetailSectionProps,
  type DetailSectionsProps,
} from './detail-section';

// NOTE: For summary statistics/metrics, use MetricCard from @/components/shared/metric-card
// The SummaryStats component was removed to avoid duplication.

// Entity header with avatar, name, status, actions
export {
  EntityHeader,
  type EntityHeaderProps,
  type EntityHeaderAction,
} from './entity-header';

// Sheet layout with scrollable content and fixed footer
export {
  SheetLayout,
  SheetLayoutWithEntity,
  type SheetLayoutProps,
  type SheetLayoutWithEntityProps,
} from './sheet-layout';
