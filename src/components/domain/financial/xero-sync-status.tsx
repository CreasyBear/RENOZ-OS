import { memo, useMemo, type MouseEvent } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  PanelRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicLink } from '@/components/ui/dynamic-link';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormatAmount } from '@/components/shared/format';
import { cn } from '@/lib/utils';
import type {
  InvoiceWithSyncStatus,
  InvoiceXeroStatus,
  XeroSyncStatus as SyncStatus,
} from '@/lib/schemas';
import { xeroSyncStatusSchema } from '@/lib/schemas';
import type {
  XeroIntegrationStatus,
  XeroPaymentEventRecord,
  XeroSyncIssue,
} from '@/lib/schemas/settings/xero-sync';

export interface XeroSyncStatusProps {
  invoices: InvoiceWithSyncStatus[];
  isLoading: boolean;
  error?: unknown;
  activeTab: SyncStatus | 'all';
  onTabChange: (tab: SyncStatus | 'all') => void;
  consoleView: 'invoice_sync' | 'payment_events';
  onConsoleViewChange: (view: 'invoice_sync' | 'payment_events') => void;
  onResync: (orderId: string) => void;
  resyncingId: string | null;
  integration?: XeroIntegrationStatus | null;
  paymentEvents?: XeroPaymentEventRecord[];
  paymentEventsLoading?: boolean;
  selectedOrderId?: string | null;
  selectedInvoice?: InvoiceXeroStatus | null;
  selectedInvoiceLoading?: boolean;
  onSelectInvoice: (orderId: string | null) => void;
  selectedPaymentEventId?: string | null;
  onSelectPaymentEvent: (eventId: string | null) => void;
  className?: string;
}

const statusConfig: Record<
  SyncStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
  }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  syncing: { label: 'Syncing', variant: 'default', icon: Loader2 },
  synced: { label: 'Synced', variant: 'outline', icon: CheckCircle },
  error: { label: 'Needs action', variant: 'destructive', icon: AlertTriangle },
};

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={cn('h-3 w-3', status === 'syncing' && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}

function PaymentEventStateBadge({ state }: { state: XeroPaymentEventRecord['resultState'] }) {
  const variant =
    state === 'applied' ? 'outline' : state === 'duplicate' ? 'secondary' : 'destructive';

  return <Badge variant={variant}>{state.replace(/_/g, ' ')}</Badge>;
}

function parseSearchParams(href: string): Record<string, string> | undefined {
  const url = new URL(href, 'http://dummy.local');
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return Object.keys(params).length > 0 ? params : undefined;
}

function getIssueLabel(issue: XeroSyncIssue | null | undefined) {
  return issue?.title ?? 'No blocker';
}

function getIssueSeverityBadge(issue: XeroSyncIssue | null | undefined) {
  if (!issue) {
    return null;
  }

  const variant =
    issue.severity === 'critical'
      ? 'destructive'
      : issue.severity === 'warning'
        ? 'secondary'
        : 'outline';

  return <Badge variant={variant}>{issue.severity}</Badge>;
}

function getIssueActionHref(
  issue: XeroSyncIssue | null | undefined,
  options: {
    orderId?: string | null;
    customerId?: string | null;
    xeroInvoiceUrl?: string | null;
  }
): string | null {
  switch (issue?.primaryAction.action ?? issue?.nextAction) {
    case 'connect_xero':
    case 'reconnect_xero':
      return '/?settingsOpen=integrations';
    case 'map_customer_contact':
      return options.customerId ? `/customers/${options.customerId}/edit` : null;
    case 'open_org_settings':
      return '/settings/organization';
    case 'view_reconciled_invoice':
      return options.xeroInvoiceUrl ?? null;
    case 'review_validation':
      return options.orderId ? `/orders/${options.orderId}` : null;
    default:
      return null;
  }
}

function getSecondaryActionHref(
  issue: XeroSyncIssue | null | undefined,
  options: {
    orderId?: string | null;
    customerId?: string | null;
  }
): string | null {
  switch (issue?.secondaryAction?.action) {
    case 'map_customer_contact':
      return options.customerId ? `/customers/${options.customerId}/edit` : null;
    case 'review_validation':
      return options.orderId ? `/orders/${options.orderId}` : null;
    case 'reconnect_xero':
      return '/?settingsOpen=integrations';
    case 'open_org_settings':
      return '/settings/organization';
    default:
      return null;
  }
}

function canRetryInvoice(invoice: InvoiceWithSyncStatus, integration?: XeroIntegrationStatus | null) {
  if (!integration?.available || !invoice.canResync) {
    return false;
  }

  if (!invoice.issue) {
    return true;
  }

  return invoice.issue.retryPolicy === 'allowed';
}

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={cn('mt-1 text-2xl font-bold', accent && 'text-destructive')}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RetryPolicyHint({ issue }: { issue: XeroSyncIssue | null | undefined }) {
  if (!issue) {
    return null;
  }

  if (issue.retryPolicy === 'retry_after' && issue.retryAfterSeconds) {
    const retryAfterSeconds = issue.retryAfterSeconds;
    const retryLabel =
      retryAfterSeconds < 60
        ? `${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}`
        : `${Math.ceil(retryAfterSeconds / 60)} minute${Math.ceil(retryAfterSeconds / 60) === 1 ? '' : 's'}`
    return (
      <p className="text-xs text-muted-foreground">
        Retry available in about {retryLabel}.
      </p>
    );
  }

  if (issue.retryPolicy === 'blocked') {
    return <p className="text-xs text-muted-foreground">Retry is blocked until the blocker is resolved.</p>;
  }

  return <p className="text-xs text-muted-foreground">Retry is available after reviewing this invoice.</p>;
}

interface InvoiceRowProps {
  invoice: InvoiceWithSyncStatus;
  integration?: XeroIntegrationStatus | null;
  isSelected: boolean;
  isResyncing: boolean;
  onSelect: () => void;
  onResync: () => void;
}

function InvoiceRow({
  invoice,
  integration,
  isSelected,
  isResyncing,
  onSelect,
  onResync,
}: InvoiceRowProps) {
  const issue = invoice.issue;
  const actionHref = getIssueActionHref(issue, {
    orderId: invoice.orderId,
    customerId: invoice.customerId,
    xeroInvoiceUrl: invoice.xeroInvoiceUrl,
  });
  const retryAllowed = canRetryInvoice(invoice, integration);

  return (
    <TableRow
      className={cn('cursor-pointer align-top', isSelected && 'bg-muted/40')}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span>{invoice.orderNumber}</span>
          {isSelected ? <PanelRight className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        </div>
      </TableCell>
      <TableCell>{invoice.customerName}</TableCell>
      <TableCell>{format(new Date(invoice.orderDate), 'dd MMM yyyy')}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <SyncStatusBadge status={invoice.xeroSyncStatus} />
          {issue ? getIssueSeverityBadge(issue) : null}
        </div>
      </TableCell>
      <TableCell className="max-w-[320px]">
        <div className="space-y-1">
          <p className="font-medium">{getIssueLabel(issue)}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {issue?.message ?? 'No active blocker.'}
          </p>
          {issue?.retryPolicy === 'retry_after' && issue.retryAfterSeconds ? (
            <p className="text-xs text-muted-foreground">
              Retry after about {Math.ceil(issue.retryAfterSeconds / 60)} minute
              {issue.retryAfterSeconds >= 120 ? 's' : ''}.
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <FormatAmount amount={invoice.total} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}>
            Review
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onResync();
            }}
            disabled={!retryAllowed || isResyncing}
          >
            {isResyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Retry
          </Button>
          {actionHref && issue?.primaryAction.label ? (
            issue.primaryAction.action === 'view_reconciled_invoice' ? (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={actionHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <DynamicLink
                to={actionHref.split('?')[0]}
                search={parseSearchParams(actionHref)}
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
                onClick={(event: MouseEvent<HTMLAnchorElement>) => event.stopPropagation()}
              >
                {issue.primaryAction.label}
              </DynamicLink>
            )
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function InvoiceRemediationSheet({
  invoice,
  loading,
  onClose,
  onResync,
  resyncingId,
  integration,
}: {
  invoice: InvoiceXeroStatus | null | undefined;
  loading?: boolean;
  onClose: () => void;
  onResync: (orderId: string) => void;
  resyncingId: string | null;
  integration?: XeroIntegrationStatus | null;
}) {
  const issue = invoice?.issue;
  const actionHref = getIssueActionHref(issue, {
    orderId: invoice?.orderId,
    customerId: invoice?.customerId,
    xeroInvoiceUrl: invoice?.xeroInvoiceUrl,
  });
  const secondaryActionHref = getSecondaryActionHref(issue, {
    orderId: invoice?.orderId,
    customerId: invoice?.customerId,
  });
  const retryAllowed = Boolean(
    invoice &&
      integration?.available &&
      invoice.xeroSyncStatus === 'error' &&
      issue?.retryPolicy === 'allowed'
  );

  return (
    <Sheet open={Boolean(invoice) || loading} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{invoice ? `Remediate ${invoice.orderNumber}` : 'Loading remediation context'}</SheetTitle>
          <SheetDescription>
            Review the blocker, confirm the affected customer and invoice context, then take the right next action.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : invoice ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Sync status</div>
                    <div className="mt-2 flex items-center gap-2">
                      <SyncStatusBadge status={invoice.xeroSyncStatus} />
                      {getIssueSeverityBadge(issue)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Current issue</div>
                    <div className="mt-2 font-semibold">{getIssueLabel(issue)}</div>
                  </CardContent>
                </Card>
              </div>

              <Alert variant={issue?.severity === 'critical' ? 'destructive' : 'default'}>
                {issue?.severity === 'critical' ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                <AlertTitle>{issue?.title ?? 'No blocker detected'}</AlertTitle>
                <AlertDescription>{issue?.message ?? 'This invoice is not currently blocked.'}</AlertDescription>
              </Alert>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Recommended next action</div>
                    <div className="font-medium">{issue?.primaryAction.label ?? 'No action required'}</div>
                  </div>
                  {issue?.retryPolicy === 'allowed' ? (
                    <Badge variant="outline">Retry available</Badge>
                  ) : issue?.retryPolicy === 'retry_after' ? (
                    <Badge variant="secondary">Retry later</Badge>
                  ) : (
                    <Badge variant="destructive">Blocked</Badge>
                  )}
                </div>
                <RetryPolicyHint issue={issue} />
                <div className="flex flex-wrap gap-2">
                  {actionHref && issue?.primaryAction.label ? (
                    issue.primaryAction.action === 'view_reconciled_invoice' ? (
                      <Button asChild>
                        <a href={actionHref} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {issue.primaryAction.label}
                        </a>
                      </Button>
                    ) : (
                      <Button asChild>
                        <DynamicLink to={actionHref.split('?')[0]} search={parseSearchParams(actionHref)}>
                          {issue.primaryAction.label}
                        </DynamicLink>
                      </Button>
                    )
                  ) : null}
                  {secondaryActionHref && issue?.secondaryAction?.label ? (
                    <Button variant="outline" asChild>
                      <DynamicLink
                        to={secondaryActionHref.split('?')[0]}
                        search={parseSearchParams(secondaryActionHref)}
                      >
                        {issue.secondaryAction.label}
                      </DynamicLink>
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => invoice && onResync(invoice.orderId)}
                    disabled={!retryAllowed || resyncingId === invoice.orderId}
                  >
                    {resyncingId === invoice.orderId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Retry sync
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Invoice context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Order</span>
                      <Link to="/orders/$orderId" params={{ orderId: invoice.orderId }} className="font-medium hover:underline">
                        {invoice.orderNumber}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Last sync</span>
                      <span>{invoice.lastXeroSyncAt ? format(new Date(invoice.lastXeroSyncAt), 'dd MMM yyyy HH:mm') : 'Never'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Xero invoice ID</span>
                      <span className="font-mono text-xs">{invoice.xeroInvoiceId ?? 'Not linked'}</span>
                    </div>
                    {invoice.xeroInvoiceUrl ? (
                      <Button variant="link" className="h-auto p-0" asChild>
                        <a href={invoice.xeroInvoiceUrl} target="_blank" rel="noreferrer">
                          View in Xero
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer mapping</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Customer</span>
                      {invoice.customerId ? (
                        <Link
                          to="/customers/$customerId/edit"
                          params={{ customerId: invoice.customerId }}
                          className="font-medium hover:underline"
                        >
                          Open customer
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">xeroContactId</span>
                      <span className="font-mono text-xs">
                        {invoice.customerXeroContactId ?? 'Missing trusted mapping'}
                      </span>
                    </div>
                    {invoice.customerId ? (
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link to="/customers/$customerId/edit" params={{ customerId: invoice.customerId }}>
                          Open customer mapping
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PaymentEventSheet({
  event,
  onClose,
}: {
  event: XeroPaymentEventRecord | null | undefined;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(event)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{event?.outcomeTitle ?? 'Payment event'}</SheetTitle>
          <SheetDescription>
            Review replay-safe payment handling, linked order context, and the exact dedupe key used.
          </SheetDescription>
        </SheetHeader>

        {event ? (
          <div className="mt-6 space-y-6">
            <Alert variant={event.resultState === 'applied' || event.resultState === 'duplicate' ? 'default' : 'destructive'}>
              <AlertTitle>{event.outcomeTitle}</AlertTitle>
              <AlertDescription>{event.outcomeMessage}</AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Event status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">State</span>
                    <PaymentEventStateBadge state={event.resultState} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Processed</span>
                    <span>{format(new Date(event.processedAt), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Amount</span>
                    <FormatAmount amount={event.amount} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identifiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Xero invoice</div>
                    <div className="font-mono text-xs">{event.xeroInvoiceId}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Payment ID / dedupe key</div>
                    <div className="font-mono text-xs break-all">{event.paymentId ?? event.dedupeKey}</div>
                  </div>
                  {event.orderId ? (
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link to="/orders/$orderId" params={{ orderId: event.orderId }}>
                        Open linked order
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payload summary</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(event.payloadSummary, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export const XeroSyncStatus = memo(function XeroSyncStatus({
  invoices,
  isLoading,
  error,
  activeTab,
  onTabChange,
  consoleView,
  onConsoleViewChange,
  onResync,
  resyncingId,
  integration,
  paymentEvents = [],
  paymentEventsLoading = false,
  selectedOrderId,
  selectedInvoice,
  selectedInvoiceLoading = false,
  onSelectInvoice,
  selectedPaymentEventId,
  onSelectPaymentEvent,
  className,
}: XeroSyncStatusProps) {
  const summary = useMemo(() => {
    const blockerMap = new Map<string, { label: string; count: number; nextActionLabel: string | null }>();

    for (const invoice of invoices) {
      if (!invoice.issue) {
        continue;
      }

      const current = blockerMap.get(invoice.issue.code);
      blockerMap.set(invoice.issue.code, {
        label: getIssueLabel(invoice.issue),
        count: (current?.count ?? 0) + 1,
        nextActionLabel: invoice.issue.primaryAction.label ?? invoice.issue.nextActionLabel,
      });
    }

    return Array.from(blockerMap.entries()).map(([code, item]) => ({
      code,
      ...item,
    }));
  }, [invoices]);

  const selectedPaymentEvent = useMemo(
    () => paymentEvents.find((event) => event.id === selectedPaymentEventId) ?? null,
    [paymentEvents, selectedPaymentEventId]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className={cn('p-4 text-destructive', className)}>Failed to load Xero sync status</div>;
  }

  const pendingCount = invoices.filter((invoice) => invoice.xeroSyncStatus === 'pending').length;
  const syncingCount = invoices.filter((invoice) => invoice.xeroSyncStatus === 'syncing').length;
  const syncedCount = invoices.filter((invoice) => invoice.xeroSyncStatus === 'synced').length;
  const needsActionCount = invoices.filter(
    (invoice) => invoice.issue && invoice.issue.retryPolicy !== 'blocked'
      ? invoice.xeroSyncStatus === 'error'
      : invoice.xeroSyncStatus === 'error'
  ).length;
  const paymentAnomaliesCount = paymentEvents.filter((event) => event.resultState !== 'applied').length;

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {integration?.available ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            Xero remediation console
          </CardTitle>
          <CardDescription>
            Operator-first sync triage for invoice blockers, replay-safe payments, and in-app remediation shortcuts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={integration?.available ? 'default' : 'destructive'}>
            {integration?.available ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertTitle>{integration?.available ? 'Xero connected' : 'Xero needs attention'}</AlertTitle>
            <AlertDescription>
              {integration?.message ?? 'Xero integration status is unavailable.'}
              {integration?.tenantLabel ? ` Active tenant: ${integration.tenantLabel}` : ''}
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="Pending" value={pendingCount} />
            <SummaryCard label="Syncing" value={syncingCount} />
            <SummaryCard label="Synced" value={syncedCount} />
            <SummaryCard label="Needs action now" value={needsActionCount} accent />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {summary.map((item) => (
              <div key={item.code} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{item.label}</div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {item.nextActionLabel ? `Next action: ${item.nextActionLabel}` : 'Review the affected invoices.'}
                </div>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">Payment webhook anomalies</div>
                <Badge variant={paymentAnomaliesCount > 0 ? 'secondary' : 'outline'}>
                  {paymentAnomaliesCount}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Duplicate, rejected, and unresolved payment events stay visible here for audit confidence.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={consoleView} onValueChange={(value) => value === 'payment_events' ? onConsoleViewChange('payment_events') : onConsoleViewChange('invoice_sync')}>
        <TabsList>
          <TabsTrigger value="invoice_sync">Invoice sync</TabsTrigger>
          <TabsTrigger value="payment_events">Payment events</TabsTrigger>
        </TabsList>
      </Tabs>

      {consoleView === 'invoice_sync' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice sync blockers</CardTitle>
            <CardDescription>
              Select a row to open remediation details, then retry only when the blocker is actually resolved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (value === 'all') {
                  onTabChange('all');
                  return;
                }

                const parsed = xeroSyncStatusSchema.safeParse(value);
                if (parsed.success) {
                  onTabChange(parsed.data);
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="error">Needs action</TabsTrigger>
                <TabsTrigger value="synced">Synced</TabsTrigger>
              </TabsList>
            </Tabs>

            {invoices.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No invoices match the current Xero console filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[280px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <InvoiceRow
                      key={invoice.orderId}
                      invoice={invoice}
                      integration={integration}
                      isSelected={selectedOrderId === invoice.orderId}
                      isResyncing={resyncingId === invoice.orderId}
                      onSelect={() => onSelectInvoice(invoice.orderId)}
                      onResync={() => onResync(invoice.orderId)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5" />
              Payment event audit
            </CardTitle>
            <CardDescription>
              Review applied payments, replay-safe duplicates, and events that still need operator awareness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentEventsLoading ? (
              <div className="flex items-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading payment event audit...
              </div>
            ) : paymentEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No recent Xero payment events recorded.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processed</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Linked order</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className={cn('cursor-pointer', selectedPaymentEventId === event.id && 'bg-muted/40')}
                      onClick={() => onSelectPaymentEvent(event.id)}
                    >
                      <TableCell>{format(new Date(event.processedAt), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <PaymentEventStateBadge state={event.resultState} />
                          <p className="text-xs text-muted-foreground">{event.outcomeTitle}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.xeroInvoiceId}</TableCell>
                      <TableCell className="text-right">
                        <FormatAmount amount={event.amount} />
                      </TableCell>
                      <TableCell>
                        {event.orderId ? (
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: event.orderId }}
                          className="text-primary hover:underline"
                          onClick={(evt: MouseEvent<HTMLAnchorElement>) => evt.stopPropagation()}
                        >
                            View order
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            onSelectPaymentEvent(event.id);
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <InvoiceRemediationSheet
        invoice={selectedInvoice}
        loading={selectedInvoiceLoading}
        onClose={() => onSelectInvoice(null)}
        onResync={onResync}
        resyncingId={resyncingId}
        integration={integration}
      />
      <PaymentEventSheet event={selectedPaymentEvent} onClose={() => onSelectPaymentEvent(null)} />
    </div>
  );
});
