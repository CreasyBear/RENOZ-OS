import type { DocumentAddress, DocumentOrder } from './types';

export interface FinancialSummaryRow {
  key: 'subtotal' | 'discount' | 'shipping' | 'tax' | 'total' | 'balanceDue';
  label: string;
  amount: number;
  emphasized?: boolean;
}

function normalizeAddressValue(value?: string | null) {
  return value?.trim() || '';
}

export function areDocumentAddressesEqual(
  left?: DocumentAddress | null,
  right?: DocumentAddress | null,
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    normalizeAddressValue(left.addressLine1) === normalizeAddressValue(right.addressLine1) &&
    normalizeAddressValue(left.addressLine2) === normalizeAddressValue(right.addressLine2) &&
    normalizeAddressValue(left.city) === normalizeAddressValue(right.city) &&
    normalizeAddressValue(left.state) === normalizeAddressValue(right.state) &&
    normalizeAddressValue(left.postalCode) === normalizeAddressValue(right.postalCode) &&
    normalizeAddressValue(left.country) === normalizeAddressValue(right.country) &&
    normalizeAddressValue(left.contactName) === normalizeAddressValue(right.contactName) &&
    normalizeAddressValue(left.contactPhone) === normalizeAddressValue(right.contactPhone)
  );
}

export function resolveFinancialDocumentAddresses(order: Pick<DocumentOrder, 'billingAddress' | 'shippingAddress' | 'customer'>) {
  const billTo = order.billingAddress ?? order.customer.address ?? null;
  const shipTo = order.shippingAddress ?? null;
  const showShipTo = !!shipTo && !areDocumentAddressesEqual(billTo, shipTo);

  return {
    billTo,
    shipTo,
    showShipTo,
  };
}

export function getFinancialDocumentRecipientName(
  address: DocumentAddress | null | undefined,
  fallbackName: string,
): string {
  return normalizeAddressValue(address?.contactName) || fallbackName;
}

export function buildFinancialSummaryRows(
  order: Pick<DocumentOrder, 'subtotal' | 'discount' | 'shippingAmount' | 'taxAmount' | 'total' | 'balanceDue'>,
  options?: { includeBalanceDue?: boolean },
): FinancialSummaryRow[] {
  const rows: FinancialSummaryRow[] = [
    {
      key: 'subtotal',
      label: 'Subtotal',
      amount: order.subtotal,
    },
  ];

  if ((order.discount ?? 0) > 0) {
    rows.push({
      key: 'discount',
      label: 'Discount',
      amount: -Math.abs(order.discount ?? 0),
    });
  }

  if ((order.shippingAmount ?? 0) > 0) {
    rows.push({
      key: 'shipping',
      label: 'Shipping',
      amount: order.shippingAmount ?? 0,
    });
  }

  rows.push({
    key: 'tax',
    label: 'Tax',
    amount: order.taxAmount,
  });

  rows.push({
    key: 'total',
    label: 'Total',
    amount: order.total,
    emphasized: true,
  });

  if (options?.includeBalanceDue && (order.balanceDue ?? 0) > 0) {
    rows.push({
      key: 'balanceDue',
      label: 'Balance Due',
      amount: order.balanceDue ?? 0,
      emphasized: true,
    });
  }

  return rows;
}
