/**
 * Communication Preferences Server Functions
 *
 * Manages contact communication preferences (email/SMS opt-in).
 * Logs all preference changes to activities for GDPR/CAN-SPAM compliance.
 *
 * @see DOM-COMMS-005
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, customerActivities } from "../../../drizzle/schema";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const updatePreferencesSchema = z.object({
  contactId: z.string().uuid(),
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
});

const getPreferencesSchema = z.object({
  contactId: z.string().uuid(),
});

const getPreferenceHistorySchema = z.object({
  contactId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Get communication preferences for a contact
 */
export const getContactPreferences = createServerFn({ method: "GET" })
  .inputValidator(getPreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const [contact] = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        emailOptIn: contacts.emailOptIn,
        smsOptIn: contacts.smsOptIn,
        emailOptInAt: contacts.emailOptInAt,
        smsOptInAt: contacts.smsOptInAt,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, data.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!contact) {
      throw new Error("Contact not found");
    }

    return contact;
  });

/**
 * Update communication preferences for a contact
 * Logs changes to activities for compliance audit trail
 */
export const updateContactPreferences = createServerFn({ method: "POST" })
  .inputValidator(updatePreferencesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.update });

    // Get current preferences
    const [contact] = await db
      .select({
        id: contacts.id,
        customerId: contacts.customerId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        emailOptIn: contacts.emailOptIn,
        smsOptIn: contacts.smsOptIn,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, data.contactId),
          eq(contacts.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!contact) {
      throw new Error("Contact not found");
    }

    const now = new Date().toISOString();
    const updateData: Partial<typeof contacts.$inferInsert> = {};
    const changes: { field: string; oldValue: boolean; newValue: boolean }[] =
      [];

    // Track email preference changes
    if (data.emailOptIn !== undefined && data.emailOptIn !== contact.emailOptIn) {
      updateData.emailOptIn = data.emailOptIn;
      updateData.emailOptInAt = now;
      changes.push({
        field: "emailOptIn",
        oldValue: contact.emailOptIn,
        newValue: data.emailOptIn,
      });
    }

    // Track SMS preference changes
    if (data.smsOptIn !== undefined && data.smsOptIn !== contact.smsOptIn) {
      updateData.smsOptIn = data.smsOptIn;
      updateData.smsOptInAt = now;
      changes.push({
        field: "smsOptIn",
        oldValue: contact.smsOptIn,
        newValue: data.smsOptIn,
      });
    }

    if (Object.keys(updateData).length === 0) {
      return contact; // No changes
    }

    // Update preferences
    const [updated] = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, data.contactId))
      .returning();

    // Log preference changes to activities for compliance
    for (const change of changes) {
      const actionLabel = change.newValue ? "opted in" : "opted out";
      const channelLabel = change.field === "emailOptIn" ? "email" : "SMS";

      await db.insert(customerActivities).values({
        organizationId: ctx.organizationId,
        customerId: contact.customerId,
        contactId: contact.id,
        createdBy: ctx.user.id,
        activityType: "note",
        description: `Communication preference changed: ${contact.firstName} ${contact.lastName} ${actionLabel} of ${channelLabel} communications`,
        metadata: {
          preferenceChange: true,
          channel: channelLabel,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changedAt: now,
          changedBy: ctx.user.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
        },
      });
    }

    return updated;
  });

/**
 * Get preference change history for compliance audit
 */
export const getPreferenceHistory = createServerFn({ method: "GET" })
  .inputValidator(getPreferenceHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    const conditions = [
      eq(customerActivities.organizationId, ctx.organizationId),
    ];

    if (data.contactId) {
      conditions.push(eq(customerActivities.contactId, data.contactId));
    }

    if (data.customerId) {
      conditions.push(eq(customerActivities.customerId, data.customerId));
    }

    // Get activities that are preference changes
    const results = await db
      .select()
      .from(customerActivities)
      .where(and(...conditions))
      .orderBy(desc(customerActivities.createdAt))
      .limit(data.limit)
      .offset(data.offset);

    // Filter to preference changes only
    const preferenceChanges = results.filter(
      (activity) =>
        activity.metadata &&
        typeof activity.metadata === "object" &&
        "preferenceChange" in activity.metadata &&
        activity.metadata.preferenceChange === true
    );

    return {
      items: preferenceChanges,
      total: preferenceChanges.length,
    };
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a contact has opted in to email communications
 * Call this before sending any marketing/campaign emails
 */
export async function isEmailOptedIn(
  contactId: string,
  organizationId: string
): Promise<boolean> {
  const [contact] = await db
    .select({ emailOptIn: contacts.emailOptIn })
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.organizationId, organizationId)
      )
    )
    .limit(1);

  return contact?.emailOptIn ?? false;
}

/**
 * Check if a contact has opted in to SMS communications
 */
export async function isSmsOptedIn(
  contactId: string,
  organizationId: string
): Promise<boolean> {
  const [contact] = await db
    .select({ smsOptIn: contacts.smsOptIn })
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.organizationId, organizationId)
      )
    )
    .limit(1);

  return contact?.smsOptIn ?? false;
}

/**
 * Generate secure unsubscribe token for a contact.
 *
 * @deprecated Use `generateUnsubscribeToken` from `@/lib/server/unsubscribe-tokens.ts` instead.
 * This legacy function is kept for backward compatibility only.
 *
 * The legacy format (base64 without HMAC) is insecure and should not be used
 * for new unsubscribe links.
 */
export function generateUnsubscribeToken(
  contactId: string,
  channel: "email" | "sms"
): string {
  // Legacy token format: base64(contactId:channel:timestamp)
  // WARNING: This format is insecure - use the new HMAC-signed tokens instead
  // @see src/lib/server/unsubscribe-tokens.ts
  console.warn(
    "[communication-preferences] generateUnsubscribeToken is deprecated. " +
      "Use generateUnsubscribeToken from @/lib/server/unsubscribe-tokens.ts instead."
  );
  const payload = `${contactId}:${channel}:${Date.now()}`;
  return Buffer.from(payload).toString("base64url");
}

/**
 * Verify legacy unsubscribe token and return contact ID.
 *
 * @deprecated This function only verifies legacy (insecure) tokens.
 * New HMAC-signed tokens should be verified using `verifyUnsubscribeToken`
 * from `@/lib/server/unsubscribe-tokens.ts`.
 *
 * This is kept for backward compatibility with existing unsubscribe links.
 * It will be removed in a future version after migration period.
 */
export function verifyUnsubscribeToken(
  token: string
): { contactId: string; channel: "email" | "sms" } | null {
  try {
    // Legacy format: base64(contactId:channel:timestamp)
    const payload = Buffer.from(token, "base64url").toString();
    const [contactId, channel] = payload.split(":");
    if (!contactId || !["email", "sms"].includes(channel)) {
      return null;
    }
    return { contactId, channel: channel as "email" | "sms" };
  } catch {
    return null;
  }
}
