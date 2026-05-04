/**
 * Revenue Recognition Server Functions
 *
 * Facades only: auth + schema + delegation to revenue recognition helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import { withAuth } from '@/lib/server/protected';
import {
  createDeferredRevenueSchema,
  getDeferredRevenueBalanceSchema,
  getOrderDeferredRevenueSchema,
  getOrderRecognitionsSchema,
  getRecognitionSummarySchema,
  listRecognitionsByStateSchema,
  recognizeRevenueSchema,
  releaseDeferredRevenueSchema,
  retryRecognitionSyncSchema,
  syncRecognitionToXeroSchema,
} from '@/lib/schemas';
import {
  createDeferredRevenueRecord,
  recognizeRevenueRecord,
  releaseDeferredRevenueRecord,
} from './_shared/revenue-recognition-mutations';
import {
  readDeferredRevenueBalance,
  readOrderDeferredRevenue,
  readOrderRecognitions,
  readRecognitionSummary,
  readRecognitionsByState,
} from './_shared/revenue-recognition-read';
import { syncRevenueRecognitionToXero } from './_shared/revenue-recognition-xero-sync';

export const recognizeRevenue = createServerFn({ method: 'POST' })
  .inputValidator(recognizeRevenueSchema)
  .handler(async ({ data }) => recognizeRevenueRecord(await withAuth(), data));

export const createDeferredRevenue = createServerFn({ method: 'POST' })
  .inputValidator(createDeferredRevenueSchema)
  .handler(async ({ data }) =>
    createDeferredRevenueRecord(await withAuth(), data),
  );

export const releaseDeferredRevenue = createServerFn({ method: 'POST' })
  .inputValidator(releaseDeferredRevenueSchema)
  .handler(async ({ data }) =>
    releaseDeferredRevenueRecord(await withAuth(), data),
  );

export const syncRecognitionToXero = createServerFn({ method: 'POST' })
  .inputValidator(syncRecognitionToXeroSchema)
  .handler(async ({ data }) =>
    syncRevenueRecognitionToXero(await withAuth(), data),
  );

export const retryRecognitionSync = createServerFn({ method: 'POST' })
  .inputValidator(retryRecognitionSyncSchema)
  .handler(async ({ data }) =>
    syncRevenueRecognitionToXero(await withAuth(), {
      recognitionId: data.recognitionId,
      force: true,
    }),
  );

export const getOrderRecognitions = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getOrderRecognitionsSchema))
  .handler(async ({ data }) => readOrderRecognitions(await withAuth(), data));

export const getOrderDeferredRevenue = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getOrderDeferredRevenueSchema))
  .handler(async ({ data }) =>
    readOrderDeferredRevenue(await withAuth(), data),
  );

export const listRecognitionsByState = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(listRecognitionsByStateSchema))
  .handler(async ({ data }) => readRecognitionsByState(await withAuth(), data));

export const getRecognitionSummary = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getRecognitionSummarySchema))
  .handler(async ({ data }) => readRecognitionSummary(await withAuth(), data));

export const getDeferredRevenueBalance = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getDeferredRevenueBalanceSchema))
  .handler(async ({ data }) =>
    readDeferredRevenueBalance(await withAuth(), data),
  );
