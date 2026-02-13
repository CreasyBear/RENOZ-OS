/**
 * Invoice Detail Route (Legacy Redirect)
 *
 * Redirects to consolidated financial domain route.
 * Maintains backward compatibility for bookmarks and external links.
 *
 * @see src/routes/_authenticated/financial/invoices/$invoiceId.tsx (new location)
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  component: () => null, // Never rendered due to redirect
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/financial/invoices/$invoiceId',
      params: { invoiceId: params.invoiceId },
    });
  },
});
