/**
 * Campaign Alert Generation
 *
 * Business logic for generating campaign alerts based on status and metrics.
 * Extracted from components to ensure consistency and testability.
 *
 * @see docs/pre_deployment_audit/2026-02-04-communications-ANTIPATTERNS.md
 */

import type { Campaign } from '@/lib/schemas/communications'
import { calculateBounceRate, calculateOpenRate, BOUNCE_RATE_THRESHOLD, LOW_ENGAGEMENT_THRESHOLD } from './campaign-utils'
import { generateAlertId } from '@/hooks/_shared/use-alert-dismissals'

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignAlert {
  id: string
  tone: 'critical' | 'warning' | 'info'
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

// ============================================================================
// ALERT GENERATION
// ============================================================================

/**
 * Generate alerts for a campaign based on status and metrics
 * @param campaign - Campaign to generate alerts for
 * @returns Array of alerts to display
 */
export function generateCampaignAlerts(campaign: Campaign): CampaignAlert[] {
  const alerts: CampaignAlert[] = []

  // Critical: High bounce rate (>10%)
  if (campaign.sentCount > 0) {
    const bounceRate = calculateBounceRate(campaign.bounceCount, campaign.sentCount)
    if (bounceRate > BOUNCE_RATE_THRESHOLD) {
      alerts.push({
        id: generateAlertId('campaign', campaign.id, 'high_bounce_rate'),
        tone: 'critical',
        title: 'High bounce rate detected',
        description: `${campaign.bounceCount} emails bounced (${bounceRate}%). Review recipient list and email content.`,
        actionLabel: 'View recipients',
        onAction: () => {
          // Scroll to recipients section
          document.getElementById('recipients')?.scrollIntoView({ behavior: 'smooth' })
        },
      })
    }
  }

  // Warning: Campaign failed
  if (campaign.status === 'failed') {
    alerts.push({
      id: generateAlertId('campaign', campaign.id, 'campaign_failed'),
      tone: 'critical',
      title: 'Campaign failed',
      description: 'This campaign encountered errors during sending. Review the recipient list for details.',
      actionLabel: 'View errors',
      onAction: () => {
        document.getElementById('recipients')?.scrollIntoView({ behavior: 'smooth' })
      },
    })
  }

  // Warning: Low engagement (<5% open rate)
  if (campaign.sentCount > 0) {
    const openRate = calculateOpenRate(campaign.openCount, campaign.sentCount)
    if (openRate < LOW_ENGAGEMENT_THRESHOLD && campaign.status === 'sent') {
      alerts.push({
        id: generateAlertId('campaign', campaign.id, 'low_engagement'),
        tone: 'warning',
        title: 'Low engagement rate',
        description: `Only ${openRate}% of recipients opened this email. Consider reviewing subject line and content.`,
        actionLabel: 'View analytics',
        onAction: () => {
          // Future: Navigate to analytics tab
        },
      })
    }
  }

  // Info: Campaign paused
  if (campaign.status === 'paused') {
    alerts.push({
      id: generateAlertId('campaign', campaign.id, 'campaign_paused'),
      tone: 'info',
      title: 'Campaign paused',
      description: 'This campaign has been paused. Resume sending when ready.',
    })
  }

  return alerts
}
