/* eslint-disable react-refresh/only-export-components -- Component exports component + helpers */
/**
 * NotificationListItem Component
 *
 * Single notification item in the notification center popover.
 * Type-icon map covers all 14 notification_type values.
 * Memoized for performance.
 *
 * @see docs/design-system/INBOX-NOTIFICATION-STANDARDS.md
 */

import { memo, useCallback } from 'react';
import {
  Bell,
  FileText,
  ShoppingCart,
  AlertTriangle,
  Shield,
  Truck,
  CreditCard,
  User,
  Package,
  Boxes,
  Users,
  Phone,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import type { NotificationItem as NotificationItemType } from '@/lib/schemas/notifications';

// ============================================================================
// TYPE → ICON + COLOR (all 14 notification_type values)
// ============================================================================

interface TypeConfig {
  icon: LucideIcon;
  colorClass: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationItemType['type'],
  TypeConfig
> = {
  quote: { icon: FileText, colorClass: 'text-amber-500' },
  order: { icon: ShoppingCart, colorClass: 'text-emerald-500' },
  issue: { icon: AlertTriangle, colorClass: 'text-rose-500' },
  warranty: { icon: Shield, colorClass: 'text-rose-500' },
  shipment: { icon: Truck, colorClass: 'text-blue-500' },
  payment: { icon: CreditCard, colorClass: 'text-emerald-500' },
  customer: { icon: User, colorClass: 'text-cyan-500' },
  product: { icon: Package, colorClass: 'text-violet-500' },
  inventory: { icon: Boxes, colorClass: 'text-amber-500' },
  user: { icon: Users, colorClass: 'text-slate-500' },
  system: { icon: Bell, colorClass: 'text-slate-500' },
  call_reminder: { icon: Clock, colorClass: 'text-blue-500' },
  call_overdue: { icon: Phone, colorClass: 'text-rose-500' },
};

// ============================================================================
// ACTION URL VALIDATION (same-origin, no XSS/open redirect)
// ============================================================================

/** Map entityType to route path when actionUrl is absent */
const ENTITY_TYPE_TO_PATH: Record<string, string> = {
  order: 'orders',
  customer: 'customers',
  product: 'products',
  opportunity: 'pipeline',
  quote: 'pipeline/quotes',
  issue: 'support/issues',
  invoice: 'financial/invoices',
  job: 'projects',
  job_assignment: 'jobs/assignments',
  supplier: 'suppliers',
  purchase_order: 'purchase-orders',
  inventory_alert: 'inventory/alerts',
};

function getEntityPath(entityType: string, entityId: string): string | null {
  const segment = ENTITY_TYPE_TO_PATH[entityType];
  if (!segment) return null;
  if (segment.includes('/')) return `/${segment}`;
  return `/${segment}/${entityId}`;
}

/**
 * Validates that actionUrl is a safe internal path.
 * Returns the path if valid, null otherwise.
 */
export function validateNotificationActionUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return null;
  if (lower.startsWith('http://') || lower.startsWith('https://')) return null;
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.includes('..')) return null;
  if (trimmed.startsWith('//')) return null;
  return trimmed;
}

// ============================================================================
// PROPS
// ============================================================================

export interface NotificationListItemProps {
  item: NotificationItemType;
  onMarkRead: (id: string) => void;
  /** Called when user clicks an item (e.g. to close popover before navigation) */
  onItemClick?: () => void;
  /** ID of notification currently being marked read (prevents duplicate mutations) */
  markingReadId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

function NotificationListItemInner({
  item,
  onMarkRead,
  onItemClick,
  markingReadId,
}: NotificationListItemProps) {
  const navigate = useNavigate();
  const isUnread = item.readAt == null;
  const config = NOTIFICATION_TYPE_CONFIG[item.type] ?? NOTIFICATION_TYPE_CONFIG.system;
  const Icon = config.icon;

  const previewText =
    typeof item.data?.previewText === 'string'
      ? item.data.previewText
      : item.message ?? item.title;

  const actionUrl =
    typeof item.data?.actionUrl === 'string' ? item.data.actionUrl : undefined;
  const actionPath = validateNotificationActionUrl(actionUrl);
  const entityType =
    typeof item.data?.entityType === 'string' ? item.data.entityType : undefined;
  const entityId =
    typeof item.data?.entityId === 'string' ? item.data.entityId : undefined;
  const entityPath =
    actionPath ?? (entityType && entityId ? getEntityPath(entityType, entityId) : null);

  const handleClick = useCallback(() => {
    onItemClick?.();
    if (isUnread && markingReadId !== item.id) onMarkRead(item.id);
    if (entityPath) {
      navigate({ to: entityPath });
    }
  }, [isUnread, item.id, onMarkRead, onItemClick, markingReadId, entityPath, navigate]);

  const handleLinkClick = useCallback(() => {
    onItemClick?.();
    if (isUnread && markingReadId !== item.id) onMarkRead(item.id);
  }, [isUnread, item.id, onMarkRead, onItemClick, markingReadId]);

  const content = (
    <div className="flex items-start gap-3">
      {isUnread && (
        <div
          className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted'
        )}
      >
        <Icon className={cn('h-4 w-4', config.colorClass)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-sm',
              isUnread && 'font-medium'
            )}
          >
            {item.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {previewText}
        </p>
      </div>
    </div>
  );

  const sharedClasses = cn(
    'flex w-full min-h-[44px] cursor-pointer items-start gap-3 px-4 py-3 text-left',
    'transition-colors duration-200',
    'hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    '[content-visibility:auto]',
    isUnread && 'bg-primary/5'
  );

  if (entityPath) {
    return (
      <Link
        to={entityPath}
        onClick={handleLinkClick}
        className={sharedClasses}
        aria-label={`${item.title} - ${previewText}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={markingReadId === item.id}
      className={sharedClasses}
      aria-label={`${item.title} - ${previewText}`}
    >
      {content}
    </button>
  );
}

export const NotificationListItem = memo(NotificationListItemInner);
