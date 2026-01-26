/**
 * Onboarding Server Functions
 *
 * Server functions for tracking onboarding progress and checklist state.
 * Uses organization settings to persist dismissed state.
 */

import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import { db } from "~/lib/db"
import { organizations, customers, products, opportunities, type OrganizationSettings } from "../../drizzle/schema"
import { withAuth } from "~/lib/server/protected"

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingProgress {
  /** Whether the checklist has been dismissed */
  dismissed: boolean
  /** Whether org has at least one customer */
  hasCustomer: boolean
  /** Whether org has at least one product */
  hasProduct: boolean
  /** Whether org has at least one quote/opportunity */
  hasQuote: boolean
}

// ============================================================================
// GET ONBOARDING PROGRESS
// ============================================================================

/**
 * Get the current onboarding progress for the organization.
 * Checks if the welcome checklist has been dismissed and
 * whether first customer/product/quote have been created.
 */
export const getOnboardingProgress = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingProgress> => {
    const ctx = await withAuth()

    // Get organization settings to check dismissed state
    const [org] = await db
      .select({
        settings: organizations.settings,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1)

    const settings = (org?.settings ?? {}) as OrganizationSettings
    const dismissed = Boolean(settings.onboardingChecklistDismissed)

    // If already dismissed, skip expensive existence checks
    if (dismissed) {
      return {
        dismissed: true,
        hasCustomer: true,
        hasProduct: true,
        hasQuote: true,
      }
    }

    // Check for existence of first customer, product, quote in parallel
    // Using COUNT with LIMIT 1 for efficiency
    const [customerResult, productResult, quoteResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(eq(customers.organizationId, ctx.organizationId))
        .limit(1),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(eq(products.organizationId, ctx.organizationId))
        .limit(1),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(opportunities)
        .where(eq(opportunities.organizationId, ctx.organizationId))
        .limit(1),
    ])

    return {
      dismissed: false,
      hasCustomer: (customerResult[0]?.count ?? 0) > 0,
      hasProduct: (productResult[0]?.count ?? 0) > 0,
      hasQuote: (quoteResult[0]?.count ?? 0) > 0,
    }
  }
)

// ============================================================================
// DISMISS WELCOME CHECKLIST
// ============================================================================

/**
 * Dismiss the welcome checklist permanently for the organization.
 * Stores the dismissed state in organization settings.
 */
export const dismissWelcomeChecklist = createServerFn({
  method: "POST",
}).handler(async (): Promise<{ success: boolean }> => {
  const ctx = await withAuth()

  // Get current settings
  const [org] = await db
    .select({
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1)

  const currentSettings = (org?.settings ?? {}) as OrganizationSettings

  // Merge with new dismissed state
  const newSettings: OrganizationSettings = {
    ...currentSettings,
    onboardingChecklistDismissed: true,
    onboardingChecklistDismissedAt: new Date().toISOString(),
    onboardingChecklistDismissedBy: ctx.user.id,
  }

  // Update organization settings
  await db
    .update(organizations)
    .set({
      settings: newSettings,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, ctx.organizationId))

  return { success: true }
})
