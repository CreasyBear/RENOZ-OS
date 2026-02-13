/**
 * Opportunity Tab Components
 *
 * Lazy-loaded tab components for the opportunity detail view.
 * Each tab is a full feature, not a preview.
 *
 * Usage with React.lazy + Suspense:
 * ```tsx
 * import { LazyOverviewTab, LazyQuoteTab, LazyActivitiesTab } from './tabs';
 *
 * <Suspense fallback={<TabSkeleton />}>
 *   <LazyOverviewTab {...props} />
 * </Suspense>
 * ```
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Tabs Philosophy)
 */

import { lazy } from 'react';

// ============================================================================
// LAZY COMPONENTS (for code splitting)
// ============================================================================

export const LazyOverviewTab = lazy(() => import('./opportunity-overview-tab'));
export const LazyQuoteTab = lazy(() => import('./opportunity-quote-tab'));
export const LazyActivitiesTab = lazy(() => import('./opportunity-activities-tab'));
export const LazyDocumentsTab = lazy(() => import('./opportunity-documents-tab'));

// ============================================================================
// TYPE-ONLY EXPORTS (no runtime load)
// ============================================================================

export type { OpportunityOverviewTabProps } from './opportunity-overview-tab';
export type { OpportunityQuoteTabProps } from './opportunity-quote-tab';
export type { OpportunityActivitiesTabProps } from './opportunity-activities-tab';
export type { OpportunityDocumentsTabProps } from './opportunity-documents-tab';
