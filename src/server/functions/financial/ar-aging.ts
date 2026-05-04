/**
 * AR Aging Server Functions
 *
 * Facades only: auth + schema + delegation to AR aging read helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import {
  arAgingReportQuerySchema,
  arAgingCustomerDetailQuerySchema,
} from '@/lib/schemas';
import {
  readARAgingCustomerDetail,
  readARAgingReport,
} from './_shared/ar-aging-read';

export const getARAgingReport = createServerFn({ method: 'GET' })
  .inputValidator(arAgingReportQuerySchema)
  .handler(async ({ data }) => readARAgingReport(await withAuth(), data));

export const getARAgingCustomerDetail = createServerFn({ method: 'GET' })
  .inputValidator(arAgingCustomerDetailQuerySchema)
  .handler(async ({ data }) =>
    readARAgingCustomerDetail(await withAuth(), data),
  );
