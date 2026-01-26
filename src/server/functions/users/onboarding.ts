/**
 * User Onboarding Server Functions
 *
 * Server functions for managing user onboarding progress.
 *
 * @see drizzle/schema/user-onboarding.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userOnboarding } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { ValidationError } from '@/lib/server/errors';

// ============================================================================
// ONBOARDING STEPS CONFIGURATION
// ============================================================================

/**
 * Default onboarding steps by role.
 * Each step has a key, name, description, and optional action URL.
 */
export const ONBOARDING_STEPS = {
  common: [
    {
      key: 'profile_complete',
      name: 'Complete Your Profile',
      description: 'Add your name, phone number, and profile photo',
      action: '/profile',
    },
    {
      key: 'preferences_set',
      name: 'Set Your Preferences',
      description: 'Customize notifications, appearance, and language',
      action: '/settings/preferences',
    },
  ],
  sales: [
    {
      key: 'first_lead',
      name: 'Add Your First Lead',
      description: 'Create a new lead to start tracking opportunities',
      action: '/leads?new=true',
    },
    {
      key: 'first_quote',
      name: 'Create a Quote',
      description: 'Build your first quote for a customer',
      action: '/quotes?new=true',
    },
  ],
  manager: [
    {
      key: 'team_review',
      name: 'Review Your Team',
      description: 'See team members and their activities',
      action: '/admin/users',
    },
    {
      key: 'pipeline_view',
      name: 'Check the Pipeline',
      description: 'Review the sales pipeline and forecasts',
      action: '/reports/pipeline-forecast',
    },
  ],
  admin: [
    {
      key: 'invite_team',
      name: 'Invite Team Members',
      description: 'Send invitations to your colleagues',
      action: '/admin/invitations',
    },
    {
      key: 'configure_org',
      name: 'Configure Organization',
      description: 'Set up organization settings and permissions',
      action: '/admin/users',
    },
  ],
} as const;

// ============================================================================
// GET ONBOARDING PROGRESS
// ============================================================================

/**
 * Get the current user's onboarding progress.
 */
export const getOnboardingProgress = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth();

    // Get user's completed/dismissed steps
    const progress = await db
      .select({
        stepKey: userOnboarding.stepKey,
        stepName: userOnboarding.stepName,
        isCompleted: userOnboarding.isCompleted,
        completedAt: userOnboarding.completedAt,
        dismissedAt: userOnboarding.dismissedAt,
        metadata: userOnboarding.metadata,
      })
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, ctx.user.id));

    // Get steps based on user's role
    const roleSteps = ONBOARDING_STEPS[ctx.user.role as keyof typeof ONBOARDING_STEPS] || [];
    const allSteps = [...ONBOARDING_STEPS.common, ...roleSteps];

    // Build progress map
    const progressMap = new Map(progress.map((p) => [p.stepKey, p]));

    // Merge steps with progress
    const steps = allSteps.map((step) => {
      const stepProgress = progressMap.get(step.key);
      return {
        ...step,
        isCompleted: stepProgress?.isCompleted || false,
        completedAt: stepProgress?.completedAt || null,
        isDismissed: !!stepProgress?.dismissedAt,
        dismissedAt: stepProgress?.dismissedAt || null,
      };
    });

    // Calculate completion stats
    const totalSteps = steps.length;
    const completedSteps = steps.filter((s) => s.isCompleted).length;
    const dismissedSteps = steps.filter((s) => s.isDismissed && !s.isCompleted).length;
    const remainingSteps = totalSteps - completedSteps - dismissedSteps;
    const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      steps,
      stats: {
        totalSteps,
        completedSteps,
        dismissedSteps,
        remainingSteps,
        percentComplete,
      },
    };
  });

// ============================================================================
// COMPLETE ONBOARDING STEP
// ============================================================================

const completeStepSchema = z.object({
  stepKey: z.string().min(1).max(50),
});

/**
 * Mark an onboarding step as completed.
 */
export const completeOnboardingStep = createServerFn({ method: 'POST' })
  .inputValidator(completeStepSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Check if step exists in config
    const allSteps = [
      ...ONBOARDING_STEPS.common,
      ...(ONBOARDING_STEPS[ctx.user.role as keyof typeof ONBOARDING_STEPS] || []),
    ];
    const stepConfig = allSteps.find((s) => s.key === data.stepKey);

    if (!stepConfig) {
      throw new ValidationError(`Invalid step key: ${data.stepKey}`);
    }

    // Check if record exists
    const [existing] = await db
      .select({ id: userOnboarding.id })
      .from(userOnboarding)
      .where(and(eq(userOnboarding.userId, ctx.user.id), eq(userOnboarding.stepKey, data.stepKey)))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(userOnboarding)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          updatedBy: ctx.user.id,
          version: sql`version + 1`,
        })
        .where(eq(userOnboarding.id, existing.id));
    } else {
      // Create new
      await db.insert(userOnboarding).values({
        userId: ctx.user.id,
        stepKey: data.stepKey,
        stepName: stepConfig.name,
        isCompleted: true,
        completedAt: new Date(),
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });
    }

    return { success: true };
  });

// ============================================================================
// DISMISS ONBOARDING STEP
// ============================================================================

const dismissStepSchema = z.object({
  stepKey: z.string().min(1).max(50),
});

/**
 * Dismiss an onboarding step (user chose to skip).
 */
export const dismissOnboardingStep = createServerFn({ method: 'POST' })
  .inputValidator(dismissStepSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Check if step exists in config
    const allSteps = [
      ...ONBOARDING_STEPS.common,
      ...(ONBOARDING_STEPS[ctx.user.role as keyof typeof ONBOARDING_STEPS] || []),
    ];
    const stepConfig = allSteps.find((s) => s.key === data.stepKey);

    if (!stepConfig) {
      throw new ValidationError(`Invalid step key: ${data.stepKey}`);
    }

    // Check if record exists
    const [existing] = await db
      .select({ id: userOnboarding.id })
      .from(userOnboarding)
      .where(and(eq(userOnboarding.userId, ctx.user.id), eq(userOnboarding.stepKey, data.stepKey)))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(userOnboarding)
        .set({
          dismissedAt: new Date(),
          updatedBy: ctx.user.id,
          version: sql`version + 1`,
        })
        .where(eq(userOnboarding.id, existing.id));
    } else {
      // Create new
      await db.insert(userOnboarding).values({
        userId: ctx.user.id,
        stepKey: data.stepKey,
        stepName: stepConfig.name,
        dismissedAt: new Date(),
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });
    }

    return { success: true };
  });

// ============================================================================
// RESET ONBOARDING
// ============================================================================

/**
 * Reset all onboarding progress for the current user.
 * Useful for testing or if user wants to redo onboarding.
 */
export const resetOnboarding = createServerFn({ method: 'POST' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const ctx = await withAuth();

    await db.delete(userOnboarding).where(eq(userOnboarding.userId, ctx.user.id));

    return { success: true };
  });
