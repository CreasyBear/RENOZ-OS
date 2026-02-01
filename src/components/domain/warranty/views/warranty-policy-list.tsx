/**
 * Warranty Policy List Component
 *
 * Displays a list of warranty policies with management actions.
 * Used in settings page for policy management.
 *
 * @see src/hooks/use-warranty-policies.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-001c
 */

'use client';

import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { WarrantyPolicy } from 'drizzle/schema';
import {
  Plus,
  Search,
  Shield,
  MoreHorizontal,
  Pencil,
  Trash2,
  Battery,
  Zap,
  Wrench,
  Star,
} from 'lucide-react';

interface WarrantyPolicyListProps {
  /** From route container (useWarrantyPolicies). */
  policies: WarrantyPolicy[];
  /** From route container (useWarrantyPolicies). */
  isLoading?: boolean;
  /** From route container (useWarrantyPolicies). */
  error?: Error | null;
  /** From route container (useWarrantyPolicies). */
  onRetry?: () => void;
  /** From route container (mutations). */
  onDeletePolicy?: (policy: WarrantyPolicy) => void;
  /** From route container (mutations). */
  onSetDefault?: (policy: WarrantyPolicy) => void;
  /** From route container (mutations). */
  onSeedDefaults?: () => void;
  /** From route container (mutations). */
  isSeedingDefaults?: boolean;
  /** From route container (mutations). */
  pendingDefaultPolicyId?: string | null;
  onCreatePolicy?: () => void;
  onEditPolicy?: (policy: WarrantyPolicy) => void;
  showCreateButton?: boolean;
  className?: string;
}

/**
 * Get the display name for a policy type.
 */
function getPolicyTypeName(type: WarrantyPolicy['type']): string {
  switch (type) {
    case 'battery_performance':
      return 'Battery';
    case 'inverter_manufacturer':
      return 'Inverter';
    case 'installation_workmanship':
      return 'Installation';
    default:
      return type;
  }
}

/**
 * Get the icon for a policy type.
 */
function getPolicyTypeIcon(type: WarrantyPolicy['type']) {
  switch (type) {
    case 'battery_performance':
      return Battery;
    case 'inverter_manufacturer':
      return Zap;
    case 'installation_workmanship':
      return Wrench;
    default:
      return Shield;
  }
}

/**
 * Get the badge variant for a policy type.
 */
function getPolicyTypeBadgeVariant(
  type: WarrantyPolicy['type']
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'battery_performance':
      return 'default';
    case 'inverter_manufacturer':
      return 'secondary';
    case 'installation_workmanship':
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * Format duration in months to human-readable string.
 */
function formatDuration(months: number): string {
  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) {
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  return `${years}y ${remainingMonths}m`;
}

export function WarrantyPolicyList({
  policies,
  isLoading,
  error,
  onRetry,
  onDeletePolicy,
  onSetDefault,
  onSeedDefaults,
  isSeedingDefaults: _isSeedingDefaults,
  pendingDefaultPolicyId,
  onCreatePolicy,
  onEditPolicy,
  showCreateButton = true,
  className,
}: WarrantyPolicyListProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter policies by search query
  const filteredPolicies = useMemo(() => {
    if (!policies?.length) return [];
    if (!searchQuery) return policies;

    const query = searchQuery.toLowerCase();
    return policies.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description?.toLowerCase().includes(query) ?? false)
    );
  }, [policies, searchQuery]);

  // Column definitions
  const columns: ColumnDef<WarrantyPolicy>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Policy',
        cell: ({ row }) => {
          const Icon = getPolicyTypeIcon(row.original.type);
          return (
            <div className="flex items-start gap-3">
              <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.original.name}</span>
                  {row.original.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                {row.original.description && (
                  <div className="text-muted-foreground line-clamp-1 text-sm">
                    {row.original.description}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={getPolicyTypeBadgeVariant(row.original.type)}>
            {getPolicyTypeName(row.original.type)}
          </Badge>
        ),
      },
      {
        accessorKey: 'durationMonths',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDuration(row.original.durationMonths)}
          </span>
        ),
      },
      {
        accessorKey: 'cycleLimit',
        header: 'Cycle Limit',
        cell: ({ row }) =>
          row.original.cycleLimit ? (
            <span className="text-muted-foreground">
              {row.original.cycleLimit.toLocaleString()} cycles
            </span>
          ) : (
            <span className="text-muted-foreground/50">N/A</span>
          ),
      },
      {
        accessorKey: 'isDefault',
        header: 'Default',
        cell: ({ row }) => (
          <Switch
            checked={row.original.isDefault}
            disabled={row.original.isDefault || pendingDefaultPolicyId === row.original.id}
            onCheckedChange={() => {
              if (!row.original.isDefault) {
                onSetDefault?.(row.original);
              }
            }}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditPolicy?.(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {!row.original.isDefault && (
                <DropdownMenuItem onClick={() => onSetDefault?.(row.original)}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeletePolicy?.(row.original)}
                className="text-destructive"
                disabled={row.original.isDefault}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEditPolicy, onSetDefault, onDeletePolicy, pendingDefaultPolicyId]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          {showCreateButton && <Skeleton className="h-10 w-32" />}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState
          title="Failed to load warranty policies"
          message={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={() => onRetry?.()}
        />
      </div>
    );
  }

  // Empty state
  if (!policies?.length) {
    return (
      <div className={className}>
        <EmptyState
          icon={Shield}
          title="No warranty policies defined"
          message="Create warranty policies to define coverage terms for batteries, inverters, and installations."
          primaryAction={
            showCreateButton
              ? {
                  label: 'Create Policy',
                  onClick: () => onCreatePolicy?.(),
                  icon: Plus,
                }
              : undefined
          }
          secondaryAction={{
            label: 'Create Default Policies',
            onClick: () => onSeedDefaults?.(),
          }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with search and create button */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {showCreateButton && (
          <Button onClick={onCreatePolicy}>
            <Plus className="mr-2 h-4 w-4" />
            Create Policy
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredPolicies} />
    </div>
  );
}
