/**
 * Notifications Zod Schemas
 *
 * Validation schemas for notification operations.
 */

import { z } from "zod";
import {
  idParamSchema,
  cursorPaginationSchema,
  timestampFieldsSchema,
} from "./patterns";

// ============================================================================
// ENUMS
// ============================================================================

export const notificationStatusValues = [
  "pending",
  "sent",
  "read",
  "dismissed",
  "failed",
] as const;

export const notificationTypeValues = [
  "quote",
  "order",
  "issue",
  "warranty",
  "shipment",
  "payment",
  "customer",
  "product",
  "inventory",
  "user",
  "system",
] as const;

export const NotificationStatusSchema = z.enum(notificationStatusValues);
export const NotificationTypeSchema = z.enum(notificationTypeValues);

export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// ============================================================================
// DATA SCHEMAS
// ============================================================================

export const NotificationDataSchema = z
  .object({
    entityId: z.string().uuid().optional(),
    entityType: z.string().optional(),
    actionUrl: z.string().url().optional(),
  })
  .passthrough(); // Allow additional properties

// ============================================================================
// CREATE/UPDATE SCHEMAS
// ============================================================================

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  type: NotificationTypeSchema,
  title: z.string().min(1, "Title is required").max(255),
  message: z.string().min(1, "Message is required").max(2000),
  data: NotificationDataSchema.optional(),
});

export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

export const UpdateNotificationStatusSchema = z.object({
  status: NotificationStatusSchema,
});

export type UpdateNotificationStatus = z.infer<
  typeof UpdateNotificationStatusSchema
>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const NotificationSchema = CreateNotificationSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: NotificationStatusSchema,
  sentAt: z.coerce.date().nullable(),
  readAt: z.coerce.date().nullable(),
  dismissedAt: z.coerce.date().nullable(),
  failureReason: z.string().nullable(),
  ...timestampFieldsSchema.shape,
});

export type Notification = z.infer<typeof NotificationSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const NotificationFilterSchema = z.object({
  status: NotificationStatusSchema.optional(),
  type: NotificationTypeSchema.optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export const NotificationListQuerySchema = cursorPaginationSchema.merge(
  NotificationFilterSchema
);

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

// ============================================================================
// PARAMS SCHEMAS
// ============================================================================

export const NotificationParamsSchema = idParamSchema;
export type NotificationParams = z.infer<typeof NotificationParamsSchema>;

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const MarkNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type MarkNotificationsRead = z.infer<typeof MarkNotificationsReadSchema>;
