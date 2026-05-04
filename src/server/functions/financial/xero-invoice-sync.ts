/**
 * Xero Invoice Sync Server Functions
 *
 * Facades only: auth + schema + delegation to Xero invoice helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  getInvoiceXeroStatusSchema,
  listInvoicesBySyncStatusSchema,
  resyncInvoiceSchema,
  syncInvoiceToXeroSchema,
  xeroPaymentUpdateSchema,
} from '@/lib/schemas';
import { syncInvoiceToXeroCommand } from './_shared/xero-invoice-sync-command';
import {
  readInvoiceXeroStatus,
  readInvoicesBySyncStatus,
} from './_shared/xero-invoice-status-read';
import { applyXeroPaymentUpdate } from './_shared/xero-payment-reconciliation';

export const syncInvoiceToXero = createServerFn({ method: 'POST' })
  .inputValidator(syncInvoiceToXeroSchema)
  .handler(async ({ data }) =>
    syncInvoiceToXeroCommand(
      await withAuth({ permission: PERMISSIONS.financial.update }),
      data,
    ),
  );

export const resyncInvoiceToXero = createServerFn({ method: 'POST' })
  .inputValidator(resyncInvoiceSchema)
  .handler(async ({ data }) =>
    syncInvoiceToXeroCommand(
      await withAuth({ permission: PERMISSIONS.financial.update }),
      { orderId: data.orderId, force: true },
    ),
  );

export const handleXeroPaymentUpdate = createServerFn({ method: 'POST' })
  .inputValidator(xeroPaymentUpdateSchema)
  .handler(async ({ data }) => applyXeroPaymentUpdate(data));

export {
  applyXeroPaymentUpdate,
  applyXeroPaymentWebhookEvent,
  processXeroPaymentWebhookEvents,
} from './_shared/xero-payment-reconciliation';

export const getInvoiceXeroStatus = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getInvoiceXeroStatusSchema))
  .handler(async ({ data }) => readInvoiceXeroStatus(await withAuth(), data));

export const listInvoicesBySyncStatus = createServerFn({ method: 'GET' })
  .inputValidator(listInvoicesBySyncStatusSchema)
  .handler(async ({ data }) =>
    readInvoicesBySyncStatus(await withAuth(), data),
  );
