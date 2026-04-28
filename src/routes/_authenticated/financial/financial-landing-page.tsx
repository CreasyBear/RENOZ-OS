/**
 * Financial Landing Page Component
 *
 * Landing page for Financial domain following DOMAIN-LANDING-STANDARDS.md.
 * Implements 3-zone layout: Header, Command Bar, Navigation Grid.
 *
 * Primary CTA: View Invoices (most common action)
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  FileText,
  HandCoins,
  ReceiptText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { FinancialCommandBar, FinancialTriage } from '@/components/domain/financial/landing';
import { cn } from '@/lib/utils';

const workbenchLinks = [
  {
    title: 'Collect Invoices',
    description: 'Work the invoice list by overdue, partially paid, and customer filters.',
    href: '/financial/invoices',
    icon: FileText,
  },
  {
    title: 'AR Aging',
    description: 'Find balance risk by customer and aging bucket.',
    href: '/financial/ar-aging',
    icon: ReceiptText,
  },
  {
    title: 'Payment Plans',
    description: 'Review installments and payment promises that need follow-up.',
    href: '/financial/payment-plans',
    icon: CalendarDays,
  },
  {
    title: 'Payment Reminders',
    description: 'Send and audit reminder workflows for overdue balances.',
    href: '/financial/reminders',
    icon: Bell,
  },
  {
    title: 'Credit Notes',
    description: 'Issue, apply, and inspect credits before they distort receivables.',
    href: '/financial/credit-notes',
    icon: HandCoins,
  },
  {
    title: 'Xero Exceptions',
    description: 'Fix stale or failed invoice/payment syncs before month close.',
    href: '/financial/xero-sync',
    icon: RefreshCw,
  },
  {
    title: 'Analytics',
    description: 'Use trend charts after the operational queues are under control.',
    href: '/financial/analytics',
    icon: BarChart3,
  },
] as const;

export default function FinancialLandingPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Work Financial Exceptions First</h2>
        </div>
        <FinancialTriage maxItems={6} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Find an Invoice, Customer, or Order</h2>
        <FinancialCommandBar />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workbenchLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href}>
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  to={item.href}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Open
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
