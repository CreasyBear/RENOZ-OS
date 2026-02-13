/**
 * Scheduled Inbox Email Sync Job (Trigger.dev v3)
 *
 * Scheduled task that runs periodically to sync emails from all connected email accounts.
 * Runs every 15 minutes to check for new emails.
 *
 * @see src/trigger/jobs/sync-inbox-emails.ts - Main sync task
 */

"use server";

import { schedules, logger } from "@trigger.dev/sdk/v3";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthConnections } from "drizzle/schema/oauth";
import { syncInboxEmailsTask } from "./sync-inbox-emails";

// ============================================================================
// SCHEDULED TASK
// ============================================================================

/**
 * Scheduled task that runs every 15 minutes to sync emails from all active connections.
 */
export const syncInboxEmailsScheduled = schedules.task({
  id: "sync-inbox-emails-scheduled",
  cron: "*/15 * * * *",
  run: async () => {
    logger.info("Starting scheduled inbox email sync");

    try {
      // Get all active email connections
      const connections = await db
        .select({
          id: oauthConnections.id,
          organizationId: oauthConnections.organizationId,
        })
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.serviceType, "email"),
            eq(oauthConnections.isActive, true)
          )
        );

      logger.info("Found active email connections", { count: connections.length });

      // Filter out connections that were synced recently (within last 10 minutes)
      // This prevents unnecessary syncs and reduces load
      // Individual sync task handles lastSyncedAt check with locking
      const connectionsToSync = connections;

      // Trigger sync task for each connection
      // Use Promise.allSettled to handle individual failures gracefully
      // Each sync task handles its own locking and concurrency checks
      const syncPromises = connectionsToSync.map((connection) =>
        syncInboxEmailsTask.trigger({
          connectionId: connection.id,
          organizationId: connection.organizationId,
          manualSync: false,
          maxEmails: 50, // Limit to 50 emails per sync to avoid rate limits
        })
      );

      const results = await Promise.allSettled(syncPromises);
      
      // Log summary
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      
      logger.info("Scheduled sync results", {
        total: connectionsToSync.length,
        successful,
        failed,
      });

      logger.info("Completed scheduled inbox email sync", {
        connectionsProcessed: connections.length,
      });
    } catch (error) {
      logger.error("Scheduled inbox email sync failed", { error });
      throw error;
    }
  },
});
