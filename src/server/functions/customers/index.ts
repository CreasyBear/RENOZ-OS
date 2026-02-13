// Barrel exports for customers domain
export * from './action-plans';
export * from './customer-analytics';
export * from './customer-detail-extended';
export * from './customer-duplicate-scan';
export * from './customer-duplicates';
// Note: customer-segments exports getSegmentsWithStats (read-only aggregate queries)
// Segment CRUD operations use customerTags directly via tags hooks
export { getSegmentsWithStats, getSegmentAnalytics } from './customer-segments';
export * from './customers';
export { bulkUpdateHealthScores } from './customers';
export * from './rollback';
export * from './csat-responses';
export * from './saved-filters';
