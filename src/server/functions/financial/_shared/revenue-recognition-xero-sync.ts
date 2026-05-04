/**
 * Revenue recognition Xero sync helper.
 */

import { setResponseStatus } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customers as customersTable,
  orders,
  organizations,
  revenueRecognition,
} from 'drizzle/schema';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import type { SessionContext } from '@/lib/server/protected';
import { syncRecognitionToXeroSchema } from '@/lib/schemas';
import { safeNumber } from '@/lib/numeric';
import {
  findManualJournalByReference,
  getXeroErrorMessage,
  getXeroSyncReadiness,
  syncManualJournalWithXero,
} from '../xero-adapter';
import type { z } from 'zod';

const MAX_SYNC_RETRIES = 5;

interface RevenueRecognitionXeroSettings {
  xeroRevenueRecognitionRevenueAccount?: string;
  xeroRevenueRecognitionDeferredAccount?: string;
}

function formatRecognitionReference(
  recognitionId: string,
  orderNumber: string | null,
): string {
  return `REVREC-${orderNumber ?? 'ORDER'}-${recognitionId.slice(0, 8)}`;
}

function getRecognitionJournalAccounts(
  settings: RevenueRecognitionXeroSettings | null | undefined,
): { revenueAccount: string; deferredAccount: string } {
  const revenueAccount = settings?.xeroRevenueRecognitionRevenueAccount?.trim();
  const deferredAccount =
    settings?.xeroRevenueRecognitionDeferredAccount?.trim();

  if (!revenueAccount || !deferredAccount) {
    throw new ValidationError(
      'Xero revenue recognition accounts are not configured. Set xeroRevenueRecognitionRevenueAccount and xeroRevenueRecognitionDeferredAccount in organization settings before syncing.',
    );
  }

  return { revenueAccount, deferredAccount };
}

export async function syncRevenueRecognitionToXero(
  ctx: SessionContext,
  data: z.infer<typeof syncRecognitionToXeroSchema>,
) {
  const { recognitionId, force } = data;

  // Get recognition record
  const [recognition] = await db
    .select({
      id: revenueRecognition.id,
      state: revenueRecognition.state,
      recognitionType: revenueRecognition.recognitionType,
      milestoneName: revenueRecognition.milestoneName,
      recognizedAmount: revenueRecognition.recognizedAmount,
      recognitionDate: revenueRecognition.recognitionDate,
      xeroJournalId: revenueRecognition.xeroJournalId,
      xeroSyncAttempts: revenueRecognition.xeroSyncAttempts,
      orderId: revenueRecognition.orderId,
      orderNumber: orders.orderNumber,
      customerId: customersTable.id,
      customerName: customersTable.name,
    })
    .from(revenueRecognition)
    .innerJoin(orders, eq(revenueRecognition.orderId, orders.id))
    .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
    .where(
      and(
        eq(revenueRecognition.id, recognitionId),
        eq(revenueRecognition.organizationId, ctx.organizationId),
      ),
    );

  if (!recognition) {
    setResponseStatus(404);
    throw new NotFoundError(
      'Recognition record not found',
      'revenueRecognition',
    );
  }

  // Check if already synced
  if (recognition.state === 'synced' && recognition.xeroJournalId && !force) {
    return {
      success: true,
      xeroJournalId: recognition.xeroJournalId,
      state: recognition.state,
      integrationAvailable: true,
    };
  }

  // Check if manual override required
  if (recognition.state === 'manual_override') {
    throw new ValidationError(
      'Recognition requires manual override. Please resolve in Xero.',
    );
  }

  const readiness = await getXeroSyncReadiness(ctx.organizationId);
  if (!readiness.available) {
    return {
      success: false,
      error: readiness.message ?? 'Xero integration unavailable',
      state: recognition.state,
      integrationAvailable: false,
    };
  }

  const [org] = await db
    .select({
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1);

  let journalAccounts: { revenueAccount: string; deferredAccount: string };
  try {
    journalAccounts = getRecognitionJournalAccounts(
      (org?.settings as RevenueRecognitionXeroSettings | null | undefined) ??
        null,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown sync error';
    await db
      .update(revenueRecognition)
      .set({
        xeroSyncError: errorMessage,
        lastXeroSyncAt: new Date(),
      })
      .where(
        and(
          eq(revenueRecognition.id, recognitionId),
          eq(revenueRecognition.organizationId, ctx.organizationId),
        ),
      );

    return {
      success: false,
      error: errorMessage,
      state: recognition.state,
      integrationAvailable: readiness.available,
    };
  }

  // Update to syncing — orgId for defense-in-depth
  await db
    .update(revenueRecognition)
    .set({
      state: 'syncing',
      lastXeroSyncAt: new Date(),
    })
    .where(
      and(
        eq(revenueRecognition.id, recognitionId),
        eq(revenueRecognition.organizationId, ctx.organizationId),
      ),
    );

  try {
    const reference = formatRecognitionReference(
      recognition.id,
      recognition.orderNumber,
    );
    const milestoneLabel =
      recognition.milestoneName?.trim() || recognition.recognitionType;
    const customerLabel = recognition.customerName?.trim() || 'Customer';
    const recognizedAmount = safeNumber(recognition.recognizedAmount);
    const lineDescription = `${milestoneLabel} revenue recognition for ${customerLabel}`;

    const existingManualJournal = await findManualJournalByReference(
      ctx.organizationId,
      reference,
    );
    if (existingManualJournal) {
      await db
        .update(revenueRecognition)
        .set({
          state: 'synced',
          xeroJournalId: existingManualJournal.manualJournalId,
          xeroSyncError: null,
          lastXeroSyncAt: new Date(),
        })
        .where(
          and(
            eq(revenueRecognition.id, recognitionId),
            eq(revenueRecognition.organizationId, ctx.organizationId),
          ),
        );

      return {
        success: true,
        xeroJournalId: existingManualJournal.manualJournalId,
        state: 'synced',
        integrationAvailable: true,
      };
    }

    const { manualJournalId } = await syncManualJournalWithXero(
      ctx.organizationId,
      {
        narration: `${reference} ${lineDescription}`.slice(0, 4000),
        reference,
        date: recognition.recognitionDate,
        status: 'POSTED',
        lineAmountTypes: 'NoTax',
        journalLines: [
          {
            lineAmount: recognizedAmount,
            accountCode: journalAccounts.deferredAccount,
            description: `Release deferred revenue: ${lineDescription}`.slice(
              0,
              4000,
            ),
          },
          {
            lineAmount: -recognizedAmount,
            accountCode: journalAccounts.revenueAccount,
            description: `Recognize revenue: ${lineDescription}`.slice(0, 4000),
          },
        ],
      },
    );

    await db
      .update(revenueRecognition)
      .set({
        state: 'synced',
        xeroJournalId: manualJournalId,
        xeroSyncError: null,
        lastXeroSyncAt: new Date(),
      })
      .where(
        and(
          eq(revenueRecognition.id, recognitionId),
          eq(revenueRecognition.organizationId, ctx.organizationId),
        ),
      );

    return {
      success: true,
      xeroJournalId: manualJournalId,
      state: 'synced',
      integrationAvailable: true,
    };
  } catch (error) {
    const errorMessage = getXeroErrorMessage(error);
    const newAttempts = recognition.xeroSyncAttempts + 1;
    const newState =
      newAttempts >= MAX_SYNC_RETRIES ? 'manual_override' : 'sync_failed';

    await db
      .update(revenueRecognition)
      .set({
        state: newState,
        xeroSyncAttempts: newAttempts,
        xeroSyncError: errorMessage,
        lastXeroSyncAt: new Date(),
      })
      .where(
        and(
          eq(revenueRecognition.id, recognitionId),
          eq(revenueRecognition.organizationId, ctx.organizationId),
        ),
      );

    return {
      success: false,
      error: errorMessage,
      state: newState,
      attempts: newAttempts,
      integrationAvailable: readiness.available,
    };
  }
}
