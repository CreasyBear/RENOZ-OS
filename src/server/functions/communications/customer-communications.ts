/**
 * Customer Communications Server Functions
 *
 * Fetch communication history for a customer from email_history table.
 * Returns a unified timeline of all customer communications.
 *
 * getCustomerEmailActivities: Fetches emails as UnifiedActivity[] for merging
 * into the customer activity timeline.
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, or, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { emailHistory, users, customers } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError } from '@/lib/server/errors';
import { z } from 'zod';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// SCHEMAS
// ============================================================================

const getCustomerCommunicationsSchema = z.object({
  customerId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// TYPES
// ============================================================================

type CommunicationType = 'email' | 'phone' | 'meeting' | 'portal' | 'note';
type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'replied' | 'failed';

interface Communication {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status?: CommunicationStatus;
  subject: string;
  preview: string;
  content?: string;
  from: {
    name: string;
    email?: string;
  };
  to?: {
    name: string;
    email?: string;
  };
  timestamp: string;
  duration?: number;
  attachments?: number;
  contactId?: string;
  customerId: string;
}

// ============================================================================
// SERVER FUNCTIONS
// ============================================================================

/**
 * Get communication history for a customer.
 * Currently returns email communications from email_history table.
 */
export const getCustomerCommunications = createServerFn({ method: 'GET' })
  .inputValidator(getCustomerCommunicationsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const { customerId, limit, offset } = data;

    // Verify customer belongs to organization
    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.organizationId)))
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    // Fetch email communications for this customer
    const emails = await db
      .select({
        id: emailHistory.id,
        fromAddress: emailHistory.fromAddress,
        toAddress: emailHistory.toAddress,
        subject: emailHistory.subject,
        bodyText: emailHistory.bodyText,
        status: emailHistory.status,
        sentAt: emailHistory.sentAt,
        openedAt: emailHistory.openedAt,
        createdAt: emailHistory.createdAt,
        metadata: emailHistory.metadata,
        senderId: emailHistory.senderId,
      })
      .from(emailHistory)
      .where(
        and(
          eq(emailHistory.organizationId, ctx.organizationId),
          eq(emailHistory.customerId, customerId)
        )
      )
      .orderBy(desc(emailHistory.createdAt))
      .limit(limit)
      .offset(offset);

    // Get sender names for emails with senderId
    const senderIds = [...new Set(emails.filter((e) => e.senderId).map((e) => e.senderId!))];
    const senders =
      senderIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(or(...senderIds.map((id) => eq(users.id, id))))
        : [];

    const senderMap = new Map(senders.map((s) => [s.id, s.name || 'Unknown']));

    // Transform to Communication interface
    const communications: Communication[] = emails.map((email) => {
      // Determine direction based on whether sender is internal user
      const isOutbound = !!email.senderId;
      const metadata = email.metadata as { fromName?: string; attachments?: Array<unknown> } | null;

      // Map email status to communication status
      let commStatus: CommunicationStatus | undefined;
      switch (email.status) {
        case 'sent':
          commStatus = 'sent';
          break;
        case 'delivered':
          commStatus = 'delivered';
          break;
        case 'opened':
        case 'clicked':
          commStatus = 'read';
          break;
        case 'failed':
        case 'bounced':
          commStatus = 'failed';
          break;
        default:
          commStatus = undefined;
      }

      return {
        id: email.id,
        type: 'email' as const,
        direction: isOutbound ? 'outbound' : 'inbound',
        status: commStatus,
        subject: email.subject || '(No subject)',
        preview: email.bodyText?.slice(0, 150) || '',
        from: {
          name: isOutbound
            ? (email.senderId ? senderMap.get(email.senderId) : undefined) ||
              metadata?.fromName ||
              'Unknown'
            : email.fromAddress.split('@')[0],
          email: email.fromAddress,
        },
        to: {
          name: customer.name || email.toAddress.split('@')[0],
          email: email.toAddress,
        },
        timestamp: (email.sentAt || email.createdAt)?.toISOString() || new Date().toISOString(),
        attachments: metadata?.attachments?.length ?? 0,
        customerId,
      };
    });

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(emailHistory)
      .where(
        and(
          eq(emailHistory.organizationId, ctx.organizationId),
          eq(emailHistory.customerId, customerId)
        )
      );

    return {
      communications,
      total: Number(countResult?.count ?? 0),
    };
  });

// ============================================================================
// CUSTOMER EMAIL ACTIVITIES (Unified Timeline)
// ============================================================================

const getCustomerEmailActivitiesSchema = z.object({
  customerId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
});

/**
 * Get customer email history as UnifiedActivity[] for merging into the
 * unified activity timeline (Customer Activity tab).
 */
export const getCustomerEmailActivities = createServerFn({ method: 'GET' })
  .inputValidator(getCustomerEmailActivitiesSchema)
  .handler(async ({ data }): Promise<UnifiedActivity[]> => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });
    const { customerId, limit } = data;

    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, ctx.organizationId)))
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found', 'customer');
    }

    const emails = await db
      .select({
        id: emailHistory.id,
        fromAddress: emailHistory.fromAddress,
        toAddress: emailHistory.toAddress,
        subject: emailHistory.subject,
        bodyText: emailHistory.bodyText,
        status: emailHistory.status,
        sentAt: emailHistory.sentAt,
        createdAt: emailHistory.createdAt,
        senderId: emailHistory.senderId,
      })
      .from(emailHistory)
      .where(
        and(
          eq(emailHistory.organizationId, ctx.organizationId),
          eq(emailHistory.customerId, customerId)
        )
      )
      .orderBy(desc(emailHistory.createdAt))
      .limit(limit);

    const senderIds = [...new Set(emails.filter((e) => e.senderId).map((e) => e.senderId!))];
    const senders =
      senderIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(or(...senderIds.map((id) => eq(users.id, id))))
        : [];
    const senderMap = new Map(senders.map((s) => [s.id, s.name || 'Unknown']));

    return emails.map((email) => {
      const isOutbound = !!email.senderId;
      const fromName = isOutbound
        ? (email.senderId ? senderMap.get(email.senderId) : null) ?? 'Unknown'
        : email.fromAddress.split('@')[0];
      const timestamp = (email.sentAt || email.createdAt)?.toISOString() ?? new Date().toISOString();

      return {
        id: email.id,
        source: 'audit' as const,
        entityType: 'customer',
        entityId: customerId,
        type: 'email',
        action: 'email_sent',
        description: email.subject
          ? `Email: ${email.subject}`
          : `Email to ${email.toAddress}`,
        subject: email.subject || null,
        userId: email.senderId,
        userName: fromName,
        userEmail: email.fromAddress,
        createdAt: timestamp,
        direction: (isOutbound ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
        metadata: {
          recipientEmail: email.toAddress,
          recipientName: customer.name,
          subject: email.subject,
          contentPreview: email.bodyText?.slice(0, 150) ?? undefined,
        },
        isCompleted: true,
        isOverdue: false,
      };
    });
  });
