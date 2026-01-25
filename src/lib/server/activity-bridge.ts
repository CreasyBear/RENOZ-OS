/**
 * Activity Bridge Service
 *
 * Automatically creates activity records from communications.
 * This bridges emails, calls, and other communication events to
 * the centralized activity trail.
 *
 * @see COMMS-AUTO-001
 */

import { db } from "@/lib/db";
import { activities, type ActivityMetadata, type ActivitySource } from "drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Email details for creating an activity
 */
export interface EmailActivityInput {
  /** Email record ID */
  emailId: string;
  /** Organization ID */
  organizationId: string;
  /** User who sent the email (nullable for system emails) */
  userId?: string | null;
  /** Customer ID if linked to a known customer */
  customerId?: string | null;
  /** Opportunity ID if email is in opportunity context */
  opportunityId?: string | null;
  /** Email subject for activity description */
  subject: string;
  /** Recipient email address */
  recipientEmail: string;
  /** Recipient name if known */
  recipientName?: string | null;
}

/**
 * Call details for creating an activity
 */
export interface CallActivityInput {
  /** Call record ID */
  callId: string;
  /** Organization ID */
  organizationId: string;
  /** User who made/received the call */
  userId?: string | null;
  /** Customer ID */
  customerId?: string | null;
  /** Opportunity ID if call is in opportunity context */
  opportunityId?: string | null;
  /** Call purpose/type */
  purpose: string;
  /** Call duration in minutes */
  durationMinutes?: number;
  /** Call direction: inbound or outbound */
  direction?: "inbound" | "outbound";
  /** Call notes */
  notes?: string | null;
}

// ============================================================================
// EMAIL-TO-ACTIVITY BRIDGE
// ============================================================================

/**
 * Create an activity record when an email is sent.
 *
 * This function should be called after an email is successfully sent
 * to create a corresponding activity in the activity trail.
 *
 * The activity is linked to the customer if a customerId is provided,
 * allowing the email to appear in the customer's activity timeline.
 *
 * @param input - Email details
 * @returns The created activity record
 */
export async function createEmailSentActivity(
  input: EmailActivityInput
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const {
    emailId,
    organizationId,
    userId,
    customerId,
    opportunityId,
    subject,
    recipientEmail,
    recipientName,
  } = input;

  try {
    // Determine the entity type and ID for the activity
    // If we have a customerId, link to the customer
    // Otherwise, link to the email record itself
    const entityType = customerId ? "customer" : "email";
    const entityId = customerId ?? emailId;

    // Build description
    const recipientDisplay = recipientName || recipientEmail;
    const description = `Email sent to ${recipientDisplay}: ${subject}`;

    // Build metadata with link to full email
    const metadata: ActivityMetadata = {
      emailId,
      recipientEmail,
      recipientName: recipientName ?? undefined,
      subject,
    };

    // Add opportunity context if available
    if (opportunityId) {
      metadata.opportunityId = opportunityId;
    }

    // Create the activity record with source tracking (COMMS-AUTO-002)
    const [activity] = await db
      .insert(activities)
      .values({
        organizationId,
        userId: userId ?? undefined,
        entityType: entityType as "customer" | "email",
        entityId,
        action: "email_sent",
        description,
        metadata,
        source: "email" as ActivitySource, // Auto-captured from email system
        sourceRef: emailId, // Link to the email_history record
      })
      .returning({ id: activities.id });

    console.log(`[activity-bridge] Created email_sent activity: ${activity.id} for email ${emailId}`);

    return { success: true, activityId: activity.id };
  } catch (error) {
    console.error("[activity-bridge] Failed to create email_sent activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create an activity record when an email is opened.
 *
 * @param input - Email details
 * @returns The created activity record
 */
export async function createEmailOpenedActivity(
  input: Pick<EmailActivityInput, "emailId" | "organizationId" | "customerId" | "subject" | "recipientEmail" | "recipientName">
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const {
    emailId,
    organizationId,
    customerId,
    subject,
    recipientEmail,
    recipientName,
  } = input;

  try {
    const entityType = customerId ? "customer" : "email";
    const entityId = customerId ?? emailId;

    const recipientDisplay = recipientName || recipientEmail;
    const description = `Email opened by ${recipientDisplay}: ${subject}`;

    const metadata: ActivityMetadata = {
      emailId,
      recipientEmail,
      recipientName: recipientName ?? undefined,
      subject,
    };

    const [activity] = await db
      .insert(activities)
      .values({
        organizationId,
        userId: null, // System event, no user
        entityType: entityType as "customer" | "email",
        entityId,
        action: "email_opened",
        description,
        metadata,
        source: "email" as ActivitySource, // Auto-captured from email tracking
        sourceRef: emailId,
      })
      .returning({ id: activities.id });

    console.log(`[activity-bridge] Created email_opened activity: ${activity.id} for email ${emailId}`);

    return { success: true, activityId: activity.id };
  } catch (error) {
    console.error("[activity-bridge] Failed to create email_opened activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create an activity record when an email link is clicked.
 *
 * @param input - Email details with clicked URL
 * @returns The created activity record
 */
export async function createEmailClickedActivity(
  input: Pick<EmailActivityInput, "emailId" | "organizationId" | "customerId" | "subject" | "recipientEmail" | "recipientName"> & {
    clickedUrl: string;
    linkId: string;
  }
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const {
    emailId,
    organizationId,
    customerId,
    subject,
    recipientEmail,
    recipientName,
    clickedUrl,
    linkId,
  } = input;

  try {
    const entityType = customerId ? "customer" : "email";
    const entityId = customerId ?? emailId;

    const recipientDisplay = recipientName || recipientEmail;
    const description = `Email link clicked by ${recipientDisplay}: ${subject}`;

    const metadata: ActivityMetadata = {
      emailId,
      recipientEmail,
      recipientName: recipientName ?? undefined,
      subject,
      clickedUrl,
      linkId,
    };

    const [activity] = await db
      .insert(activities)
      .values({
        organizationId,
        userId: null, // System event, no user
        entityType: entityType as "customer" | "email",
        entityId,
        action: "email_clicked",
        description,
        metadata,
        source: "email" as ActivitySource, // Auto-captured from email tracking
        sourceRef: emailId,
      })
      .returning({ id: activities.id });

    console.log(`[activity-bridge] Created email_clicked activity: ${activity.id} for email ${emailId}`);

    return { success: true, activityId: activity.id };
  } catch (error) {
    console.error("[activity-bridge] Failed to create email_clicked activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// BATCH EMAIL-TO-ACTIVITY BRIDGE (PERF-001)
// ============================================================================

/**
 * Create activity records for multiple emails in a single batch operation.
 *
 * This is a high-performance alternative to createEmailSentActivity for bulk
 * operations like campaign sends. Instead of N individual INSERT statements,
 * this uses a single bulk INSERT.
 *
 * @param inputs - Array of email details
 * @returns Result with count of activities created
 */
export async function createEmailActivitiesBatch(
  inputs: EmailActivityInput[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (inputs.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    // Build all activity values
    const values = inputs.map((input) => {
      const {
        emailId,
        organizationId,
        userId,
        customerId,
        subject,
        recipientEmail,
        recipientName,
        opportunityId,
      } = input;

      // Determine the entity type and ID for the activity
      const entityType = customerId ? "customer" : "email";
      const entityId = customerId ?? emailId;

      // Build description
      const recipientDisplay = recipientName || recipientEmail;
      const description = `Email sent to ${recipientDisplay}: ${subject}`;

      // Build metadata with link to full email
      const metadata: ActivityMetadata = {
        emailId,
        recipientEmail,
        recipientName: recipientName ?? undefined,
        subject,
      };

      // Add opportunity context if available
      if (opportunityId) {
        metadata.opportunityId = opportunityId;
      }

      return {
        organizationId,
        userId: userId ?? undefined,
        entityType: entityType as "customer" | "email",
        entityId,
        action: "email_sent" as const,
        description,
        metadata,
        source: "email" as ActivitySource,
        sourceRef: emailId,
      };
    });

    // Single bulk insert
    await db.insert(activities).values(values);

    console.log(`[activity-bridge] Batch created ${inputs.length} email_sent activities`);

    return { success: true, count: inputs.length };
  } catch (error) {
    console.error("[activity-bridge] Failed to batch create email_sent activities:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// CALL-TO-ACTIVITY BRIDGE
// ============================================================================

/**
 * Create an activity record when a call is logged.
 *
 * @param input - Call details
 * @returns The created activity record
 */
export async function createCallLoggedActivity(
  input: CallActivityInput
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const {
    callId,
    organizationId,
    userId,
    customerId,
    opportunityId,
    purpose,
    durationMinutes,
    direction,
    notes,
  } = input;

  try {
    const entityType = customerId ? "customer" : "call";
    const entityId = customerId ?? callId;

    // Build description
    const directionLabel = direction === "inbound" ? "Inbound" : "Outbound";
    const durationLabel = durationMinutes ? ` (${durationMinutes} min)` : "";
    const description = `${directionLabel} call: ${purpose}${durationLabel}`;

    const metadata: ActivityMetadata = {
      callId,
      purpose,
      direction,
    };

    if (durationMinutes !== undefined) {
      metadata.durationMinutes = durationMinutes;
    }

    if (opportunityId) {
      metadata.opportunityId = opportunityId;
    }

    if (notes) {
      metadata.notes = notes;
    }

    const [activity] = await db
      .insert(activities)
      .values({
        organizationId,
        userId: userId ?? undefined,
        entityType: entityType as "customer" | "call",
        entityId,
        action: "call_logged",
        description,
        metadata,
        source: "manual" as ActivitySource, // Calls are logged manually by users
        sourceRef: callId,
      })
      .returning({ id: activities.id });

    console.log(`[activity-bridge] Created call_logged activity: ${activity.id} for call ${callId}`);

    return { success: true, activityId: activity.id };
  } catch (error) {
    console.error("[activity-bridge] Failed to create call_logged activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// NOTE-TO-ACTIVITY BRIDGE
// ============================================================================

/**
 * Create an activity record when a note is added.
 *
 * @param input - Note details
 * @returns The created activity record
 */
export async function createNoteAddedActivity(input: {
  noteId: string;
  organizationId: string;
  userId?: string | null;
  customerId?: string | null;
  opportunityId?: string | null;
  content: string;
}): Promise<{ success: boolean; activityId?: string; error?: string }> {
  const {
    noteId,
    organizationId,
    userId,
    customerId,
    opportunityId,
    content,
  } = input;

  try {
    // Determine entity type and ID
    const entityType = customerId ? "customer" : opportunityId ? "opportunity" : "contact";
    const entityId = customerId ?? opportunityId ?? noteId;

    // Truncate content for description
    const truncatedContent = content.length > 100 ? content.substring(0, 100) + "..." : content;
    const description = `Note added: ${truncatedContent}`;

    const metadata: ActivityMetadata = {
      noteId,
      contentPreview: truncatedContent,
    };

    if (opportunityId && !customerId) {
      metadata.opportunityId = opportunityId;
    }

    const [activity] = await db
      .insert(activities)
      .values({
        organizationId,
        userId: userId ?? undefined,
        entityType: entityType as "customer" | "opportunity" | "contact",
        entityId,
        action: "note_added",
        description,
        metadata,
        source: "manual" as ActivitySource, // Notes are added manually by users
        sourceRef: noteId,
      })
      .returning({ id: activities.id });

    console.log(`[activity-bridge] Created note_added activity: ${activity.id}`);

    return { success: true, activityId: activity.id };
  } catch (error) {
    console.error("[activity-bridge] Failed to create note_added activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
