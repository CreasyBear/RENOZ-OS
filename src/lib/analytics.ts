/**
 * Analytics / Telemetry
 *
 * Central event tracking for funnel and UX observability.
 * Extend with PostHog, Mixpanel, or similar when needed.
 */

import { logger } from '@/lib/logger';

export type InviteEvent =
  | { name: 'invite_sent'; email: string; role: string }
  | { name: 'invite_accepted'; email: string; role: string }
  | { name: 'invite_resend'; email?: string; id?: string }
  | { name: 'invite_cancelled'; email?: string; id?: string };

export type OnboardingEvent =
  | { name: 'onboarding_started' }
  | { name: 'onboarding_completed'; percentComplete: number };

export type InvitationEvent = InviteEvent | OnboardingEvent;

export function trackInvitationEvent(event: InvitationEvent): void {
  logger.debug('[analytics]', { eventName: event.name, event });
  // Wire to PostHog, Mixpanel, etc. when configured
  // e.g. posthog?.capture(event.name, event);
}

// Convenience helpers
export function trackInviteSent(params: { email: string; role: string }) {
  trackInvitationEvent({ name: 'invite_sent', ...params });
}

export function trackInviteAccepted(params: { email: string; role: string }) {
  trackInvitationEvent({ name: 'invite_accepted', ...params });
}

export function trackInviteResend(params: { email?: string; id?: string }) {
  trackInvitationEvent({ name: 'invite_resend', ...params });
}

export function trackInviteCancelled(params: { email?: string; id?: string }) {
  trackInvitationEvent({ name: 'invite_cancelled', ...params });
}

export function trackOnboardingStarted() {
  trackInvitationEvent({ name: 'onboarding_started' });
}

export function trackOnboardingCompleted(params: { percentComplete: number }) {
  trackInvitationEvent({ name: 'onboarding_completed', ...params });
}
