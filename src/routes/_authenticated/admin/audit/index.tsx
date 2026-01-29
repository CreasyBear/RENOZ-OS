/**
 * Audit Log Route
 *
 * Comprehensive audit trail viewer with filtering, search, and export.
 * Shows all user activity and system changes for compliance.
 *
 * @see src/server/functions/audit-logs.ts for server functions
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  listAuditLogs,
  exportAuditLogs,
  getAuditStats,
} from '@/server/functions/_shared/audit-logs';
import { format, subDays } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks';

// Icons
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  FileEdit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Shield,
  AlertTriangle,
  Clock,
  Activity,
  Loader2,
} from 'lucide-react';

import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

// Route definition
export const Route = createFileRoute('/_authenticated/admin/audit' as any)({
  component: AuditLogViewer,
  loader: async () => {
    const [logs, stats] = await Promise.all([
      listAuditLogs({
        data: {
          pageSize: 50,
          page: 1,
        },
      }),
      getAuditStats({ data: {} }),
    ]);
    return { logs, stats };
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/admin" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Content>
        <AdminTableSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// Types
interface AuditEntry {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  metadata: Record<string, any> | null;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

// Action type icons and colors
const ACTION_STYLES: Record<string, { icon: typeof Eye; color: string; bgColor: string }> = {
  create: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100' },
  update: { icon: FileEdit, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  delete: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100' },
  read: { icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  login: { icon: LogIn, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  logout: { icon: LogOut, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  permission_change: { icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  security_event: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
};

const DEFAULT_ACTION_STYLE = { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };

// Entity types
const ENTITY_TYPES = [
  { value: 'all', label: 'All Entities' },
  { value: 'user', label: 'Users' },
  { value: 'customer', label: 'Customers' },
  { value: 'quote', label: 'Quotes' },
  { value: 'order', label: 'Orders' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'group', label: 'Groups' },
  { value: 'delegation', label: 'Delegations' },
  { value: 'invitation', label: 'Invitations' },
];

// Action types
const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
];

// Time ranges
const TIME_RANGES = [
  { value: '24h', label: 'Last 24 hours', days: 1 },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'all', label: 'All time', days: 0 },
];

function AuditLogViewer() {
  const loaderData = (Route.useLoaderData as any)();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [actionType, setActionType] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Data state
  const [logs, setLogs] = useState<AuditEntry[]>(loaderData?.logs?.items || []);
  const [total, setTotal] = useState(loaderData?.logs?.pagination?.totalItems || 0);
  const [stats] = useState(loaderData?.stats || {});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Detail view state
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const listLogsFn = useServerFn(listAuditLogs);
  const exportLogsFn = useServerFn(exportAuditLogs);

  // Fetch logs with filters
  const fetchLogs = async (newPage = page) => {
    setLoading(true);
    try {
      const timeRangeConfig = TIME_RANGES.find((t) => t.value === timeRange);
      const dateFrom = timeRangeConfig?.days
        ? subDays(new Date(), timeRangeConfig.days)
        : undefined;

      const result = await listLogsFn({
        data: {
          page: newPage,
          pageSize,
          entityType: entityType !== 'all' ? entityType : undefined,
          action: actionType !== 'all' ? actionType : undefined,
          dateFrom,
        },
      });

      setLogs(result.items as AuditEntry[]);
      setTotal(result.pagination.totalItems);
      setPage(newPage);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    fetchLogs(1);
  };

  // Handle export
  const handleExport = async (exportFormat: 'json' | 'csv') => {
    setExporting(true);
    try {
      const timeRangeConfig = TIME_RANGES.find((t) => t.value === timeRange);
      const dateFrom = timeRangeConfig?.days
        ? subDays(new Date(), timeRangeConfig.days)
        : undefined;

      const result = await exportLogsFn({
        data: {
          format: exportFormat,
          entityType: entityType !== 'all' ? entityType : undefined,
          action: actionType !== 'all' ? actionType : undefined,
          dateFrom,
        },
      });

      // Download file
      const blob = new Blob([result.content], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${result.count} audit entries`);
    } catch {
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  // Get action style
  const getActionStyle = (action: string) => {
    const baseAction = action.split('_')[0];
    return ACTION_STYLES[baseAction] || ACTION_STYLES[action] || DEFAULT_ACTION_STYLE;
  };

  // Format action display name
  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Audit Log"
        description="Track all user activity and system changes"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={exporting}
            >
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          </>
        }
      />
      <PageLayout.Content>
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalLogs || 0}</p>
                  <p className="text-muted-foreground text-sm">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-100 p-2">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.userStats?.length || 0}</p>
                  <p className="text-muted-foreground text-sm">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-purple-100 p-2">
                  <FileEdit className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.entityStats?.length || 0}</p>
                  <p className="text-muted-foreground text-sm">Entity Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.actionStats?.length || 0}</p>
                  <p className="text-muted-foreground text-sm">Action Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="min-w-64 flex-1">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search by user, entity, or IP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              {/* Entity Type */}
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Type */}
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time Range */}
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="mr-2 h-4 w-4" />
                )}
                Apply
              </Button>

              <Button variant="ghost" size="icon" onClick={() => fetchLogs(page)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Showing {logs.length} of {total} entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Timestamp</TableHead>
                    <TableHead className="w-48">User</TableHead>
                    <TableHead className="w-32">Action</TableHead>
                    <TableHead className="w-32">Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-32">IP Address</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                        No audit entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((entry) => {
                      const style = getActionStyle(entry.action);
                      const Icon = style.icon;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="max-w-32 truncate" title={entry.user?.email || '-'}>
                                {entry.user?.email || '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`rounded p-1.5 ${style.bgColor}`}>
                                <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                              </div>
                              <span className="text-sm">{formatAction(entry.action)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{entry.entityType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-48 truncate text-sm">
                            {entry.entityId ? `ID: ${entry.entityId.slice(0, 8)}...` : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.ipAddress || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(page + 1)}
                    disabled={page === totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageLayout.Content>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>Full details for this audit log entry</DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground text-sm font-medium">Timestamp</label>
                  <p>{format(new Date(selectedEntry.timestamp), 'MMM d, yyyy h:mm:ss a')}</p>
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium">User</label>
                  <p>{selectedEntry.user?.email || '-'}</p>
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium">Action</label>
                  <p>{formatAction(selectedEntry.action)}</p>
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium">Entity Type</label>
                  <p>{selectedEntry.entityType}</p>
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium">Entity ID</label>
                  <p className="font-mono text-sm">{selectedEntry.entityId || '-'}</p>
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium">IP Address</label>
                  <p className="font-mono text-sm">{selectedEntry.ipAddress || '-'}</p>
                </div>
              </div>

              {selectedEntry.userAgent && (
                <div>
                  <label className="text-muted-foreground text-sm font-medium">User Agent</label>
                  <p className="text-muted-foreground text-sm break-all">
                    {selectedEntry.userAgent}
                  </p>
                </div>
              )}

              {selectedEntry.oldValues && Object.keys(selectedEntry.oldValues).length > 0 && (
                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    Previous Values
                  </label>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-red-50 p-3 text-sm">
                    {JSON.stringify(selectedEntry.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.newValues && Object.keys(selectedEntry.newValues).length > 0 && (
                <div>
                  <label className="text-muted-foreground text-sm font-medium">New Values</label>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-green-50 p-3 text-sm">
                    {JSON.stringify(selectedEntry.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                <div>
                  <label className="text-muted-foreground text-sm font-medium">Metadata</label>
                  <pre className="bg-muted mt-1 overflow-x-auto rounded-lg p-3 text-sm">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
