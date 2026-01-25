/**
 * Webhook Events Schema
 *
 * Tracks processed webhook events for idempotency.
 * Prevents duplicate processing when Resend retries webhook deliveries.
 *
 * Table category: appendOnly (per column-patterns.json)
 *
 * @see _Initiation/_prd/3-integrations/resend/resend.prd.json
 * @see todos/resend-integration/004-pending-p1-webhook-idempotency.md
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  uniqueIndex,
  index,
  timestamp,
} from "drizzle-orm/pg-core";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Stored webhook event payload for debugging/audit purposes.
 */
export interface WebhookEventPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    bounce?: {
      type: string;
      message: string;
    };
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

// ============================================================================
// WEBHOOK EVENTS TABLE (Append-Only)
// ============================================================================

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Unique event identifier (from Resend email_id + event type)
    eventId: text("event_id").notNull(),

    // Event type (email.sent, email.opened, etc.)
    eventType: text("event_type").notNull(),

    // Resend email_id for correlation
    emailId: text("email_id").notNull(),

    // Processing status
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Store full payload for debugging/audit
    payload: jsonb("payload").$type<WebhookEventPayload>(),

    // Error details if processing failed
    errorMessage: text("error_message"),

    // Processing result for auditing
    result: jsonb("result").$type<Record<string, unknown>>(),
  },
  (table) => ({
    // Unique constraint on eventId + eventType to prevent duplicates
    // This is the key for idempotency (DI-001)
    uniqueEvent: uniqueIndex("webhook_events_unique_idx").on(
      table.eventId,
      table.eventType
    ),

    // Index for querying by email_id (to see all events for an email)
    emailIdx: index("webhook_events_email_idx").on(table.emailId),

    // Index for recent events query
    processedAtIdx: index("webhook_events_processed_at_idx").on(
      table.processedAt.desc()
    ),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
