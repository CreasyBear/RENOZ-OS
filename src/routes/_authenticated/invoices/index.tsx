/**
 * Invoices Index Route (Legacy Redirect)
 *
 * Redirects to consolidated financial domain route.
 * Maintains backward compatibility for bookmarks and external links.
 *
 * @see src/routes/_authenticated/financial/invoices/index.tsx (new location)
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { INVOICE_STATUS_VALUES } from "@/lib/constants/invoice-status";

// ============================================================================
// URL SEARCH SCHEMA (preserved for redirect)
// ============================================================================

const invoiceSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  search: z.string().optional().default(""),
  status: z.enum(INVOICE_STATUS_VALUES).optional(),
});

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: () => null, // Never rendered due to redirect
  validateSearch: invoiceSearchSchema,
  beforeLoad: ({ search }) => {
    // Preserve search params when redirecting
    const searchParams = new URLSearchParams();
    if (search.page && search.page !== 1) {
      searchParams.set('page', String(search.page));
    }
    if (search.search) {
      searchParams.set('search', search.search);
    }
    if (search.status) {
      searchParams.set('status', search.status);
    }

    const queryString = searchParams.toString();
    const redirectTo = queryString
      ? `/financial/invoices?${queryString}`
      : '/financial/invoices';

    throw redirect({
      to: redirectTo as '/financial/invoices',
    });
  },
});
