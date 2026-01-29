/**
 * Suppression List Table Component
 *
 * DataTable for viewing and managing email suppression list.
 *
 * @see INT-RES-005
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks";
import {
  useSuppressionList,
  useRemoveSuppression,
} from "@/hooks/communications/use-email-suppression";
import type {
  SuppressionRecord,
  SuppressionReason,
} from "@/lib/schemas/communications/email-suppression";

// ============================================================================
// TYPES
// ============================================================================

export interface SuppressionListTableProps {
  className?: string;
}

type SortField = 'email' | 'reason' | 'bounceType' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// REASON BADGE
// ============================================================================

function ReasonBadge({ reason }: { reason: SuppressionReason }) {
  const variants: Record<
    SuppressionReason,
    { label: string; variant: "default" | "destructive" | "outline" | "secondary" }
  > = {
    bounce: { label: "Bounce", variant: "destructive" },
    complaint: { label: "Complaint", variant: "destructive" },
    unsubscribe: { label: "Unsubscribe", variant: "secondary" },
    manual: { label: "Manual", variant: "outline" },
  };

  const config = variants[reason];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ============================================================================
// SORT HEADER COMPONENT
// ============================================================================

function SortHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive &&
        (currentSort.direction === "asc" ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function SuppressionListTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Suppressed At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SuppressionListTable = memo(function SuppressionListTable({
  className,
}: SuppressionListTableProps) {
  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reason, setReason] = useState<SuppressionReason | "all">("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'createdAt',
    direction: 'desc',
  });
  const pageSize = 20;

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<SuppressionRecord | null>(
    null
  );

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    // Simple debounce - in production would use a debounce hook
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Query suppression list
  const { data, isLoading, error } = useSuppressionList({
    search: debouncedSearch || undefined,
    reason: reason === "all" ? undefined : reason,
    page,
    pageSize,
  });

  // Remove mutation
  const removeMutation = useRemoveSuppression();

  const handleRemove = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      await removeMutation.mutateAsync({
        id: deleteTarget.id,
        reason: "Manual removal via settings",
      });
      toast.success("Email removed from suppression list");
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Failed to remove from suppression list");
    }
  }, [deleteTarget, removeMutation]);

  const handleReasonChange = useCallback((value: string) => {
    setReason(value as SuppressionReason | "all");
    setPage(1);
  }, []);

  // Sort items client-side
  const sortedItems = useMemo(() => {
    const items = data?.items ?? [];
    const sorted = [...items];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'reason':
          comparison = a.reason.localeCompare(b.reason);
          break;
        case 'bounceType':
          comparison = (a.bounceType || '').localeCompare(b.bounceType || '');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [data?.items, sort]);

  if (isLoading) {
    return <SuppressionListTableSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>Failed to load suppression list</p>
      </div>
    );
  }

  const items = sortedItems;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={reason} onValueChange={handleReasonChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            <SelectItem value="bounce">Bounce</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader label="Email" field="email" currentSort={sort} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="Reason" field="reason" currentSort={sort} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="Bounce Type" field="bounceType" currentSort={sort} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="Suppressed At" field="createdAt" currentSort={sort} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  {debouncedSearch || reason !== "all"
                    ? "No matching suppressions found"
                    : "No suppressed emails"}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.email}</TableCell>
                  <TableCell>
                    <ReasonBadge reason={item.reason} />
                  </TableCell>
                  <TableCell>
                    {item.bounceType ? (
                      <Badge variant="outline" className="capitalize">
                        {item.bounceType}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Suppression List?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">{deleteTarget?.email}</span> from
              the suppression list? This email will be able to receive emails
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
