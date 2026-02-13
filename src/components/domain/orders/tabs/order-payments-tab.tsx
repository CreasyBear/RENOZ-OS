/**
 * Order Payments Tab
 *
 * Displays payment history and summary for an order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FormatAmount } from "@/components/shared/format";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/orders/order-payments";
import {
  CreditCard,
  Calendar,
  FileText,
  RotateCcw,
  Plus,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

import type { Payment, PaymentSummary } from '@/lib/schemas/orders';

export interface OrderPaymentsTabProps {
  payments: Payment[];
  summary: PaymentSummary;
  orderTotal: number;
  balanceDue: number;
  onRecordPayment: () => void;
  onRefundPayment?: (paymentId: string) => void;
  canRecordPayment?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ onRecordPayment }: { onRecordPayment: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-sm font-medium text-foreground">No payments recorded</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Record payments to track what&apos;s been paid and what&apos;s still
        outstanding.
      </p>
      <Button onClick={onRecordPayment} className="mt-4">
        <Plus className="h-4 w-4 mr-2" />
        Record Payment
      </Button>
    </div>
  );
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

function PaymentSummaryCard({
  summary,
  orderTotal,
  balanceDue,
}: {
  summary: PaymentSummary;
  orderTotal: number;
  balanceDue: number;
}) {
  const paymentPercent =
    orderTotal > 0 ? Math.round((summary.netAmount / orderTotal) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Order Total</p>
            <p className="text-lg font-semibold">
              <FormatAmount amount={orderTotal} />
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance Due</p>
            <p
              className={cn(
                "text-lg font-semibold",
                balanceDue > 0 ? "text-amber-600" : "text-green-600"
              )}
            >
              <FormatAmount amount={balanceDue} />
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Paid</p>
            <p className="font-medium text-green-600">
              <FormatAmount amount={summary.totalPaid} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Refunds</p>
            <p className="font-medium text-destructive">
              <FormatAmount amount={summary.totalRefunds} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Net Payments</p>
            <p className="font-medium">
              <FormatAmount amount={summary.netAmount} />
            </p>
          </div>
        </div>

        {summary.totalPayments > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="text-muted-foreground">
                  {paymentPercent}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    paymentPercent >= 100
                      ? "bg-green-500"
                      : paymentPercent >= 50
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(paymentPercent, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAYMENT ROW
// ============================================================================

function PaymentRow({
  payment,
  onRefund,
}: {
  payment: Payment;
  onRefund?: (paymentId: string) => void;
}) {
  return (
    <TableRow className={cn(payment.isRefund && "bg-destructive/5")}>
      <TableCell>
        <div className="flex items-center gap-2">
          {payment.isRefund ? (
            <RotateCcw className="h-4 w-4 text-destructive" />
          ) : (
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          )}
          <span
            className={cn(
              "font-medium",
              payment.isRefund && "text-destructive"
            )}
          >
            {payment.isRefund ? "Refund" : "Payment"}
          </span>
          {payment.isRefund && (
            <Badge variant="destructive" className="text-xs">
              Refund
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{formatDate(payment.paymentDate)}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            "font-medium tabular-nums",
            payment.isRefund ? "text-destructive" : "text-green-600"
          )}
        >
          {payment.isRefund ? "-" : ""}
          <FormatAmount amount={payment.amount} />
        </span>
      </TableCell>
      <TableCell>
        {payment.reference && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{payment.reference}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        {!payment.isRefund && onRefund && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRefund(payment.id)}
            className="text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refund
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderPaymentsTab = memo(function OrderPaymentsTab({
  payments,
  summary,
  orderTotal,
  balanceDue,
  onRecordPayment,
  onRefundPayment,
  canRecordPayment = true,
}: OrderPaymentsTabProps) {
  const hasPayments = payments.length > 0;

  return (
    <div className="space-y-6 pt-6">
      {/* Summary Card */}
      <PaymentSummaryCard
        summary={summary}
        orderTotal={orderTotal}
        balanceDue={balanceDue}
      />

      {/* Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          {canRecordPayment && (
            <Button onClick={onRecordPayment} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!hasPayments ? (
            <EmptyState onRecordPayment={onRecordPayment} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onRefund={onRefundPayment}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default OrderPaymentsTab;
