/**
 * CustomerStatements Component (Presenter)
 *
 * Generate and view customer statements with transaction history.
 * Shows opening/closing balance, invoices, payments, and credit notes.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-004c)
 */

import { memo, useState } from 'react';
import {
  FileText,
  Download,
  Mail,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatePickerControl } from '@/components/shared';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { format, subMonths } from 'date-fns';
import type { StatementHistoryRecord } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the CustomerStatements presenter component.
 * All data and mutations are provided by the container route.
 */
export interface CustomerStatementsProps {
  /** @source Route param or parent */
  customerId: string;
  /** @source Passed from route or parent */
  customerName: string;
  /** @source useQuery(['statements', customerId]) */
  statements: StatementHistoryRecord[];
  /** @source Derived from statements array via selectedStatementId */
  selectedStatement: StatementHistoryRecord | undefined;
  /** @source useQuery.isLoading */
  isLoading: boolean;
  /** @source useQuery.error */
  error: Error | null;
  /** @source useMutation for generateStatement */
  onGenerate: (dateFrom: string, dateTo: string) => void;
  /** @source useMutation.isPending for generate */
  isGenerating: boolean;
  /** @source useMutation for markStatementSent */
  onEmail: (statementId: string) => void;
  /** @source useMutation.isPending for email */
  isEmailing: boolean;
  /** @source Local state setter in container */
  onSelectStatement: (id: string | null) => void;
  /** @source Optional className for styling */
  className?: string;
}

// ============================================================================
// GENERATE DIALOG
// ============================================================================

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (dateFrom: string, dateTo: string) => void;
  isGenerating: boolean;
}

function GenerateStatementDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: GenerateDialogProps) {
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleGenerate = () => {
    // dateFrom and dateTo are already in 'YYYY-MM-DD' format from the date input
    onGenerate(dateFrom, dateTo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Statement</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <DatePickerControl
            label="From Date"
            value={dateFrom}
            onChange={setDateFrom}
          />
          <DatePickerControl
            label="To Date"
            value={dateTo}
            onChange={setDateTo}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Statement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STATEMENT PREVIEW
// ============================================================================

interface StatementPreviewProps {
  statement: {
    id: string;
    startDate: Date;
    endDate: Date;
    openingBalance: number;
    closingBalance: number;
    totalInvoiced: number;
    totalPayments: number;
    totalCredits: number;
    transactions?: Array<{
      id: string;
      date: string;
      type: 'invoice' | 'payment' | 'credit_note';
      reference: string;
      description: string;
      amount: number;
      runningBalance: number;
    }>;
  };
  onEmail?: () => void;
  isEmailing?: boolean;
}

function StatementPreview({ statement, onEmail, isEmailing }: StatementPreviewProps) {
  const txTypeConfig = {
    invoice: { label: 'Invoice', icon: ArrowUpRight, color: 'text-red-600' },
    payment: { label: 'Payment', icon: ArrowDownRight, color: 'text-green-600' },
    credit_note: { label: 'Credit Note', icon: Minus, color: 'text-blue-600' },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">
            Statement: {format(new Date(statement.startDate), 'dd MMM')} -{' '}
            {format(new Date(statement.endDate), 'dd MMM yyyy')}
          </CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onEmail} disabled={isEmailing}>
            {isEmailing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Email
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Opening Balance</p>
            <p className="text-lg font-semibold">
              <FormatAmount amount={statement.openingBalance} />
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Invoiced</p>
            <p className="text-lg font-semibold text-red-600">
              +<FormatAmount amount={statement.totalInvoiced} />
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Payments</p>
            <p className="text-lg font-semibold text-green-600">
              -<FormatAmount amount={statement.totalPayments + statement.totalCredits} />
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Closing Balance</p>
            <p className="text-lg font-semibold">
              <FormatAmount amount={statement.closingBalance} />
            </p>
          </div>
        </div>

        {/* Transactions */}
        {statement.transactions && statement.transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.transactions.map((tx) => {
                const config = txTypeConfig[tx.type];
                const Icon = config.icon;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), 'dd MMM')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Icon className={cn('h-4 w-4', config.color)} />
                        {config.label}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className={cn('text-right', config.color)}>
                      {tx.type === 'invoice' ? '+' : '-'}
                      <FormatAmount amount={Math.abs(tx.amount)} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormatAmount amount={tx.runningBalance} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground py-4 text-center">
            Transaction details not available for historical statements
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerStatements = memo(function CustomerStatements({
  customerId: _customerId,
  customerName,
  statements,
  selectedStatement,
  isLoading,
  error,
  onGenerate,
  isGenerating,
  onEmail,
  isEmailing,
  onSelectStatement,
  className,
}: CustomerStatementsProps) {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const handleGenerateSuccess = (dateFrom: string, dateTo: string) => {
    onGenerate(dateFrom, dateTo);
    setGenerateDialogOpen(false);
  };

  if (isLoading) {
    return <Skeleton className={cn('h-64 w-full', className)} />;
  }

  if (error) {
    return <div className={cn('text-destructive p-4', className)}>Failed to load statements</div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Customer Statements</h3>
          <p className="text-muted-foreground text-sm">{customerName}</p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Statement
        </Button>
      </div>

      {/* Statement List / Preview */}
      {statements.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border py-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>No statements generated</p>
          <p className="text-sm">Generate a statement to see transaction history</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {/* Statement List */}
          <div className="space-y-2">
            {statements.map((stmt: StatementHistoryRecord) => (
              <button
                key={stmt.id}
                onClick={() => onSelectStatement(stmt.id)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  selectedStatement?.id === stmt.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                )}
              >
                <p className="font-medium">
                  {format(new Date(stmt.startDate), 'dd MMM')} -{' '}
                  {format(new Date(stmt.endDate), 'dd MMM yyyy')}
                </p>
                <p className="text-muted-foreground text-sm">
                  <FormatAmount amount={stmt.closingBalance} />
                </p>
                {stmt.sentAt && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Emailed
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="col-span-3">
            {selectedStatement && (
              <StatementPreview
                statement={selectedStatement}
                onEmail={() => onEmail(selectedStatement.id)}
                isEmailing={isEmailing}
              />
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <GenerateStatementDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onGenerate={handleGenerateSuccess}
        isGenerating={isGenerating}
      />
    </div>
  );
});
