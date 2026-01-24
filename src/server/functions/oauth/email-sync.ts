/**
 * Email Sync Server Functions
 *
 * Server functions for email synchronization, processing, and communication logging.
 * Implements the complete email sync workflow following midday's patterns.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { oauthConnections, oauthSyncLogs, oauthEmailMessages } from 'drizzle/schema/oauth';
import { decryptOAuthToken } from '@/lib/oauth/token-encryption';
import {
  createEmailProvider,
  type EmailMessage,
  type EmailSearchOptions,
} from '@/lib/oauth/email-client';
import { filterEmails, type EmailFilterOptions } from '@/lib/oauth/email-processing';

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const SyncEmailsRequestSchema = z.object({
  connectionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  fullSync: z.boolean().optional(),
  maxMessages: z.number().min(1).max(500).default(100),
  filters: z
    .object({
      query: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      subject: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      isRead: z.boolean().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
});

export const SendEmailRequestSchema = z.object({
  connectionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  to: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })
  ),
  cc: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .optional(),
  bcc: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .optional(),
  subject: z.string().min(1).max(200),
  body: z.object({
    text: z.string().optional(),
    html: z.string().optional(),
  }),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        data: z.string(), // base64 encoded
      })
    )
    .optional(),
  replyToMessageId: z.string().optional(),
  threadId: z.string().optional(),
});

export const EmailSyncResultSchema = z.object({
  success: z.boolean(),
  messagesProcessed: z.number(),
  messagesCreated: z.number(),
  messagesUpdated: z.number(),
  messagesFiltered: z.number(),
  threadsCreated: z.number(),
  attachmentsProcessed: z.number(),
  communicationLogsCreated: z.number(),
  errors: z.array(z.string()),
  duration: z.number(),
});

// ============================================================================
// EMAIL SYNC OPERATIONS
// ============================================================================

export interface SyncEmailsRequest {
  connectionId: string;
  organizationId: string;
  fullSync?: boolean;
  maxMessages?: number;
  filters?: Partial<EmailSearchOptions>;
}

export interface SyncEmailsResponseSuccess {
  success: true;
  result: {
    messagesProcessed: number;
    messagesCreated: number;
    messagesUpdated: number;
    messagesFiltered: number;
    threadsCreated: number;
    attachmentsProcessed: number;
    communicationLogsCreated: number;
    errors: string[];
    duration: number;
  };
}

export interface SyncEmailsResponseError {
  success: false;
  error: string;
}

export type SyncEmailsResponse = SyncEmailsResponseSuccess | SyncEmailsResponseError;

/**
 * Sync emails for a specific OAuth connection.
 * Implements the complete email sync workflow with filtering, threading, and logging.
 */
export async function syncEmails(
  db: PostgresJsDatabase<any>,
  request: SyncEmailsRequest
): Promise<SyncEmailsResponse> {
  const startTime = Date.now();

  try {
    // Get connection details
    const [connection] = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        accessToken: oauthConnections.accessToken,
        refreshToken: oauthConnections.refreshToken,
        isActive: oauthConnections.isActive,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId),
          eq(oauthConnections.serviceType, 'email')
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'Email connection not found or does not include email service',
      };
    }

    if (!connection.isActive) {
      return {
        success: false,
        error: 'Connection is not active',
      };
    }

    // Decrypt tokens
    let accessToken: string;
    try {
      accessToken = decryptOAuthToken(connection.accessToken, connection.organizationId);
    } catch {
      return {
        success: false,
        error: 'Failed to decrypt access token',
      };
    }

    // Create email provider
    const emailProvider = createEmailProvider(
      connection.provider as 'google_workspace' | 'microsoft_365'
    );

    // Build search options
    const searchOptions: EmailSearchOptions = {
      limit: request.maxMessages || 100,
      ...request.filters,
    };

    // If not full sync, get recent messages only
    if (!request.fullSync) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      searchOptions.dateFrom = searchOptions.dateFrom || oneWeekAgo;
    }

    // Fetch messages from provider
    const { messages: rawMessages, totalCount } = await emailProvider.listMessages(
      {
        accessToken,
        refreshToken: connection.refreshToken
          ? decryptOAuthToken(connection.refreshToken, connection.organizationId)
          : undefined,
      },
      searchOptions
    );

    let messagesProcessed = 0;
    let messagesCreated = 0;
    let messagesUpdated = 0;
    let messagesFiltered = 0;
    let threadsCreated = 0;
    let attachmentsProcessed = 0;
    let communicationLogsCreated = 0;
    const errors: string[] = [];

    try {
      // Apply email filtering
      const filterOptions: EmailFilterOptions = {
        enableSpamFilter: true,
        spamKeywords: ['viagra', 'casino', 'lottery', 'winner'],
        maxAttachmentSize: 10 * 1024 * 1024, // 10MB
        domainBlacklist: ['spam.example.com'], // Would be configurable
      };

      const filteredResults = filterEmails(rawMessages, filterOptions);
      const allowedMessages = filteredResults
        .filter((result) => result.isAllowed)
        .map((result) => result.message);

      messagesFiltered = rawMessages.length - allowedMessages.length;

      // Process individual messages (stored as raw email records)
      for (const message of allowedMessages) {
        try {
          // Check if message already exists
          const existingMessage = await findExistingEmailMessage(db, message.id, connection.id);

          if (!existingMessage) {
            await storeEmailMessage(db, connection, message);
            messagesCreated++;
          } else {
            const needsUpdate = checkMessageNeedsUpdate(existingMessage, message);
            if (needsUpdate) {
              await updateEmailMessage(db, connection, message);
              messagesUpdated++;
            }
          }

          messagesProcessed++;
        } catch (messageError) {
          errors.push(
            `Failed to process message ${message.id}: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`
          );
        }
      }
    } catch (processingError) {
      errors.push(
        `Email processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
      );
    }

    // Update connection sync status
    await db
      .update(oauthConnections)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, request.connectionId));

    // Log sync completion
    await db.insert(oauthSyncLogs).values({
      organizationId: connection.organizationId,
      connectionId: request.connectionId,
      serviceType: 'email',
      operation: 'sync',
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      recordCount: messagesProcessed,
      metadata: {
        messagesCreated,
        messagesUpdated,
        messagesFiltered,
        threadsCreated,
        attachmentsProcessed,
        communicationLogsCreated,
        totalMessagesFound: totalCount,
        duration: Date.now() - startTime,
        filters: request.filters,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return {
      success: true,
      result: {
        messagesProcessed,
        messagesCreated,
        messagesUpdated,
        messagesFiltered,
        threadsCreated,
        attachmentsProcessed,
        communicationLogsCreated,
        errors,
        duration: Date.now() - startTime,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log sync failure
    try {
      await db.insert(oauthSyncLogs).values({
        organizationId: request.organizationId,
        connectionId: request.connectionId,
        serviceType: 'email',
        operation: 'sync',
        status: 'failed',
        errorMessage,
        metadata: {
          duration: Date.now() - startTime,
        },
      startedAt: new Date(),
      completedAt: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log email sync failure:', logError);
    }

    return {
      success: false,
      error: `Email sync failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

export interface SendEmailRequest {
  connectionId: string;
  organizationId: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  body: { text?: string; html?: string };
  attachments?: Array<{ filename: string; mimeType: string; data: string }>;
  replyToMessageId?: string;
  threadId?: string;
}

export interface SendEmailResponseSuccess {
  success: true;
  result: {
    messageId: string;
    threadId: string;
    sentAt: Date;
  };
}

export interface SendEmailResponseError {
  success: false;
  error: string;
}

export type SendEmailResponse = SendEmailResponseSuccess | SendEmailResponseError;

/**
 * Send an email using the OAuth connection.
 */
export async function sendEmail(
  db: PostgresJsDatabase<any>,
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  try {
    // Get connection details
    const [connection] = await db
      .select({
        id: oauthConnections.id,
        organizationId: oauthConnections.organizationId,
        provider: oauthConnections.provider,
        accessToken: oauthConnections.accessToken,
        refreshToken: oauthConnections.refreshToken,
        isActive: oauthConnections.isActive,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.id, request.connectionId),
          eq(oauthConnections.organizationId, request.organizationId),
          eq(oauthConnections.serviceType, 'email')
        )
      )
      .limit(1);

    if (!connection) {
      return {
        success: false,
        error: 'Email connection not found or does not include email service',
      };
    }

    if (!connection.isActive) {
      return {
        success: false,
        error: 'Connection is not active',
      };
    }

    // Decrypt tokens
    const accessToken = decryptOAuthToken(connection.accessToken, connection.organizationId);
    const refreshToken = connection.refreshToken
      ? decryptOAuthToken(connection.refreshToken, connection.organizationId)
      : undefined;

    // Create email provider
    const emailProvider = createEmailProvider(
      connection.provider as 'google_workspace' | 'microsoft_365'
    );

    // Prepare attachments
    const emailAttachments = request.attachments?.map((att) => ({
      filename: att.filename,
      mimeType: att.mimeType,
      data: Buffer.from(att.data, 'base64'),
    }));

    // Send email
    const sendResult = await emailProvider.sendMessage(
      { accessToken, refreshToken },
      {
        to: request.to.map((addr) => ({ email: addr.email, displayName: addr.name })),
        cc: request.cc?.map((addr) => ({ email: addr.email, displayName: addr.name })),
        bcc: request.bcc?.map((addr) => ({ email: addr.email, displayName: addr.name })),
        subject: request.subject,
        body: request.body,
        attachments: emailAttachments,
        replyToMessageId: request.replyToMessageId,
        threadId: request.threadId,
      }
    );

    // Create communication log entry
    await storeSentEmail(db, {
      organizationId: request.organizationId,
      connectionId: request.connectionId,
      messageId: sendResult.messageId,
      threadId: sendResult.threadId,
      subject: request.subject,
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      body: request.body,
      attachments: request.attachments,
    });

    // Log email send
    await db.insert(oauthSyncLogs).values({
      organizationId: request.organizationId,
      connectionId: request.connectionId,
      serviceType: 'email',
      operation: 'email_send',
      status: 'completed',
      recordCount: 1,
      metadata: {
        connectionId: request.connectionId,
        messageId: sendResult.messageId,
        threadId: sendResult.threadId,
        toCount: request.to.length,
        ccCount: request.cc?.length || 0,
        bccCount: request.bcc?.length || 0,
        attachmentCount: request.attachments?.length || 0,
      },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return {
      success: true,
      result: {
        messageId: sendResult.messageId,
        threadId: sendResult.threadId,
        sentAt: new Date(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log send failure
    try {
      await db.insert(oauthSyncLogs).values({
        organizationId: request.organizationId,
        connectionId: request.connectionId,
        serviceType: 'email',
        operation: 'email_send',
        status: 'failed',
        errorMessage,
        metadata: {
          connectionId: request.connectionId,
          toCount: request.to.length,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } catch (logError) {
      console.error('Failed to log email send failure:', logError);
    }

    return {
      success: false,
      error: `Email send failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

function serializeEmailMessage(message: EmailMessage): Record<string, any> {
  return {
    ...message,
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      contentId: attachment.contentId,
      isInline: attachment.isInline,
      url: attachment.url,
    })),
    body: message.body,
    sentAt: message.sentAt.toISOString(),
    receivedAt: message.receivedAt.toISOString(),
  };
}

async function findExistingEmailMessage(
  db: PostgresJsDatabase<any>,
  externalId: string,
  connectionId: string
): Promise<{ id: string; receivedAt: Date | null } | null> {
  const [existing] = await db
    .select({
      id: oauthEmailMessages.id,
      receivedAt: oauthEmailMessages.receivedAt,
    })
    .from(oauthEmailMessages)
    .where(and(eq(oauthEmailMessages.connectionId, connectionId), eq(oauthEmailMessages.externalId, externalId)))
    .limit(1);

  return existing || null;
}

async function storeEmailMessage(
  db: PostgresJsDatabase<any>,
  connection: any,
  message: EmailMessage
): Promise<void> {
  await db.insert(oauthEmailMessages).values({
    organizationId: connection.organizationId,
    connectionId: connection.id,
    externalId: message.id,
    threadId: message.threadId,
    subject: message.subject,
    from: message.from,
    to: message.to,
    receivedAt: message.receivedAt,
    raw: serializeEmailMessage(message),
  });
}

async function updateEmailMessage(
  db: PostgresJsDatabase<any>,
  connection: any,
  message: EmailMessage
): Promise<void> {
  await db
    .update(oauthEmailMessages)
    .set({
      subject: message.subject,
      from: message.from,
      to: message.to,
      receivedAt: message.receivedAt,
      raw: serializeEmailMessage(message),
      updatedAt: new Date(),
    })
    .where(and(eq(oauthEmailMessages.connectionId, connection.id), eq(oauthEmailMessages.externalId, message.id)));
}

function checkMessageNeedsUpdate(
  existing: { receivedAt: Date | null },
  incoming: EmailMessage
): boolean {
  if (!existing.receivedAt) return true;
  return new Date(existing.receivedAt).getTime() !== incoming.receivedAt.getTime();
}

async function storeSentEmail(
  db: PostgresJsDatabase<any>,
  params: {
    organizationId: string;
    connectionId: string;
    messageId: string;
    threadId: string;
    subject: string;
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    body: { text?: string; html?: string };
    attachments?: Array<{ filename: string; mimeType: string; data: string }>;
  }
): Promise<void> {
  await db.insert(oauthEmailMessages).values({
    organizationId: params.organizationId,
    connectionId: params.connectionId,
    externalId: params.messageId,
    threadId: params.threadId,
    subject: params.subject,
    from: { email: 'connected-account' },
    to: params.to,
    receivedAt: new Date(),
    raw: {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      body: params.body,
      attachments: params.attachments?.map((attachment) => ({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: Buffer.byteLength(attachment.data, 'base64'),
      })),
      sentAt: new Date().toISOString(),
    },
  });
}
