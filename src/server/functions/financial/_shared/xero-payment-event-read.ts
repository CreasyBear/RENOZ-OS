import { safeNumber } from '@/lib/numeric';
import type { XeroPaymentEventRecord } from '@/lib/schemas/settings/xero-sync';

type XeroPaymentEventResultState = XeroPaymentEventRecord['resultState'];

export interface XeroPaymentEventReadRow {
  id: string;
  orderId: string | null;
  dedupeKey: string | null;
  xeroInvoiceId: string | null;
  paymentId: string | null;
  amount: unknown;
  paymentDate: string;
  reference: string | null;
  resultState: string | null;
  processedAt: Date;
}

function normalizePaymentEventResultState(value: string | null): XeroPaymentEventResultState {
  switch (value) {
    case 'applied':
    case 'duplicate':
    case 'unknown_invoice':
    case 'rejected':
    case 'processing':
      return value;
    default:
      return 'processing';
  }
}

function getPaymentEventOutcome(resultState: XeroPaymentEventResultState) {
  switch (resultState) {
    case 'duplicate':
      return {
        outcomeTitle: 'Duplicate replay',
        outcomeMessage: 'This webhook event was already processed. No payment was applied twice.',
      };
    case 'applied':
      return {
        outcomeTitle: 'Payment applied',
        outcomeMessage: 'The payment was recorded on the linked order.',
      };
    case 'unknown_invoice':
      return {
        outcomeTitle: 'Invoice not found',
        outcomeMessage: 'No local order matched this Xero invoice ID.',
      };
    case 'rejected':
      return {
        outcomeTitle: 'Payment rejected',
        outcomeMessage: 'The webhook was accepted but the payment could not be safely applied.',
      };
    case 'processing':
    default:
      return {
        outcomeTitle: 'Payment processing',
        outcomeMessage: 'This payment event is still being processed.',
      };
  }
}

function formatInvoiceContext(
  resultState: XeroPaymentEventResultState,
  hasXeroInvoice: boolean,
  hasLinkedOrder: boolean
): string {
  if (!hasXeroInvoice) {
    return 'Xero invoice unavailable';
  }

  if (resultState === 'unknown_invoice' || !hasLinkedOrder) {
    return 'Unmatched Xero invoice';
  }

  return 'Matched Xero invoice';
}

function formatPaymentContext(hasPaymentId: boolean): string | null {
  return hasPaymentId ? 'Recorded Xero payment' : null;
}

function normalizeReference(reference: string | null): string | null {
  const trimmed = reference?.trim();
  return trimmed ? trimmed : null;
}

export function buildXeroPaymentEventRecord(item: XeroPaymentEventReadRow): XeroPaymentEventRecord {
  const resultState = normalizePaymentEventResultState(item.resultState);
  const { outcomeTitle, outcomeMessage } = getPaymentEventOutcome(resultState);
  const reference = normalizeReference(item.reference);
  const hasXeroInvoice = Boolean(item.xeroInvoiceId?.trim());
  const hasPaymentId = Boolean(item.paymentId?.trim());
  const hasLinkedOrder = Boolean(item.orderId);
  const invoiceContext = formatInvoiceContext(resultState, hasXeroInvoice, hasLinkedOrder);
  const paymentContext = formatPaymentContext(hasPaymentId);

  return {
    id: item.id,
    orderId: item.orderId,
    eventKeyLabel: item.dedupeKey ? 'Payment event recorded' : 'Payment event audit unavailable',
    xeroInvoiceLabel: invoiceContext,
    paymentSourceLabel: paymentContext ?? 'Payment resource unavailable',
    amount: safeNumber(item.amount),
    paymentDate: item.paymentDate,
    reference,
    resultState,
    processedAt: item.processedAt.toISOString(),
    payloadSummary: {
      source: 'xero_payment_event',
      invoice: {
        status: invoiceContext,
        linkedOrder: hasLinkedOrder,
      },
      payment: {
        status: paymentContext ?? 'Payment resource unavailable',
        date: item.paymentDate,
        reference,
      },
      handling: {
        state: resultState,
        message: outcomeMessage,
      },
    },
    outcomeTitle,
    outcomeMessage,
  };
}
