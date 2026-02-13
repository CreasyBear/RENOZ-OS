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
import { FileText, ChevronDown } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLayout } from '@/components/layout';
import { FinancialCommandBar } from '@/components/domain/financial/landing';

export default function FinancialLandingPage() {
  return (
    <PageLayout variant="full-width">
      {/* Zone 1: Header */}
      <PageLayout.Header
        title="Financial"
        description="Accounts receivable, revenue recognition, and payment management"
        actions={
          <>
            {/* Primary CTA: View Invoices */}
            <Link
              to="/financial/invoices"
              className={buttonVariants({ size: 'sm' })}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Invoices
            </Link>

            {/* Secondary Actions - preserves workflows previously in nav grid */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="p-0">
                  <Link to="/financial/analytics" className="flex w-full items-center px-2 py-1.5">View Analytics</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link to="/financial/ar-aging" className="flex w-full items-center px-2 py-1.5">AR Aging Report</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link to="/reports/financial" className="flex w-full items-center px-2 py-1.5">Financial Summary</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link to="/financial/credit-notes" className="flex w-full items-center px-2 py-1.5">Credit Notes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link to="/financial/payment-plans" className="flex w-full items-center px-2 py-1.5">Payment Plans</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <PageLayout.Content>
        {/* Zone 2: Command Bar */}
        <div className="mb-6">
          <FinancialCommandBar />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
