/**
 * Campaign Utilities
 *
 * Business logic utilities for campaign calculations and transformations.
 * Extracted from components to ensure consistency and testability.
 *
 * @see docs/pre_deployment_audit/2026-02-04-communications-ANTIPATTERNS.md
 */

import type { Campaign, CampaignListItem } from '@/lib/schemas/communications'

// ============================================================================
// BUSINESS LOGIC CONSTANTS
// ============================================================================

/**
 * Threshold for high bounce rate alert (percentage)
 */
export const BOUNCE_RATE_THRESHOLD = 10

/**
 * Threshold for low engagement alert (open rate percentage)
 */
export const LOW_ENGAGEMENT_THRESHOLD = 5

// ============================================================================
// RATE CALCULATIONS
// ============================================================================

/**
 * Calculate bounce rate percentage
 * @param bounced - Number of bounced emails
 * @param sent - Number of sent emails
 * @returns Bounce rate as percentage (0-100)
 */
export function calculateBounceRate(bounced: number, sent: number): number {
  if (sent === 0) return 0
  return Math.round((bounced / sent) * 100)
}

/**
 * Calculate open rate percentage
 * @param opened - Number of opened emails
 * @param sent - Number of sent emails
 * @returns Open rate as percentage (0-100)
 */
export function calculateOpenRate(opened: number, sent: number): number {
  if (sent === 0) return 0
  return Math.round((opened / sent) * 100)
}

/**
 * Calculate click rate percentage
 * @param clicked - Number of clicked emails
 * @param sent - Number of sent emails
 * @returns Click rate as percentage (0-100)
 */
export function calculateClickRate(clicked: number, sent: number): number {
  if (sent === 0) return 0
  return Math.round((clicked / sent) * 100)
}

/**
 * Calculate percentage for any value/total pair
 * @param value - The value to calculate percentage for
 * @param total - The total to calculate percentage against
 * @returns Percentage as integer (0-100)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Calculate send progress percentage
 * @param sentCount - Number of emails sent
 * @param recipientCount - Total number of recipients
 * @returns Progress as percentage (0-100)
 */
export function calculateSendProgress(sentCount: number, recipientCount: number): number {
  if (recipientCount === 0) return 0
  return Math.round((sentCount / recipientCount) * 100)
}

// ============================================================================
// DATA TRANSFORMATIONS
// ============================================================================

/**
 * Transform Campaign (server type) to CampaignListItem (UI type)
 * Centralizes the transformation logic for consistency.
 *
 * @param campaign - Campaign from server (Date objects)
 * @returns CampaignListItem for UI (ISO string dates)
 */
export function transformCampaignToListItem(campaign: Campaign): CampaignListItem {
  return {
    id: campaign.id,
    name: campaign.name,
    templateType: campaign.templateType,
    status: campaign.status,
    recipientCount: campaign.recipientCount ?? 0,
    sentCount: campaign.sentCount ?? 0,
    openCount: campaign.openCount ?? 0,
    clickCount: campaign.clickCount ?? 0,
    bounceCount: campaign.bounceCount ?? 0,
    failedCount: campaign.failedCount ?? 0,
    scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
    startedAt: campaign.startedAt?.toISOString() ?? null,
    completedAt: campaign.completedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
  }
}

/**
 * Transform array of Campaigns to CampaignListItems
 * @param campaigns - Array of campaigns from server
 * @returns Array of campaign list items for UI
 */
export function transformCampaignsToListItems(campaigns: Campaign[]): CampaignListItem[] {
  return campaigns.map(transformCampaignToListItem)
}
