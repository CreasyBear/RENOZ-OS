/**
 * Issue Template List Component
 *
 * Displays a list of issue templates with management actions.
 * Used in settings page for template management.
 *
 * @see src/hooks/use-issue-templates.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';
import type { IssueTemplateResponse, IssueType } from '@/lib/schemas/support/issue-templates';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  BarChart3,
} from 'lucide-react';

interface IssueTemplateListProps {
  /** From route container (useIssueTemplates). */
  templates: IssueTemplateResponse[];
  /** From route container (useIssueTemplates). */
  totalCount: number;
  /** From route container (useIssueTemplates). */
  isLoading?: boolean;
  /** From route container (useIssueTemplates). */
  error?: Error | null;
  /** From route container (useIssueTemplates). */
  onRetry?: () => void;
  /** From route container (filter state). */
  typeFilter: IssueType | 'all';
  /** From route container (filter state). */
  searchQuery: string;
  /** From route container (pagination state). */
  page: number;
  /** From route container (filter handler). */
  onTypeFilterChange: (value: IssueType | 'all') => void;
  /** From route container (filter handler). */
  onSearchChange: (value: string) => void;
  /** From route container (pagination handler). */
  onPageChange: (page: number) => void;
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: IssueTemplateResponse) => void;
  onDuplicateTemplate?: (template: IssueTemplateResponse) => void;
  onDeleteTemplate?: (template: IssueTemplateResponse) => void;
  showCreateButton?: boolean;
  className?: string;
}

// Issue type labels
const TYPE_LABELS: Record<IssueType, string> = {
  hardware_fault: 'Hardware Fault',
  software_firmware: 'Software/Firmware',
  installation_defect: 'Installation Defect',
  performance_degradation: 'Performance',
  connectivity: 'Connectivity',
  other: 'Other',
};

// Type filter options
const TYPE_OPTIONS: { value: IssueType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'hardware_fault', label: 'Hardware Fault' },
  { value: 'software_firmware', label: 'Software/Firmware' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'performance_degradation', label: 'Performance' },
  { value: 'connectivity', label: 'Connectivity' },
  { value: 'other', label: 'Other' },
];

export function IssueTemplateList({
  templates,
  totalCount,
  isLoading,
  error,
  onRetry,
  typeFilter,
  searchQuery,
  page,
  onTypeFilterChange,
  onSearchChange,
  onPageChange,
  onCreateTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  showCreateButton = true,
  className,
}: IssueTemplateListProps) {
  // Column definitions
  const columns: ColumnDef<IssueTemplateResponse>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Template',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.description && (
              <div className="text-muted-foreground line-clamp-1 text-sm">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type]}</Badge>,
      },
      {
        accessorKey: 'usageCount',
        header: 'Usage',
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>{row.original.usageCount}</span>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.original.createdAt), {
              addSuffix: true,
            })}
          </span>
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
              <DropdownMenuItem onClick={() => onEditTemplate?.(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicateTemplate?.(row.original)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteTemplate?.(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEditTemplate, onDuplicateTemplate, onDeleteTemplate]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState text="Loading templates..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState title="Failed to load templates" message={error.message} onRetry={onRetry} />
    );
  }

  return (
    <div className={className}>
      {/* Header with filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type filter */}
        <Select
          value={typeFilter}
          onValueChange={(value) => onTypeFilterChange(value as IssueType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Create button */}
        {showCreateButton && onCreateTemplate && (
          <Button onClick={onCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      {/* Empty state */}
      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates found"
          message={
            searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first template to speed up issue creation'
          }
          primaryAction={
            showCreateButton && onCreateTemplate
              ? {
                  label: 'Create Template',
                  onClick: onCreateTemplate,
                }
              : undefined
          }
        />
      ) : (
        <DataTable
          data={templates}
          columns={columns}
          onRowClick={onEditTemplate}
          pagination={{
            pageSize: 10,
            pageIndex: page - 1,
          }}
          enableSorting
        />
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
          <span>
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, totalCount)} of {totalCount}{' '}
            templates
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 10 >= totalCount}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
