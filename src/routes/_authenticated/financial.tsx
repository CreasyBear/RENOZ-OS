import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import {
  BarChart3,
  Bell,
  CalendarDays,
  FileText,
  HandCoins,
  Landmark,
  LineChart,
  ReceiptText,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const financialNavItems = [
  { label: 'Workbench', to: '/financial', icon: Landmark },
  { label: 'Invoices', to: '/financial/invoices', icon: FileText },
  { label: 'AR Aging', to: '/financial/ar-aging', icon: ReceiptText },
  { label: 'Payment Plans', to: '/financial/payment-plans', icon: CalendarDays },
  { label: 'Reminders', to: '/financial/reminders', icon: Bell },
  { label: 'Credit Notes', to: '/financial/credit-notes', icon: HandCoins },
  { label: 'Xero Sync', to: '/financial/xero-sync', icon: RefreshCw },
  { label: 'Analytics', to: '/financial/analytics', icon: BarChart3 },
  { label: 'Revenue', to: '/financial/revenue', icon: LineChart },
  { label: 'Statements', to: '/financial/statements', icon: ScrollText },
] as const;

export const Route = createFileRoute('/_authenticated/financial')({
  component: FinancialLayout,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});

function FinancialLayout() {
  const location = useLocation();

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial"
        description="Collections, invoice truth, Xero exceptions, and revenue analytics"
        actions={
          <Link
            to="/financial/invoices"
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Invoices
          </Link>
        }
      />
      <PageLayout.Content className="space-y-6">
        <nav
          aria-label="Financial sections"
          className="flex gap-2 overflow-x-auto border-b pb-3"
        >
          {financialNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/financial'
                ? location.pathname === '/financial'
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }),
                  'shrink-0'
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </PageLayout.Content>
    </PageLayout>
  );
}
