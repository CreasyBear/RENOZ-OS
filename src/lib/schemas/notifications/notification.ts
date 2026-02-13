/**
 * Notification Center Schemas
 *
 * Types and Zod schemas for the notification center (header bell popover).
 * Matches notifications table and NotificationData from drizzle schema.
 * Uses flexibleJsonSchema for ServerFn boundary (SCHEMA-TRACE §4).
 *
 * @see drizzle/schema/_shared/notifications.ts
 * @see docs/design-system/INBOX-NOTIFICATION-STANDARDS.md
 */

import { z } from 'zod';
import { flexibleJsonSchema, type FlexibleJson } from '../_shared/patterns';

// ============================================================================
// ENUMS (must match drizzle notification_type enum)
// ============================================================================

export const notificationTypeValues = [
  'quote',
  'order',
  'issue',
  'warranty',
  'shipment',
  'payment',
  'customer',
  'product',
  'inventory',
  'user',
  'system',
  'call_reminder',
  'call_overdue',
] as const;

export const notificationStatusValues = [
  'pending',
  'sent',
  'read',
  'dismissed',
  'failed',
] as const;

export const notificationTypeSchema = z.enum(notificationTypeValues);
export const notificationStatusSchema = z.enum(notificationStatusValues);

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

// ============================================================================
// DATA (JSONB from notifications.data)
// ============================================================================

/** Flexible JSON for ServerFn boundary. Known fields: entityId, entityType, actionUrl, previewText, entityName */
export const notificationDataSchema = flexibleJsonSchema;
export type NotificationData = FlexibleJson;

// ============================================================================
// NOTIFICATION ITEM (for list display)
// ============================================================================

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  data: NotificationData | null;
  createdAt: Date;
  readAt: Date | null;
}

// ============================================================================
// LIST REQUEST / RESPONSE
// ============================================================================

export const listNotificationsInputSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsInputSchema>;

export interface ListNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
}

// ============================================================================
// MARK READ
// ============================================================================

export const markNotificationReadInputSchema = z.object({
  id: z.string().uuid(),
});

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadInputSchema>;
