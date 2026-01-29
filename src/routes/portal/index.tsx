import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  listPortalJobs,
  listPortalOrders,
  listPortalQuotes,
} from '@/server/functions/portal/portal-read';
import { PageLayout } from '@/components/layout/page-layout';

export const Route = createFileRoute('/portal/')({
  component: PortalHome,
});

type PortalState = 'loading' | 'ready' | 'error';

function PortalHome() {
  const fetchOrders = useServerFn(listPortalOrders);
  const fetchJobs = useServerFn(listPortalJobs);
  const fetchQuotes = useServerFn(listPortalQuotes);

  const [state, setState] = useState<PortalState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [quotes, setQuotes] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [ordersResult, jobsResult, quotesResult] = await Promise.all([
          fetchOrders({ data: { page: 1, pageSize: 10 } }),
          fetchJobs({ data: { page: 1, pageSize: 10 } }),
          fetchQuotes({ data: { page: 1, pageSize: 10 } }),
        ]);

        if (!isMounted) return;

        setOrders(ordersResult as Array<Record<string, unknown>>);
        setJobs(jobsResult as Array<Record<string, unknown>>);
        setQuotes(quotesResult as Array<Record<string, unknown>>);
        setState('ready');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load portal data');
        setState('error');
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchOrders, fetchJobs, fetchQuotes]);

  if (state === 'loading') {
    return (
      <PageLayout variant="container">
        <div className="text-muted-foreground py-12 text-sm">Loading portal data...</div>
      </PageLayout>
    );
  }

  if (state === 'error') {
    return (
      <PageLayout variant="container">
        <div className="py-12 text-sm text-destructive">{errorMessage ?? 'Something went wrong.'}</div>
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
