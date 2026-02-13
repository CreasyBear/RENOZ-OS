/**
 * Project Sidebar Components
 *
 * Modular card components for the project detail sidebar (Zone 5B).
 * All components are pure presenters - they receive data via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 */

// ============================================================================
// CUSTOMER
// ============================================================================

export { CustomerCard, type CustomerCardProps } from './customer-card';

// ============================================================================
// SITE ADDRESS
// ============================================================================

export { SiteAddressCard, type SiteAddressCardProps } from './site-address-card';

// ============================================================================
// PROGRESS
// ============================================================================

export { ProgressCard, type ProgressCardProps } from './progress-card';

// ============================================================================
// TEAM
// ============================================================================

export { TeamCard, type TeamCardProps, type TeamMember } from './team-card';

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export { AuditTrailCard, type AuditTrailCardProps } from './audit-trail-card';

// ============================================================================
// TIME TRACKING
// ============================================================================

export { TimeCard, type TimeCardProps } from './time-card';

// ============================================================================
// RELATED LINKS
// ============================================================================

export { RelatedLinksCard, type RelatedLinksCardProps } from './related-links-card';
