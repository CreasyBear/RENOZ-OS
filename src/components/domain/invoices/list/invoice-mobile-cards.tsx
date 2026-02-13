/**
 * Invoice Mobile Cards Component
 *
 * Mobile-optimized card layout for invoice list.
 * Follows TABLE-STANDARDS.md responsive pattern.
 */

import { memo, useCallback } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DateCell, PriceCell } from "@/components/shared/data-table";
import { InvoiceStatusBadge } from "../invoice-status-badge";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { InvoiceListItem } from "@/lib/schemas/invoices";

export interface InvoiceMobileCardsProps {
  /** Invoices to display */
  invoices: InvoiceListItem[];
  /** View invoice handler */
  onViewInvoice: (invoiceId: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Mobile card layout for invoice list.
 * Each card is tappable to view invoice details.
 */
export const InvoiceMobileCards = memo(function InvoiceMobileCards({
  invoices,
  onViewInvoice,
  className,
}: InvoiceMobileCardsProps) {
  const handleCardClick = useCallback(
    (invoiceId: string) => {
      onViewInvoice(invoiceId);
    },
    [onViewInvoice]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, invoiceId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewInvoice(invoiceId);
      }
    },
    [onViewInvoice]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {invoices.map((invoice) => {
        const displayNumber = invoice.invoiceNumber || invoice.orderNumber;
        const isOverdue =
          invoice.invoiceStatus === "overdue" &&
          invoice.invoiceDueDate &&
          new Date(invoice.invoiceDueDate) < new Date();

        return (
          <Card
            key={invoice.id}
            tabIndex={0}
            role="button"
            aria-label={`View invoice ${displayNumber}`}
            className={cn(
              "cursor-pointer hover:bg-muted/50 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={() => handleCardClick(invoice.id)}
            onKeyDown={(e) => handleCardKeyDown(e, invoice.id)}
          >
            <CardContent className="p-4">
              {/* Header row: Invoice # + Date + Status */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{displayNumber}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {invoice.createdAt && (
                      <DateCell value={invoice.createdAt} format="short" />
                    )}
                    {invoice.invoiceDueDate && (
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue && "text-destructive font-medium"
                        )}
                      >
                        · Due {formatDate(invoice.invoiceDueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <InvoiceStatusBadge status={invoice.invoiceStatus} />
              </div>

              {/* Footer row: Customer + Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                  {invoice.customer?.name ?? invoice.customerId.slice(0, 8)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Invoice
                  </span>
                  <PriceCell
                    value={invoice.total}
                    className="font-semibold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

InvoiceMobileCards.displayName = "InvoiceMobileCards";
