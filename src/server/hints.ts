/**
 * Hints Server Functions
 *
 * Server functions for managing dismissed feature hints.
 * Stores hint dismissal state in user preferences.
 */

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "~/lib/db"
import { users } from "../../drizzle/schema"
import { withAuth } from "~/lib/server/protected"
import type { UserPreferences } from "../../drizzle/schema/users"

// ============================================================================
// TYPES
// ============================================================================

interface ExtendedUserPreferences extends UserPreferences {
  dismissedHints?: string[]
}

// ============================================================================
// GET DISMISSED HINTS
// ============================================================================

/**
 * Get the list of dismissed hint IDs for the current user.
 */
export const getDismissedHints = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const ctx = await withAuth()

    // Get user preferences
    const [user] = await db
      .select({
        preferences: users.preferences,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1)

    const preferences = (user?.preferences ?? {}) as ExtendedUserPreferences
    return preferences.dismissedHints ?? []
  }
)

// ============================================================================
// DISMISS HINT
// ============================================================================

const dismissHintSchema = z.object({
  hintId: z.string().min(1).max(100),
})

/**
 * Dismiss a hint for the current user.
 * Adds the hint ID to the user's dismissed hints list in preferences.
 */
export const dismissHint = createServerFn({ method: "POST" })
  .inputValidator(dismissHintSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth()

    const { hintId } = data

    // Get current preferences
    const [user] = await db
      .select({
        preferences: users.preferences,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1)

    const currentPreferences = (user?.preferences ??
      {}) as ExtendedUserPreferences
    const dismissedHints = new Set(currentPreferences.dismissedHints ?? [])

    // Add new hint (idempotent - won't duplicate)
    dismissedHints.add(hintId)

    // Update preferences
    const newPreferences: ExtendedUserPreferences = {
      ...currentPreferences,
      dismissedHints: [...dismissedHints],
    }

    await db
      .update(users)
      .set({
        preferences: newPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.user.id))

    return { success: true }
  })
