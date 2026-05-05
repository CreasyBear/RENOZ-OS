import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PURCHASE_ORDER_REVIEW_GST_RATE,
  buildInitialPurchaseOrderFormData,
  calculatePurchaseOrderReviewTotals,
  createBlankPurchaseOrderItem,
  getLineItemValidationError,
  getPurchaseOrderSubmissionValidationError,
  getPurchaseOrderWizardStartingStep,
  getSupplierSelectionValidationError,
  type PurchaseOrderItemFormData,
} from '@/components/domain/suppliers/po-creation-wizard-contracts';
import { GST_RATE, roundCurrency } from '@/lib/order-calculations';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

const validItems: PurchaseOrderItemFormData[] = [
  {
    productId: 'product-1',
    productName: 'Battery module',
    quantity: 2,
    unitPrice: 50,
  },
];

describe('PO creation wizard contracts', () => {
  it('keeps contextual launches on step 2 only when a supplier is known', () => {
    expect(
      getPurchaseOrderWizardStartingStep({
        initialSupplierId: 'supplier-1',
        initialStep: 2,
      })
    ).toBe(2);
    expect(
      getPurchaseOrderWizardStartingStep({
        initialSupplierId: null,
        initialStep: 2,
      })
    ).toBe(1);
    expect(
      getPurchaseOrderWizardStartingStep({
        initialSupplierId: '   ',
        initialStep: 2,
      })
    ).toBe(1);
  });

  it('builds an isolated initial form model', () => {
    const initialItems = [{ ...validItems[0] }];
    const formData = buildInitialPurchaseOrderFormData({
      initialSupplierId: 'supplier-1',
      initialItems,
    });

    initialItems[0].productName = 'Changed after build';

    expect(formData).toEqual({
      supplierId: 'supplier-1',
      items: [
        expect.objectContaining({
          productName: 'Battery module',
          quantity: 2,
          unitPrice: 50,
        }),
      ],
    });
  });

  it('validates supplier selection and line items before submission', () => {
    expect(getSupplierSelectionValidationError('')).toBe('Please select a supplier');
    expect(getSupplierSelectionValidationError('supplier-1')).toBeNull();

    expect(createBlankPurchaseOrderItem()).toEqual({
      productName: '',
      quantity: 1,
      unitPrice: 0,
    });
    expect(getLineItemValidationError([])).toBe('Please add at least one item');
    expect(getLineItemValidationError([{ ...validItems[0], productName: '   ' }])).toBe(
      'Line item #1 is missing a product name'
    );
    expect(getLineItemValidationError([{ ...validItems[0], quantity: 0 }])).toBe(
      'Line item #1 must have a quantity greater than 0'
    );
    expect(getLineItemValidationError([{ ...validItems[0], unitPrice: -1 }])).toBe(
      'Line item #1 has an invalid unit price'
    );

    expect(
      getPurchaseOrderSubmissionValidationError({
        supplierId: '',
        items: validItems,
      })
    ).toBe('Please select a supplier');
    expect(
      getPurchaseOrderSubmissionValidationError({
        supplierId: 'supplier-1',
        items: validItems,
      })
    ).toBeNull();
  });

  it('calculates review totals through the shared GST contract', () => {
    expect(PURCHASE_ORDER_REVIEW_GST_RATE).toBe(GST_RATE);

    const totals = calculatePurchaseOrderReviewTotals([
      { productName: 'Battery module', quantity: 2, unitPrice: 50 },
      { productName: 'Harness', quantity: 1, unitPrice: 25 },
    ]);

    expect(totals).toEqual({
      subtotal: 125,
      taxAmount: roundCurrency(125 * GST_RATE),
      total: roundCurrency(125 + roundCurrency(125 * GST_RATE)),
    });
  });

  it('keeps the wizard UI wired to the extracted workflow contract', () => {
    const source = read('src/components/domain/suppliers/po-creation-wizard.tsx');

    expect(source).toContain('buildInitialPurchaseOrderFormData({ initialSupplierId, initialItems })');
    expect(source).toContain('createBlankPurchaseOrderItem()');
    expect(source).toContain('getSupplierSelectionValidationError(formData.supplierId)');
    expect(source).toContain('getLineItemValidationError(formData.items)');
    expect(source).toContain('getPurchaseOrderSubmissionValidationError(formData)');
    expect(source).toContain('calculatePurchaseOrderReviewTotals(formData.items)');
    expect(source).not.toContain('const taxRate = 0.1');
  });
});
