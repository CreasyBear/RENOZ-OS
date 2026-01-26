// Barrel exports for customers domain
export * from './customer-analytics';
export * from './customer-duplicate-scan';
export * from './customer-duplicates';
// Note: customer-segments exports getSegmentsWithStats (read-only aggregate queries)
// Segment CRUD operations use customerTags directly via tags hooks
export { getSegmentsWithStats, getSegmentAnalytics } from './customer-segments';
export * from './customers';
export * from './csat-responses';
