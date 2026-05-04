import { createFileRoute } from '@tanstack/react-router';
import { usePortalOrders, usePortalJobs, usePortalQuotes } from '@/hooks/portal';
import { PageLayout } from '@/components/layout/page-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const Route = createFileRoute('/portal/')({
  component: PortalHome,
});

function PortalHome() {
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = usePortalOrders();
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = usePortalJobs();
  const { data: quotesData, isLoading: quotesLoading, error: quotesError } = usePortalQuotes();

  const orders = ordersData ?? [];
  const jobs = jobsData ?? [];
  const quotes = quotesData ?? [];
  const hasAnyData = ordersData !== undefined || jobsData !== undefined || quotesData !== undefined;

  if (!hasAnyData && (ordersLoading || jobsLoading || quotesLoading)) {
    return (
      <PageLayout variant="container">
        <div className="text-muted-foreground py-12 text-sm">Loading portal data...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="container">
      <div className="space-y-8 py-6">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Portal Overview</h1>
        <p className="text-muted-foreground text-sm">
          Recent orders, jobs, and quotes for your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Orders</h2>
        {ordersError ? (
          <Alert>
            <AlertTitle>Orders unavailable</AlertTitle>
            <AlertDescription>
              {ordersData !== undefined
                ? 'Showing the most recent portal orders while refresh is unavailable.'
                : ordersError.message}
            </AlertDescription>
          </Alert>
        ) : null}
        {ordersError && ordersData === undefined ? null : orders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No orders available.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {orders.map((order) => (
              <li key={String(order.id)} className="rounded border px-3 py-2">
                <div className="font-medium">{order.orderNumber as string}</div>
                <div className="text-muted-foreground text-xs">
                  Status: {order.status as string}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Jobs</h2>
        {jobsError ? (
          <Alert>
            <AlertTitle>Jobs unavailable</AlertTitle>
            <AlertDescription>
              {jobsData !== undefined
                ? 'Showing the most recent portal jobs while refresh is unavailable.'
                : jobsError.message}
            </AlertDescription>
          </Alert>
        ) : null}
        {jobsError && jobsData === undefined ? null : jobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No jobs available.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {jobs.map((job) => (
              <li key={String(job.id)} className="rounded border px-3 py-2">
                <div className="font-medium">{job.jobNumber as string}</div>
                <div className="text-muted-foreground text-xs">Status: {job.status as string}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Quotes</h2>
        {quotesError ? (
          <Alert>
            <AlertTitle>Quotes unavailable</AlertTitle>
            <AlertDescription>
              {quotesData !== undefined
                ? 'Showing the most recent portal quotes while refresh is unavailable.'
                : quotesError.message}
            </AlertDescription>
          </Alert>
        ) : null}
        {quotesError && quotesData === undefined ? null : quotes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No quotes available.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {quotes.map((quote) => (
              <li key={String(quote.id)} className="rounded border px-3 py-2">
                <div className="font-medium">{quote.quoteNumber as string}</div>
                <div className="text-muted-foreground text-xs">
                  Status: {quote.status as string}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </PageLayout>
  );
}
