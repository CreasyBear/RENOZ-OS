/**
 * Invoice Link Component
 *
 * Displays invoice link/actions for an order.
 * Shows "View Invoice" link if invoice exists, or "Generate Invoice" button if not.
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { Download, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasInvoice } from '@/lib/utils/invoice-helpers';

export interface InvoiceLinkProps {
  orderId: string;
  invoiceNumber?: string | null;
  invoicePdfUrl?: string | null;
  onGenerateInvoice?: () => void;
  isGenerating?: boolean;
}

export const InvoiceLink = memo(function InvoiceLink({
  orderId,
  invoiceNumber,
  invoicePdfUrl,
  onGenerateInvoice,
  isGenerating = false,
}: InvoiceLinkProps) {
  const invoiceExists = hasInvoice({ invoiceNumber });

  if (invoiceExists) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/invoices/$invoiceId"
          params={{ invoiceId: orderId }}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Link2 className="h-3 w-3" />
          View Invoice
        </Link>
        {invoicePdfUrl && (
          <a
            href={invoicePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3" />
            Download
          </a>
        )}
      </div>
    );
  }

  if (onGenerateInvoice) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onGenerateInvoice}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate'
        )}
      </Button>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
});
