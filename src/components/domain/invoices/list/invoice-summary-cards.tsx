'use client';

/**
 * Invoice Summary Cards
 *
 * Summary metric cards for the invoice list header.
 * Shows Open, Overdue, and Paid totals.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { InvoiceSummaryData } from '@/lib/schemas/invoices';

export interface InvoiceSummaryCardsProps {
  summary: InvoiceSummaryData | null;
  currency?: string;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// SUMMARY CARD COMPONENT
// ============================================================================

interface SummaryCardProps {
  title: string;
  count: number;
  amount: number;
  currency?: string;
  variant: 'open' | 'overdue' | 'paid';
}

const SummaryCard = memo(function SummaryCard({
  title,
  count,
  amount,
  currency = 'AUD',
  variant,
}: SummaryCardProps) {
  const variantStyles = {
    open: {
      bg: 'bg-gray-50 dark:bg-gray-900/50',
      text: 'text-gray-600 dark:text-gray-400',
      amount: 'text-gray-900 dark:text-gray-100',
    },
    overdue: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      amount: 'text-amber-700 dark:text-amber-300',
    },
    paid: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      amount: 'text-emerald-700 dark:text-emerald-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn('border-0', styles.bg)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn('text-sm font-medium', styles.text)}>{title}</p>
            <p className={cn('text-2xl font-bold', styles.amount)}>
              {formatCurrency(amount, currency)}
            </p>
          </div>
          <div className={cn('text-right text-sm', styles.text)}>
            <span className="font-medium">{count}</span>
            <span className="ml-1">invoices</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InvoiceSummaryCards = memo(function InvoiceSummaryCards({
  summary,
  currency = 'AUD',
  className,
}: InvoiceSummaryCardsProps) {
  if (!summary) {
    return null;
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-3', className)}>
      <SummaryCard
        title="Open Invoices"
        count={summary.open.count}
        amount={summary.open.amount}
        currency={currency}
        variant="open"
      />
      <SummaryCard
        title="Overdue"
        count={summary.overdue.count}
        amount={summary.overdue.amount}
        currency={currency}
        variant="overdue"
      />
      <SummaryCard
        title="Paid (This Month)"
        count={summary.paid.count}
        amount={summary.paid.amount}
        currency={currency}
        variant="paid"
      />
    </div>
  );
});

InvoiceSummaryCards.displayName = 'InvoiceSummaryCards';
