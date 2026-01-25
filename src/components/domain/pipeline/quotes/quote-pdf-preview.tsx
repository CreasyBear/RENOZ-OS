/**
 * QuotePdfPreview Component
 *
 * PDF-style preview of a quote version for printing/export.
 * Renders quote data in a professional document layout.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUOTE-BUILDER-UI)
 */

import { memo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Download,
  Printer,
  Send,
  FileText,
  Building2,
  Calendar,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks";
import { generateQuotePdf } from "@/server/functions/pipeline/quote-versions";
import { FormatAmount } from "@/components/shared/format";
import type { QuoteVersion } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface QuotePdfPreviewProps {
  quoteVersion: QuoteVersion;
  opportunityTitle?: string;
  customerName?: string;
  customerAddress?: string;
  contactName?: string;
  contactEmail?: string;
  organizationName?: string;
  organizationAbn?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  quoteExpiresAt?: Date | string | null;
  onSend?: () => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuotePdfPreview = memo(function QuotePdfPreview({
  quoteVersion,
  opportunityTitle,
  customerName = "Customer",
  customerAddress,
  contactName,
  contactEmail,
  organizationName = "Your Company",
  organizationAbn,
  organizationAddress,
  organizationPhone,
  organizationEmail,
  quoteExpiresAt,
  onSend,
  className,
}: QuotePdfPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Generate PDF mutation (stub for now)
  const generateMutation = useMutation({
    mutationFn: async () => {
      return generateQuotePdf({
        data: { id: quoteVersion.id },
      });
    },
    onSuccess: (data) => {
      if (data.status === "not_implemented") {
        toastError("PDF generation is not yet implemented");
      } else if (data.pdfUrl) {
        toastSuccess("PDF generated successfully");
        // Would open/download the PDF here
        window.open(data.pdfUrl, "_blank");
      }
    },
    onError: () => {
      toastError("Failed to generate PDF");
    },
  });

  // Print handler
  const handlePrint = () => {
    if (previewRef.current) {
      const printContent = previewRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Quote #${quoteVersion.versionNumber}</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  padding: 40px;
                  max-width: 800px;
                  margin: 0 auto;
                }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
                th { background: #f5f5f5; font-weight: 600; }
                .text-right { text-align: right; }
                .font-medium { font-weight: 500; }
                .font-semibold { font-weight: 600; }
                .text-muted { color: #666; }
                .mt-4 { margin-top: 16px; }
                .mb-4 { margin-bottom: 16px; }
                .py-2 { padding-top: 8px; padding-bottom: 8px; }
                .border-t { border-top: 1px solid #e5e5e5; }
                @media print {
                  body { padding: 20px; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          {generateMutation.isPending ? "Generating..." : "Download PDF"}
        </Button>
        {onSend && (
          <Button size="sm" onClick={onSend}>
            <Send className="h-4 w-4 mr-2" />
            Send Quote
          </Button>
        )}
      </div>

      {/* Preview card (mimics PDF layout) */}
      <Card className="bg-white shadow-lg">
        <div ref={previewRef}>
          <CardHeader className="pb-4">
            {/* Header with company info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">{organizationName}</h1>
                </div>
                {organizationAbn && (
                  <p className="text-sm text-muted-foreground">
                    ABN: {organizationAbn}
                  </p>
                )}
                {organizationAddress && (
                  <p className="text-sm text-muted-foreground">
                    {organizationAddress}
                  </p>
                )}
                {organizationPhone && (
                  <p className="text-sm text-muted-foreground">
                    {organizationPhone}
                  </p>
                )}
                {organizationEmail && (
                  <p className="text-sm text-muted-foreground">
                    {organizationEmail}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  <FileText className="h-4 w-4 mr-2" />
                  QUOTE
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Quote details and customer info */}
            <div className="grid grid-cols-2 gap-6">
              {/* Bill To */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Quote For
                </h3>
                <p className="font-semibold">{customerName}</p>
                {contactName && (
                  <p className="text-sm">Attn: {contactName}</p>
                )}
                {customerAddress && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {customerAddress}
                  </p>
                )}
                {contactEmail && (
                  <p className="text-sm text-muted-foreground">{contactEmail}</p>
                )}
              </div>

              {/* Quote details */}
              <div className="text-right space-y-1">
                <div className="flex items-center justify-end gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Quote #:</span>
                  <span className="font-semibold">v{quoteVersion.versionNumber}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {formatDate(quoteVersion.createdAt)}
                  </span>
                </div>
                {quoteExpiresAt && (
                  <div className="flex items-center justify-end gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Valid Until:</span>
                    <span className="font-medium">{formatDate(quoteExpiresAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Opportunity title */}
            {opportunityTitle && (
              <div className="bg-muted/50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Re
                </h3>
                <p className="font-medium">{opportunityTitle}</p>
              </div>
            )}

            <Separator />

            {/* Line items table */}
            <div>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Description</th>
                    <th className="text-right py-2 font-semibold w-20">Qty</th>
                    <th className="text-right py-2 font-semibold w-28">Unit Price</th>
                    {quoteVersion.items.some((i) => i.discountPercent) && (
                      <th className="text-right py-2 font-semibold w-20">Disc %</th>
                    )}
                    <th className="text-right py-2 font-semibold w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteVersion.items.map((item, index) => (
                    <tr key={index} className="border-b border-muted">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3">{item.quantity}</td>
                      <td className="text-right py-3">
                        <FormatAmount amount={item.unitPriceCents} cents={true} />
                      </td>
                      {quoteVersion.items.some((i) => i.discountPercent) && (
                        <td className="text-right py-3">
                          {item.discountPercent ? `${item.discountPercent}%` : "-"}
                        </td>
                      )}
                      <td className="text-right py-3 font-medium">
                        <FormatAmount amount={item.totalCents} cents={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span><FormatAmount amount={quoteVersion.subtotal} cents={true} /></span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">GST (10%)</span>
                  <span><FormatAmount amount={quoteVersion.taxAmount} cents={true} /></span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 font-semibold text-lg">
                  <span>Total (AUD)</span>
                  <span><FormatAmount amount={quoteVersion.total} cents={true} /></span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quoteVersion.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Notes
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{quoteVersion.notes}</p>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex-col items-start border-t bg-muted/30 text-sm text-muted-foreground">
            <p className="mb-2">
              This quote is valid for 30 days from the date of issue unless otherwise specified.
            </p>
            <p>
              All prices are in Australian Dollars (AUD) and include GST where applicable.
            </p>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
});

export default QuotePdfPreview;
