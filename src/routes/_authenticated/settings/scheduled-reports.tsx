/**
 * Scheduled Reports Settings Route
 *
 * ARCHITECTURE: Container Component - Manages scheduled reports with full CRUD.
 *
 * Features:
 * - List all scheduled reports with filtering
 * - Create/edit reports via slide-out form
 * - Delete reports with confirmation
 * - Execute reports on-demand
 * - Bulk operations (delete, activate/deactivate)
 * - Status display (last run, next run)
 *
 * @see DASH-REPORTS-UI acceptance criteria
 * @see src/hooks/dashboard/use-scheduled-reports.ts
 */

import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Plus,
  Trash2,
  FileText,
  Filter,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
// cn imported but kept for potential future use
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageLayout } from '@/components/layout/page-layout';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form';
import {
  useScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useExecuteScheduledReport,
  useBulkDeleteScheduledReports,
  useBulkUpdateScheduledReports,
} from '@/hooks/dashboard';
import type {
  ReportFrequency,
  ReportFormat,
  CreateScheduledReportInput,
} from '@/lib/schemas/dashboard/scheduled-reports';
import type { ScheduledReport } from '@/../drizzle/schema/dashboard/scheduled-reports';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/settings/scheduled-reports')({
  component: ScheduledReportsPage,
});

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'XLSX',
  html: 'HTML',
};

// ============================================================================
// TYPES
// ============================================================================

interface FilterState {
  search: string;
  frequency: ReportFrequency | 'all';
  format: ReportFormat | 'all';
  isActive: 'all' | 'active' | 'inactive';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ScheduledReportsPage() {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    frequency: 'all',
    format: 'all',
    isActive: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [executingReportId, setExecutingReportId] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const {
    data: reportsData,
    isLoading,
    refetch,
  } = useScheduledReports({
    search: filters.search || undefined,
    frequency: filters.frequency !== 'all' ? filters.frequency : undefined,
    format: filters.format !== 'all' ? filters.format : undefined,
    isActive:
      filters.isActive === 'all' ? undefined : filters.isActive === 'active',
    pageSize: 50,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createMutation = useCreateScheduledReport();
  const updateMutation = useUpdateScheduledReport();
  const deleteMutation = useDeleteScheduledReport();
  const executeMutation = useExecuteScheduledReport();
  const bulkDeleteMutation = useBulkDeleteScheduledReports();
  const bulkUpdateMutation = useBulkUpdateScheduledReports();

  // Extract data
  const reports = reportsData?.items ?? [];
  const pagination = reportsData?.pagination;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateClick = useCallback(() => {
    setEditingReport(null);
    setFormOpen(true);
  }, []);

  const handleEditClick = useCallback((report: ScheduledReport) => {
    setEditingReport(report);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((report: ScheduledReport) => {
    setReportToDelete(report);
    setDeleteConfirmOpen(true);
  }, []);

  const handleExecuteClick = useCallback(
    async (report: ScheduledReport) => {
      setExecutingReportId(report.id);
      try {
        await executeMutation.mutateAsync(report.id);
        toast.success(`"${report.name}" execution triggered`);
      } catch (error) {
        toast.error('Failed to execute report');
      } finally {
        setExecutingReportId(null);
      }
    },
    [executeMutation]
  );

  const handleToggleActive = useCallback(
    async (report: ScheduledReport) => {
      try {
        await updateMutation.mutateAsync({
          id: report.id,
          isActive: !report.isActive,
        });
        toast.success(
          report.isActive
            ? `"${report.name}" has been paused`
            : `"${report.name}" has been activated`
        );
      } catch (error) {
        toast.error('Failed to update report status');
      }
    },
    [updateMutation]
  );

  const handleFormSubmit = useCallback(
    async (data: CreateScheduledReportInput) => {
      try {
        if (editingReport) {
          await updateMutation.mutateAsync({
            id: editingReport.id,
            ...data,
          });
          toast.success(`"${data.name}" has been updated`);
        } else {
          await createMutation.mutateAsync(data);
          toast.success(`"${data.name}" has been created`);
        }
        setFormOpen(false);
        setEditingReport(null);
      } catch (error) {
        toast.error(
          editingReport ? 'Failed to update report' : 'Failed to create report'
        );
        throw error;
      }
    },
    [editingReport, createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!reportToDelete) return;

    try {
      await deleteMutation.mutateAsync(reportToDelete.id);
      toast.success(`"${reportToDelete.name}" has been deleted`);
      setDeleteConfirmOpen(false);
      setReportToDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(reportToDelete.id);
        return next;
      });
    } catch (error) {
      toast.error('Failed to delete report');
    }
  }, [reportToDelete, deleteMutation]);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  }, [selectedIds]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    try {
      await bulkDeleteMutation.mutateAsync({ ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} reports deleted`);
      setBulkDeleteConfirmOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to delete reports');
    }
  }, [selectedIds, bulkDeleteMutation]);

  const handleBulkToggleActive = useCallback(
    async (activate: boolean) => {
      if (selectedIds.size === 0) return;
      try {
        await bulkUpdateMutation.mutateAsync({
          ids: Array.from(selectedIds),
          updates: { isActive: activate },
        });
        toast.success(
          `${selectedIds.size} reports ${activate ? 'activated' : 'paused'}`
        );
        setSelectedIds(new Set());
      } catch (error) {
        toast.error('Failed to update reports');
      }
    },
    [selectedIds, bulkUpdateMutation]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(reports.map((r) => r.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [reports]
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
  // RENDER HELPERS
  // ============================================================================

  const renderStatusBadge = (report: ScheduledReport) => {
    if (!report.isActive) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Pause className="h-3 w-3 mr-1" />
          Paused
        </Badge>
      );
    }

    // Check for recent errors
    if (report.lastError && report.lastErrorAt) {
      const errorAge = Date.now() - new Date(report.lastErrorAt).getTime();
      // Show error if it occurred within last 7 days
      if (errorAge < 7 * 24 * 60 * 60 * 1000) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{report.lastError}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    }

    if (report.lastSuccessAt) {
      return (
        <Badge variant="secondary" className="text-green-700 bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const renderNextRun = (report: ScheduledReport) => {
    if (!report.isActive) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (!report.nextRunAt) {
      return <span className="text-muted-foreground">Not scheduled</span>;
    }
    const nextRun = new Date(report.nextRunAt);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-sm">
            {formatDistanceToNow(nextRun, { addSuffix: true })}
          </TooltipTrigger>
          <TooltipContent>
            <p>{format(nextRun, 'PPpp')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderLastRun = (report: ScheduledReport) => {
    if (!report.lastRunAt) {
      return <span className="text-muted-foreground">Never</span>;
    }
    const lastRun = new Date(report.lastRunAt);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-sm text-muted-foreground">
            {formatDistanceToNow(lastRun, { addSuffix: true })}
          </TooltipTrigger>
          <TooltipContent>
            <p>{format(lastRun, 'PPpp')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Scheduled Reports</h1>
            <p className="text-muted-foreground mt-1">
              Configure automated reports to be sent on a schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{pagination?.totalItems ?? 0}</div>
                <div className="text-xs text-muted-foreground">Total Reports</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reports.filter((r) => r.isActive).length}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {reports.filter((r) => !r.isActive).length}
                </div>
                <div className="text-xs text-muted-foreground">Paused</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {
                    reports.filter((r) => {
                      if (!r.nextRunAt) return false;
                      const hours =
                        (new Date(r.nextRunAt).getTime() - Date.now()) / (1000 * 60 * 60);
                      return hours > 0 && hours <= 24;
                    }).length
                  }
                </div>
                <div className="text-xs text-muted-foreground">Due Today</div>
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggleActive(true)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggleActive(false)}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search reports..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="sm:max-w-xs"
              />
              <Select
                value={filters.frequency}
                onValueChange={(value) =>
                  handleFilterChange('frequency', value as ReportFrequency | 'all')
                }
              >
                <SelectTrigger className="sm:w-[140px]">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.format}
                onValueChange={(value) =>
                  handleFilterChange('format', value as ReportFormat | 'all')
                }
              >
                <SelectTrigger className="sm:w-[120px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.isActive}
                onValueChange={(value) =>
                  handleFilterChange('isActive', value as 'all' | 'active' | 'inactive')
                }
              >
                <SelectTrigger className="sm:w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No reports found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {filters.search ||
                  filters.frequency !== 'all' ||
                  filters.format !== 'all' ||
                  filters.isActive !== 'all'
                    ? 'Try adjusting your filters.'
                    : 'Create your first scheduled report.'}
                </p>
                <Button onClick={handleCreateClick}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={reports.length > 0 && selectedIds.size === reports.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(report.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(report.id, checked as boolean)
                          }
                          aria-label={`Select ${report.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {report.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{FREQUENCY_LABELS[report.frequency]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{FORMAT_LABELS[report.format]}</Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              <span>{report.recipients?.emails?.length ?? 0}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {report.recipients?.emails?.length > 0 ? (
                                <ul className="text-xs">
                                  {report.recipients.emails.map((email: string) => (
                                    <li key={email}>{email}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No recipients</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{renderStatusBadge(report)}</TableCell>
                      <TableCell>{renderNextRun(report)}</TableCell>
                      <TableCell>{renderLastRun(report)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleExecuteClick(report)}
                                  disabled={executingReportId === report.id}
                                >
                                  {executingReportId === report.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Run Now</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleActive(report)}
                                >
                                  {report.isActive ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {report.isActive ? 'Pause' : 'Activate'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(report)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(report)}
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
            Showing {reports.length} of {pagination.totalItems} reports
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <ScheduledReportForm
        open={formOpen}
        onOpenChange={setFormOpen}
        report={editingReport}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reportToDelete?.name}"? This action
              cannot be undone and will stop all scheduled deliveries.
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
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Reports</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} scheduled reports?
              This action cannot be undone.
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
