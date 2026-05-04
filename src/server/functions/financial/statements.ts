/**
 * Customer Statements Server Functions
 *
 * Facades only: auth + validation + delegation to statement helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { idParamQuerySchema } from '@/lib/schemas/_shared/patterns';
import {
  generateStatementSchema,
  markStatementSentSchema,
  saveStatementHistorySchema,
  statementHistoryQuerySchema,
  statementListQuerySchema,
} from '@/lib/schemas';
import { generateStatementReadModel } from './_shared/statement-ledger-read';
import { readStatementById, readStatementHistory, listStatementHistory } from './_shared/statement-history-read';
import { markStatementHistorySent, saveStatementHistoryRecord } from './_shared/statement-mutations';

export const generateStatement = createServerFn({ method: 'POST' })
  .inputValidator(generateStatementSchema)
  .handler(async ({ data }) => generateStatementReadModel(await withAuth(), data));

export const saveStatementHistory = createServerFn({ method: 'POST' })
  .inputValidator(saveStatementHistorySchema)
  .handler(async ({ data }) => saveStatementHistoryRecord(await withAuth(), data));

export const markStatementSent = createServerFn({ method: 'POST' })
  .inputValidator(markStatementSentSchema)
  .handler(async ({ data }) => markStatementHistorySent(await withAuth(), data));

export const getStatementHistory = createServerFn({ method: 'GET' })
  .inputValidator(statementHistoryQuerySchema)
  .handler(async ({ data }) => readStatementHistory(await withAuth(), data));

export const getStatement = createServerFn({ method: 'GET' })
  .inputValidator(idParamQuerySchema)
  .handler(async ({ data }) => readStatementById(await withAuth(), data));

export const listStatements = createServerFn({ method: 'GET' })
  .inputValidator(statementListQuerySchema)
  .handler(async ({ data }) => listStatementHistory(await withAuth(), data));
