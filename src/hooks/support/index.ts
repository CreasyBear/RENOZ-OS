/**
 * Support Hooks
 *
 * Provides hooks for support domain operations including issues, RMAs,
 * knowledge base, SLA management, and customer satisfaction.
 */

// Core issue management
export * from './use-issues';
export { useIssueDetail, type CustomerContextData, type IssueDetailActions } from './use-issue-detail';

// Other support features
export * from './use-csat';
export * from './use-issue-templates';
export * from './use-knowledge-base';
export * from './use-rma';
export { useRmaDetail, type UseRmaDetailReturn } from './use-rma-detail';
export * from './use-optimistic-feedback-deltas';
export * from './use-sla';
export * from './use-support-metrics';
