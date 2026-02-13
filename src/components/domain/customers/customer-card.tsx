/**
 * CustomerCard Component
 *
 * Mobile-optimized card view for customer list.
 * Displays key customer information in a compact, scannable format.
 */
import { Building2, User, Mail, Phone, MoreHorizontal, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormatAmount } from '@/components/shared/format'
import type { CustomerTableData } from './customer-table'

// ============================================================================
// TYPES
// ============================================================================

interface CustomerCardProps {
  customer: CustomerTableData
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onEdit?: (customer: CustomerTableData) => void
  onDelete?: (customer: CustomerTableData) => void
  onClick?: (customer: CustomerTableData) => void
}

// ============================================================================
// HELPERS
// ============================================================================

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  prospect: { label: 'Prospect', variant: 'secondary' },
  active: { label: 'Active', variant: 'default', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  inactive: { label: 'Inactive', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  blacklisted: { label: 'Blacklisted', variant: 'destructive' },
}

const typeConfig: Record<string, { label: string; icon: typeof Building2 }> = {
  individual: { label: 'Individual', icon: User },
  business: { label: 'Business', icon: Building2 },
  government: { label: 'Gov', icon: Building2 },
  non_profit: { label: 'Non-Profit', icon: Building2 },
}

import { getHealthScoreSemanticColor } from './customer-status-config';
import { capitalizeFirst } from '@/lib/customer-utils';

function getHealthScoreColor(score: number | null): string {
  const semanticColor = getHealthScoreSemanticColor(score);
  // Map semantic colors to dot colors (using more saturated variants)
  const dotColorMap: Record<typeof semanticColor, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    pending: 'bg-orange-500',
    error: 'bg-red-500',
    neutral: 'bg-gray-400',
    info: 'bg-blue-500',
    progress: 'bg-violet-500',
    inactive: 'bg-slate-400',
    draft: 'bg-slate-300',
  };
  return dotColorMap[semanticColor] ?? 'bg-gray-400';
}

function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString()
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomerCard({
  customer,
  isSelected = false,
  onEdit,
  onDelete,
  onClick,
}: CustomerCardProps) {
  const status = statusConfig[customer.status] || statusConfig.prospect
  const type = typeConfig[customer.type] || typeConfig.business
  const TypeIcon = type.icon

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'border-primary bg-primary/5'
      )}
      onClick={() => onClick?.(customer)}
    >
      <CardContent className="p-4">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{customer.name}</h3>
            {customer.customerCode && (
              <p className="text-xs text-muted-foreground">{customer.customerCode}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={status.variant} className={cn('text-xs', status.className)}>
              {status.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onClick?.(customer)}>
                  View Details
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(customer)}>
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(customer)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Type & Health Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TypeIcon className="h-3.5 w-3.5" />
            <span className="text-xs">{type.label}</span>
          </div>
          {customer.healthScore !== null && (
            <div className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', getHealthScoreColor(customer.healthScore))} />
              <span className="text-xs font-medium">{customer.healthScore}</span>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mb-3">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{customer.phone}</span>
            </a>
          )}
        </div>

        {/* Last Activity */}
        {customer.lastActivityAt && (
          <div className="flex items-center gap-1.5 mb-3 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatRelativeTime(customer.lastActivityAt)}
            </span>
            {customer.lastActivityType && (
              <span className="text-xs text-muted-foreground">
                · {customer.lastActivityType}
              </span>
            )}
          </div>
        )}

        {/* Footer: LTV + Owner */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Lifetime Value</p>
            <p className="text-sm font-medium">
              <FormatAmount
                amount={typeof customer.lifetimeValue === 'string'
                  ? parseFloat(customer.lifetimeValue)
                  : customer.lifetimeValue}
                cents={false}
                showCents={false}
              />
            </p>
          </div>
          {customer.owner && (
            <div className="flex items-center gap-2">
              {customer.owner.avatar ? (
                <img
                  src={customer.owner.avatar}
                  alt={customer.owner.name}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {capitalizeFirst(customer.owner.name.charAt(0))}
                </div>
              )}
              <span className="text-xs text-muted-foreground">{customer.owner.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SKELETON
// ============================================================================

export function CustomerCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <div className="h-5 w-3/4 bg-muted rounded mb-1" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
          <div className="h-6 w-16 bg-muted rounded" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-8 bg-muted rounded" />
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            <div className="h-3 w-16 bg-muted rounded mb-1" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
          <div className="h-6 w-24 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
