/**
 * Financial Invoices Index Route
 *
 * Main invoice list page with filtering and status overview.
 * Consolidated into financial domain for unified navigation.
 *
 * LAYOUT: full-width (data-dense table view)
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 * @see src/routes/_authenticated/invoices/index.tsx (original - now redirects here)
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback } from "react";
import { RouteErrorFallback } from "@/components/layout";
import { InvoiceListSkeleton } from "@/components/skeletons/invoices";
import { InvoiceListContainer } from "@/components/domain/invoices";
import { InvoiceActionButton } from "@/components/domain/invoices/invoice-action-button";
import { INVOICE_STATUS_VALUES } from "@/lib/constants/invoice-status";
import {
  useTransformedFilterUrlState,
  parseDateFromUrl,
  serializeDateForUrl,
} from "@/hooks/filters/use-filter-url-state";
import {
  DEFAULT_INVOICE_FILTERS,
  type InvoiceFiltersState,
} from "@/components/domain/invoices/invoice-filter-config";

// ============================================================================
// URL SEARCH SCHEMA
// ============================================================================

const invoiceSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default(""),
  status: z.enum(INVOICE_STATUS_VALUES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  customerId: z.string().uuid().optional(),
});

type InvoiceSearch = z.infer<typeof invoiceSearchSchema>;

const fromUrlParams = (search: InvoiceSearch): InvoiceFiltersState => ({
  search: search.search ?? "",
  status: search.status ?? null,
  customerId: search.customerId ?? null,
  dateRange:
    search.dateFrom || search.dateTo
      ? {
          from: parseDateFromUrl(search.dateFrom),
          to: parseDateFromUrl(search.dateTo),
        }
      : null,
  amountRange:
    search.minAmount != null || search.maxAmount != null
      ? {
          min: search.minAmount ?? null,
          max: search.maxAmount ?? null,
        }
      : null,
});

const toUrlParams = (filters: InvoiceFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status ?? undefined,
  customerId: filters.customerId ?? undefined,
  dateFrom: filters.dateRange?.from ? serializeDateForUrl(filters.dateRange.from) : undefined,
  dateTo: filters.dateRange?.to ? serializeDateForUrl(filters.dateRange.to) : undefined,
  minAmount: filters.amountRange?.min ?? undefined,
  maxAmount: filters.amountRange?.max ?? undefined,
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/financial/invoices/")({
  component: InvoicesPage,
  validateSearch: invoiceSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => <InvoiceListSkeleton />,
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function InvoicesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_INVOICE_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ["search", "status", "customerId", "dateRange", "amountRange"],
  });

  const handleFiltersChange = useCallback(
    (nextFilters: InvoiceFiltersState) => {
      setFilters(nextFilters);
    },
    [setFilters]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      navigate({
        to: ".",
        search: {
          ...toUrlParams(filters),
          page: newPage,
        },
      });
    },
    [navigate, filters]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track customer invoice balances.
          </p>
        </div>
        <InvoiceActionButton />
      </div>
      <InvoiceListContainer
        filters={filters}
        onFiltersChange={handleFiltersChange}
        page={search.page}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
