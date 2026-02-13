/**
 * Pipeline Schemas
 *
 * Provides validation schemas for opportunities, quotes, activities, and win/loss tracking.
 */

// --- Core Pipeline Schemas ---
export * from './pipeline';

// --- Detail View Extended Schemas ---
export * from './opportunity-detail-extended';

// --- Re-export key types for convenience ---
export type {
  Opportunity,
  CreateOpportunity,
  UpdateOpportunity,
  OpportunityFilter,
  OpportunityListQuery,
  OpportunityStage,
  OpportunityActivityType,
  QuoteVersion,
  QuoteLineItem,
  QuoteStatus,
  WinLossReasonType,
  OpportunityTableItem,
  QuoteDetailCustomer,
  QuoteVersionSummary,
} from './pipeline';

// --- Re-export type guards ---
export {
  isValidOpportunityStage,
  isValidOpportunityMetadata,
} from './pipeline';
