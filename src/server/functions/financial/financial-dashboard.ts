/**
 * Financial Dashboard Server Functions
 *
 * Facades only: auth + schema + delegation to financial read models.
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import {
  financialDashboardQuerySchema,
  revenueByPeriodQuerySchema,
  topCustomersQuerySchema,
  outstandingInvoicesQuerySchema,
} from '@/lib/schemas';
import { readFinancialCloseReadiness } from './_shared/financial-close-readiness';
import {
  readFinancialDashboardMetrics,
  readOutstandingInvoices,
  readRevenueByPeriod,
  readTopCustomersByRevenue,
} from './_shared/financial-dashboard-read';

export const getFinancialCloseReadiness = createServerFn({
  method: 'GET',
}).handler(async () => readFinancialCloseReadiness(await withAuth()));

export const getFinancialDashboardMetrics = createServerFn({ method: 'GET' })
  .inputValidator(financialDashboardQuerySchema)
  .handler(async ({ data }) =>
    readFinancialDashboardMetrics(await withAuth(), data),
  );

export const getRevenueByPeriod = createServerFn({ method: 'GET' })
  .inputValidator(revenueByPeriodQuerySchema)
  .handler(async ({ data }) => readRevenueByPeriod(await withAuth(), data));

export const getTopCustomersByRevenue = createServerFn({ method: 'GET' })
  .inputValidator(topCustomersQuerySchema)
  .handler(async ({ data }) =>
    readTopCustomersByRevenue(await withAuth(), data),
  );

export const getOutstandingInvoices = createServerFn({ method: 'GET' })
  .inputValidator(outstandingInvoicesQuerySchema)
  .handler(async ({ data }) => readOutstandingInvoices(await withAuth(), data));
