/**
 * Credit Notes Server Functions
 *
 * Facades only: auth + schema + delegation to credit note helpers.
 */

import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  idParamQuerySchema,
  idParamSchema,
} from '@/lib/schemas/_shared/patterns';
import {
  applyCreditNoteSchema,
  createCreditNoteSchema,
  creditNoteListQuerySchema,
  creditNotesByCustomerQuerySchema,
  updateCreditNoteSchema,
  voidCreditNoteSchema,
} from '@/lib/schemas';
import {
  readCreditNote,
  readCreditNotesByCustomer,
  readCreditNotesList,
} from './_shared/credit-note-read';
import {
  applyCreditNoteRecordToInvoice,
  createCreditNoteRecord,
  issueCreditNoteRecord,
  updateCreditNoteRecord,
  voidCreditNoteRecord,
} from './_shared/credit-note-mutations';
import { generateCreditNotePdfDocument } from './_shared/credit-note-pdf';

export const createCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(createCreditNoteSchema)
  .handler(async ({ data }) =>
    createCreditNoteRecord(
      await withAuth({ permission: PERMISSIONS.financial.create }),
      data,
    ),
  );

export const getCreditNote = createServerFn({ method: 'GET' })
  .inputValidator(idParamQuerySchema)
  .handler(async ({ data }) => readCreditNote(await withAuth(), data));

export const listCreditNotes = createServerFn({ method: 'GET' })
  .inputValidator(creditNoteListQuerySchema)
  .handler(async ({ data }) => readCreditNotesList(await withAuth(), data));

export const getCreditNotesByCustomer = createServerFn({ method: 'GET' })
  .inputValidator(creditNotesByCustomerQuerySchema)
  .handler(async ({ data }) =>
    readCreditNotesByCustomer(await withAuth(), data),
  );

export const updateCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema.merge(updateCreditNoteSchema))
  .handler(async ({ data }) =>
    updateCreditNoteRecord(
      await withAuth({ permission: PERMISSIONS.financial.update }),
      data,
    ),
  );

export const issueCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) =>
    issueCreditNoteRecord(
      await withAuth({ permission: PERMISSIONS.financial.update }),
      data,
    ),
  );

export const applyCreditNoteToInvoice = createServerFn({ method: 'POST' })
  .inputValidator(applyCreditNoteSchema)
  .handler(async ({ data }) =>
    applyCreditNoteRecordToInvoice(
      await withAuth({ permission: PERMISSIONS.financial.update }),
      data,
    ),
  );

export const voidCreditNote = createServerFn({ method: 'POST' })
  .inputValidator(voidCreditNoteSchema)
  .handler(async ({ data }) =>
    voidCreditNoteRecord(
      await withAuth({ permission: PERMISSIONS.financial.delete }),
      data,
    ),
  );

export const generateCreditNotePdf = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) =>
    generateCreditNotePdfDocument(
      await withAuth({ permission: PERMISSIONS.financial.read }),
      data,
    ),
  );
