/**
 * Inventory Components Barrel Export
 *
 * New components for the item tracking view (Phase 1 redesign).
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

export {
  ItemLifecycleProgress,
  type ItemLifecycleProgressProps,
  type ItemLifecycleStage,
} from './item-lifecycle-progress';

export {
  OrderAssociationCard,
  type OrderAssociationCardProps,
  type OrderAssociation,
} from './order-association-card';

export {
  ItemLifecycleTimeline,
  type ItemLifecycleTimelineProps,
  type LifecycleEvent,
} from './item-lifecycle-timeline';
