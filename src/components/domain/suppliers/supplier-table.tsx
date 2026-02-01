/**
 * Supplier Table Component
 *
 * Data table for displaying suppliers with sorting, pagination, and row actions.
 * Follows the pattern from customer-table.tsx.
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Star, Building2, Phone, Mail, ChevronUp, ChevronDown } from 'lucide-react';
import { StatusCell } from '@/components/shared/data-table';
import { SUPPLIER_STATUS_CONFIG } from './supplier-status-config';
import type { SupplierStatus, SupplierType } from '@/lib/schemas/suppliers';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierTableData {
  id: string;
  supplierCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: SupplierStatus;
  supplierType: SupplierType | null;
  overallRating: number | null;
  totalPurchaseOrders: number | null;
  leadTimeDays: number | null;
  lastOrderDate: string | null;
}

type SortField = 'name' | 'status' | 'supplierType' | 'overallRating' | 'totalPurchaseOrders' | 'leadTimeDays' | 'lastOrderDate';
type SortDirection = 'asc' | 'desc';

interface SupplierTableProps {
  suppliers: SupplierTableData[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const typeLabels: Record<SupplierType, string> = {
  manufacturer: 'Manufacturer',
  distributor: 'Distributor',
  retailer: 'Retailer',
  service: 'Service',
  raw_materials: 'Raw Materials',
};

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground">-</span>;

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < fullStars
              ? 'fill-yellow-400 text-yellow-400'
              : i === fullStars && hasHalfStar
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="text-muted-foreground ml-1 text-sm">{rating.toFixed(1)}</span>
    </div>
  );
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
        (currentSort.direction === 'asc' ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        ))}
    </Button>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierTable({ suppliers, isLoading, onDelete, onEdit }: SupplierTableProps) {
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'name',
    direction: 'asc',
  });

  const handleSort = useCallback((field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Sort suppliers
  const sortedSuppliers = useMemo(() => {
    const sorted = [...suppliers];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'supplierType':
          comparison = (a.supplierType || '').localeCompare(b.supplierType || '');
          break;
        case 'overallRating':
          comparison = (a.overallRating ?? 0) - (b.overallRating ?? 0);
          break;
        case 'totalPurchaseOrders':
          comparison = (a.totalPurchaseOrders ?? 0) - (b.totalPurchaseOrders ?? 0);
          break;
        case 'leadTimeDays':
          comparison = (a.leadTimeDays ?? 0) - (b.leadTimeDays ?? 0);
          break;
        case 'lastOrderDate':
          const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        default:
          comparison = 0;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [suppliers, sort]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground animate-pulse">Loading suppliers...</div>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="text-muted-foreground/50 h-12 w-12" />
        <h3 className="mt-4 text-lg font-medium">No suppliers found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Get started by adding your first supplier.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">
              <SortHeader label="Supplier" field="name" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Type" field="supplierType" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Status" field="status" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Rating" field="overallRating" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead className="text-right">
              <SortHeader label="Orders" field="totalPurchaseOrders" currentSort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead className="text-right">Lead Time</TableHead>
            <TableHead>Last Order</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSuppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell>
                <Link
                  to="/suppliers/$supplierId"
                  params={{ supplierId: supplier.id }}
                  className="block"
                >
                  <div className="font-medium hover:underline">{supplier.name}</div>
                  {supplier.supplierCode && (
                    <div className="text-muted-foreground text-xs">{supplier.supplierCode}</div>
                  )}
                  <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    {supplier.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {supplier.email}
                      </span>
                    )}
                    {supplier.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </span>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                {supplier.supplierType ? (
                  <Badge variant="outline">{typeLabels[supplier.supplierType]}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <StatusCell status={supplier.status} statusConfig={SUPPLIER_STATUS_CONFIG} />
              </TableCell>
              <TableCell>
                <RatingStars rating={supplier.overallRating} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {supplier.totalPurchaseOrders ?? 0}
              </TableCell>
              <TableCell className="text-right">
                {supplier.leadTimeDays !== null ? `${supplier.leadTimeDays} days` : '-'}
              </TableCell>
              <TableCell>{formatDate(supplier.lastOrderDate)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/suppliers/$supplierId" params={{ supplierId: supplier.id }}>
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(supplier.id)}>
                        Edit Supplier
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(supplier.id)}
                      >
                        Delete Supplier
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
