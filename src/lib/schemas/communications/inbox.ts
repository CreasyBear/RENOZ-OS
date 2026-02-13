/**
 * Inbox Zod Schemas
 *
 * Validation schemas for unified inbox operations.
 * Combines email history and scheduled emails into a unified inbox view.
 *
 * @see SCHEMA-TRACE.md - Types defined here, not inline in components
 */

import { z } from 'zod';
import { filterSchema } from '../_shared/patterns';
import { EmailStatusSchema } from './email-history';

// ============================================================================
// ENUMS
// ============================================================================

export const inboxTabValues = ['all', 'unread', 'sent', 'scheduled', 'failed'] as const;
export const InboxTabSchema = z.enum(inboxTabValues);
export type InboxTab = z.infer<typeof InboxTabSchema>;

export const inboxEmailTypeValues = ['history', 'scheduled', 'campaign'] as const;
export const InboxEmailTypeSchema = z.enum(inboxEmailTypeValues);
export type InboxEmailType = z.infer<typeof InboxEmailTypeSchema>;

// ============================================================================
// INBOX FILTER SCHEMA (extends base filterSchema)
// ============================================================================

/**
 * Inbox filter schema - extends base filterSchema with inbox-specific filters
 * Separated from query schema per SCHEMA-TRACE.md separation of concerns
 */
export const inboxFilterSchema = filterSchema.extend({
  tab: InboxTabSchema.default('all'),
  status: EmailStatusSchema.optional(),
  type: z.array(InboxEmailTypeSchema).optional(),
  customerId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
});

export type InboxFilter = z.infer<typeof inboxFilterSchema>;

// ============================================================================
// INBOX QUERY SCHEMA (merges filter + pagination)
// ============================================================================

/**
 * Inbox list query schema - combines filter + pagination
 * Uses inboxFilterSchema (which includes dateFrom/dateTo from base filterSchema)
 */
export const inboxListQuerySchema = inboxFilterSchema.extend({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type InboxListQuery = z.infer<typeof inboxListQuerySchema>;

// ============================================================================
// INBOX EMAIL ITEM TYPE
// ============================================================================

/**
 * Unified inbox email item - transformed from email history or scheduled emails
 * Used in inbox list component
 */
export interface InboxEmailItem {
  id: string;
  type: InboxEmailType;
  subject: string;
  preview: string; // First 100 chars of body
  bodyHtml?: string | null; // Full HTML body (for detail view)
  bodyText?: string | null; // Full text body (fallback)
  from: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  to: {
    name: string;
    email: string;
  };
  status: string;
  read: boolean;
  starred?: boolean;
  sentAt: Date | null;
  createdAt: Date;
  customerId?: string | null;
  campaignId?: string | null;
  templateId?: string | null;
  metadata?: {
    source?: string;
    provider?: string;
    fromName?: string;
    [key: string]: unknown;
  } | null;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for InboxList presenter component
 * All data is passed from the container.
 */
export interface InboxListProps {
  items: InboxEmailItem[];
  isLoading?: boolean;
  error?: unknown;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * Props for InboxDetail presenter component
 */
export interface InboxDetailProps {
  email: InboxEmailItem | null;
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onStar?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (id: string) => void;
  onForward?: (id: string) => void;
  // Navigation
  currentIndex?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  className?: string;
}

/**
 * Props for InboxFilterPopover component
 */
export interface InboxFilterPopoverProps {
  filters: InboxFilter;
  availableCustomers?: string[];
  availableCampaigns?: string[];
  onChange: (filters: InboxFilter) => void;
}

/**
 * Props for InboxPage container component
 * All props come from route search params, so this is just for documentation
 */
export type InboxPageProps = Record<string, never>;
