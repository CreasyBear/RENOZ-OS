import { eq, or, sql } from 'drizzle-orm';
import { slaTracking, warrantyClaims } from 'drizzle/schema';

export const WARRANTY_CLAIM_AT_RISK_THRESHOLD = 0.25;

export function buildClaimAtRiskOrBreachedCondition() {
  // Mirrors getSlaDueStatus(..., atRiskThresholdPercent=25):
  // at_risk when due is in the future and remaining time < 25% of total duration from submittedAt.
  const responseAtRisk = sql<boolean>`
    ${slaTracking.responseDueAt} IS NOT NULL
    AND ${slaTracking.respondedAt} IS NULL
    AND ${slaTracking.responseDueAt} > NOW()
    AND EXTRACT(EPOCH FROM (${slaTracking.responseDueAt} - NOW()))
      < EXTRACT(EPOCH FROM (${slaTracking.responseDueAt} - ${warrantyClaims.submittedAt}))
        * ${WARRANTY_CLAIM_AT_RISK_THRESHOLD}
  `;

  const resolutionAtRisk = sql<boolean>`
    ${slaTracking.resolutionDueAt} IS NOT NULL
    AND ${slaTracking.resolvedAt} IS NULL
    AND ${slaTracking.resolutionDueAt} > NOW()
    AND EXTRACT(EPOCH FROM (${slaTracking.resolutionDueAt} - NOW()))
      < EXTRACT(EPOCH FROM (${slaTracking.resolutionDueAt} - ${warrantyClaims.submittedAt}))
        * ${WARRANTY_CLAIM_AT_RISK_THRESHOLD}
  `;

  return or(
    eq(slaTracking.responseBreached, true),
    eq(slaTracking.resolutionBreached, true),
    responseAtRisk,
    resolutionAtRisk
  );
}
