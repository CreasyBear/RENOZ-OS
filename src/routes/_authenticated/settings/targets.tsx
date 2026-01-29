/**
 * Targets Settings Route
 *
 * ARCHITECTURE: Container Component - Manages KPI targets with full CRUD.
 *
 * Features:
 * - List all targets with filtering
 * - Create/edit targets via slide-out form
 * - Delete targets with confirmation
 * - Bulk operations (delete selected)
 * - Progress visualization
 *
 * @see DASH-TARGETS-UI acceptance criteria
 * @see src/hooks/reports/use-targets.ts
 */

import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash2, Target, Filter, Calendar, Loader2 } from 'lucide-react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TargetForm } from '@/components/domain/settings/target-form';
import { TargetProgressWidget } from '@/components/domain/dashboard/target-progress';
import {
  useTargets,
  useTargetProgress,
  useCreateTarget,
  useUpdateTarget,
  useDeleteTarget,
  useBulkDeleteTargets,
} from '@/hooks/reports';
import type {
  Target as TargetType,
  TargetMetric,
  TargetPeriod,
  CreateTargetInput,
} from '@/lib/schemas/reports/targets';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/settings/targets')({
  component: TargetsSettingsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

// ============================================================================
// CONSTANTS
// ============================================================================

const METRIC_LABELS: Record<TargetMetric, string> = {
  revenue: 'Revenue',
  kwh_deployed: 'kWh Deployed',
  quote_win_rate: 'Quote Win Rate',
  active_installations: 'Active Installations',
  warranty_claims: 'Warranty Claims',
  pipeline_value: 'Pipeline Value',
  customer_count: 'Customer Count',
  orders_count: 'Orders Count',
  average_order_value: 'Average Order Value',
};

const PERIOD_LABELS: Record<TargetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// ============================================================================
// TYPES
// ============================================================================

// The server returns dates as strings from the database
// This differs from the TargetType schema which expects Date objects
type ServerTarget = Omit<TargetType, 'startDate' | 'endDate'> & {
  startDate: string;
  endDate: string;
};

interface FilterState {
  search: string;
  metric: TargetMetric | 'all';
  period: TargetPeriod | 'all';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function TargetsSettingsPage() {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    metric: 'all',
    period: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<TargetType | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const {
    data: targetsData,
    isLoading,
  } = useTargets({
    search: filters.search || undefined,
    metric: filters.metric !== 'all' ? filters.metric : undefined,
    period: filters.period !== 'all' ? filters.period : undefined,
    pageSize: 50,
  });

  const {
    data: progressData,
    isLoading: isProgressLoading,
  } = useTargetProgress();

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createMutation = useCreateTarget();
  const updateMutation = useUpdateTarget();
  const deleteMutation = useDeleteTarget();
  const bulkDeleteMutation = useBulkDeleteTargets();

  // Extract data
  const targets = targetsData?.items ?? [];
  const pagination = targetsData?.pagination;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateClick = useCallback(() => {
    setEditingTarget(null);
    setFormOpen(true);
  }, []);

  const handleEditClick = useCallback((target: ServerTarget) => {
    // Convert string dates to Date objects for the form
    setEditingTarget({
      ...target,
      startDate: new Date(target.startDate),
      endDate: new Date(target.endDate),
    });
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((target: ServerTarget) => {
    // Convert string dates to Date objects
    setTargetToDelete({
      ...target,
      startDate: new Date(target.startDate),
      endDate: new Date(target.endDate),
    });
    setDeleteConfirmOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateTargetInput) => {
      try {
        if (editingTarget) {
          await updateMutation.mutateAsync({
            id: editingTarget.id,
            ...data,
          });
          toast.success(`"${data.name}" has been updated`);
        } else {
          await createMutation.mutateAsync(data);
          toast.success(`"${data.name}" has been created`);
        }
        setFormOpen(false);
        setEditingTarget(null);
      } catch {
        toast.error(
          editingTarget
            ? 'Failed to update target'
            : 'Failed to create target'
        );
      }
    },
    [editingTarget, createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!targetToDelete) return;

    try {
      await deleteMutation.mutateAsync(targetToDelete.id);
      toast.success(`"${targetToDelete.name}" has been deleted`);
      setDeleteConfirmOpen(false);
      setTargetToDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetToDelete.id);
        return next;
      });
    } catch {
      toast.error('Failed to delete target');
    }
  }, [targetToDelete, deleteMutation]);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  }, [selectedIds]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    try {
      await bulkDeleteMutation.mutateAsync({ ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} targets deleted`);
      setBulkDeleteConfirmOpen(false);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to delete targets');
    }
  }, [selectedIds, bulkDeleteMutation]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(targets.map((t) => t.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [targets]
  );

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="KPI Targets"
        description="Set and track performance targets for your organization."
        actions={
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Target
          </Button>
        }
      />
      <PageLayout.Content className="space-y-6">

        {/* Progress Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <TargetProgressWidget
            progress={progressData}
            isLoading={isProgressLoading}
            maxItems={3}
            showSummary
            className="md:col-span-1"
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>
                Summary of all targets in your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {pagination?.totalItems ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Targets</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {progressData?.overall?.achieved ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Achieved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search targets..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="sm:max-w-xs"
              />
              <Select
                value={filters.metric}
                onValueChange={(value) =>
                  handleFilterChange('metric', value as TargetMetric | 'all')
                }
              >
                <SelectTrigger className="sm:w-[180px]">
                  <SelectValue placeholder="All Metrics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  {Object.entries(METRIC_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.period}
                onValueChange={(value) =>
                  handleFilterChange('period', value as TargetPeriod | 'all')
                }
              >
                <SelectTrigger className="sm:w-[140px]">
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Targets Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : targets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No targets found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {filters.search || filters.metric !== 'all' || filters.period !== 'all'
                    ? 'Try adjusting your filters.'
                    : 'Create your first target to start tracking KPIs.'}
                </p>
                <Button onClick={handleCreateClick}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Target
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          targets.length > 0 && selectedIds.size === targets.length
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead className="text-right">Target Value</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((target) => (
                    <TableRow key={target.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(target.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(target.id, checked as boolean)
                          }
                          aria-label={`Select ${target.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{target.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {METRIC_LABELS[target.metric]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PERIOD_LABELS[target.period]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {format(new Date(target.startDate), 'PP')} -{' '}
                            {format(new Date(target.endDate), 'PP')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {target.metric === 'revenue' ||
                        target.metric === 'pipeline_value' ||
                        target.metric === 'average_order_value'
                          ? new Intl.NumberFormat('en-AU', {
                              style: 'currency',
                              currency: 'AUD',
                              maximumFractionDigits: 0,
                            }).format(Number(target.targetValue))
                          : Number(target.targetValue).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(target)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(target)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination info */}
        {pagination && pagination.totalItems > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {targets.length} of {pagination.totalItems} targets
          </div>
        )}
      </PageLayout.Content>

      {/* Form Sheet */}
      <TargetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        target={editingTarget}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{targetToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Targets</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} targets? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
