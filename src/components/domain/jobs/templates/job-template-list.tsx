/**
 * Job Template List Component
 *
 * Displays a list of job templates with management actions.
 * Used in settings page for template management.
 *
 * @see src/hooks/use-job-templates.ts
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-007c
 */

'use client';

import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useJobTemplates, useDeleteJobTemplate } from '@/hooks';
import { useConfirmation } from '@/hooks';
import type { JobTemplateResponse } from '@/lib/schemas';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ListTodo,
  ClipboardCheck,
  Clock,
} from 'lucide-react';

interface JobTemplateListProps {
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: JobTemplateResponse) => void;
  onDuplicateTemplate?: (template: JobTemplateResponse) => void;
  showCreateButton?: boolean;
  className?: string;
}

/**
 * Format duration in minutes to human-readable string.
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 8) {
    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 8);
  return days === 1 ? '1 day' : `${days} days`;
}

export function JobTemplateList({
  onCreateTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  showCreateButton = true,
  className,
}: JobTemplateListProps) {
  const confirm = useConfirmation();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Delete mutation
  const deleteMutation = useDeleteJobTemplate();

  // Fetch templates
  const { data, isLoading, error, refetch } = useJobTemplates({ includeInactive: false });

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];
    if (!searchQuery) return data.templates;

    const query = searchQuery.toLowerCase();
    return data.templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description?.toLowerCase().includes(query) ?? false)
    );
  }, [data?.templates, searchQuery]);

  // Handle delete
  const handleDelete = async (template: JobTemplateResponse) => {
    const confirmed = await confirm.confirm({
      title: 'Delete Job Template',
      description:
        'Are you sure you want to delete this job template? This action cannot be undone.',
      confirmLabel: 'Delete Template',
      variant: 'destructive',
    });

    if (confirmed.confirmed) {
      try {
        await deleteMutation.mutateAsync({ templateId: template.id });
      } catch (err) {
        // Error toast is handled by the mutation hook
      }
    }
  };

  // Column definitions
  const columns: ColumnDef<JobTemplateResponse>[] = useMemo(
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
        accessorKey: 'defaultTasks',
        header: 'Tasks',
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            <span>{row.original.defaultTasks.length}</span>
          </div>
        ),
      },
      {
        accessorKey: 'checklistTemplateId',
        header: 'Checklist',
        cell: ({ row }) =>
          row.original.checklistTemplateId ? (
            <div className="flex items-center gap-1">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm">{row.original.checklistTemplateName ?? 'Attached'}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">None</span>
          ),
      },
      {
        accessorKey: 'estimatedDuration',
        header: 'Duration',
        cell: ({ row }) => (
          <div className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(row.original.estimatedDuration)}</span>
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
                onClick={() => handleDelete(row.original)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEditTemplate, onDuplicateTemplate]
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
          {[...Array(5)].map((_, i) => (
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
          title="Failed to load templates"
          message={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Empty state
  if (!data?.templates.length) {
    return (
      <div className={className}>
        <EmptyState
          icon={FileText}
          title="No job templates"
          message="Create your first template to speed up job creation."
          primaryAction={
            showCreateButton
              ? {
                  label: 'Create Template',
                  onClick: () => onCreateTemplate?.(),
                  icon: Plus,
                }
              : undefined
          }
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
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {showCreateButton && (
          <Button onClick={onCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filteredTemplates} />
    </div>
  );
}
