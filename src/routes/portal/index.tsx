import { createFileRoute } from '@tanstack/react-router';
import { usePortalOrders, usePortalJobs, usePortalQuotes } from '@/hooks/portal';
import { PageLayout } from '@/components/layout/page-layout';

export const Route = createFileRoute('/portal/')({
  component: PortalHome,
});

function PortalHome() {
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = usePortalOrders();
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = usePortalJobs();
  const { data: quotes = [], isLoading: quotesLoading, error: quotesError } = usePortalQuotes();

  const isLoading = ordersLoading || jobsLoading || quotesLoading;
  const error = ordersError || jobsError || quotesError;

  if (isLoading) {
    return (
      <PageLayout variant="container">
        <div className="text-muted-foreground py-12 text-sm">Loading portal data...</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout variant="container">
        <div className="py-12 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </div>
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
        {orders.length === 0 ? (
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
        {jobs.length === 0 ? (
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
        {quotes.length === 0 ? (
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
