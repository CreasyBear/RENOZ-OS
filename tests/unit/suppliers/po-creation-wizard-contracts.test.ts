import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PURCHASE_ORDER_REVIEW_GST_RATE,
  buildInitialPurchaseOrderLineItemKeys,
  buildInitialPurchaseOrderFormData,
  calculatePurchaseOrderReviewTotals,
  createBlankPurchaseOrderItem,
  createCustomPurchaseOrderItem,
  createPurchaseOrderLineItemKey,
  getPurchaseOrderProductUnitPrice,
  getLineItemValidationError,
  getPurchaseOrderSubmissionValidationError,
  getPurchaseOrderWizardStartingStep,
  getSupplierSelectionValidationError,
  isCustomPurchaseOrderItem,
  parsePurchaseOrderQuantityInput,
  parsePurchaseOrderUnitPriceInput,
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

  it('assigns stable client keys to line-item rows outside the submitted form data', () => {
    expect(createPurchaseOrderLineItemKey('wizard-1', 2)).toBe('wizard-1-line-2');
    expect(
      buildInitialPurchaseOrderLineItemKeys({
        keyPrefix: 'wizard-1',
        itemCount: 3,
      })
    ).toEqual(['wizard-1-line-0', 'wizard-1-line-1', 'wizard-1-line-2']);
  });

  it('preserves zero cost prices when deriving purchase-order unit prices', () => {
    expect(
      getPurchaseOrderProductUnitPrice({
        costPrice: 0,
        basePrice: 120,
      })
    ).toBe(0);
    expect(
      getPurchaseOrderProductUnitPrice({
        costPrice: null,
        basePrice: 120,
      })
    ).toBe(120);
    expect(
      getPurchaseOrderProductUnitPrice({
        costPrice: Number.NaN,
        basePrice: 120,
      })
    ).toBe(120);
  });

  it('converts a product-backed line into a custom item without product identity', () => {
    expect(
      createCustomPurchaseOrderItem({
        productId: 'product-1',
        productName: 'Battery module',
        productSku: 'BAT-1',
        description: 'Product description',
        quantity: 3,
        unitPrice: 25,
        notes: 'Keep this operator note',
      })
    ).toEqual({
      productName: 'Custom Item',
      quantity: 3,
      unitPrice: 25,
      notes: 'Keep this operator note',
    });
  });

  it('treats item naming as operator-owned only for custom lines', () => {
    expect(
      isCustomPurchaseOrderItem({
        productName: 'Freight',
        quantity: 1,
        unitPrice: 80,
      })
    ).toBe(true);
    expect(
      isCustomPurchaseOrderItem({
        productId: 'product-1',
        productName: 'Battery module',
        quantity: 1,
        unitPrice: 80,
      })
    ).toBe(false);
  });

  it('parses numeric line-item inputs without hiding invalid quantities', () => {
    expect(parsePurchaseOrderQuantityInput('12')).toBe(12);
    expect(parsePurchaseOrderQuantityInput('0')).toBe(0);
    expect(parsePurchaseOrderQuantityInput('')).toBe(0);
    expect(parsePurchaseOrderQuantityInput('1.5')).toBe(1.5);

    expect(parsePurchaseOrderUnitPriceInput('0')).toBe(0);
    expect(parsePurchaseOrderUnitPriceInput('12.5')).toBe(12.5);
    expect(parsePurchaseOrderUnitPriceInput('')).toBe(0);
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
    expect(getLineItemValidationError([{ ...validItems[0], quantity: 1.5 }])).toBe(
      'Line item #1 must have a whole number quantity'
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
    expect(source).toContain('buildInitialPurchaseOrderLineItemKeys({');
    expect(source).toContain('createCustomPurchaseOrderItem(item)');
    expect(source).toContain('createPurchaseOrderLineItemKey(');
    expect(source).toContain('getPurchaseOrderProductUnitPrice(product)');
    expect(source).toContain('isCustomPurchaseOrderItem(item)');
    expect(source).toContain('parsePurchaseOrderQuantityInput(e.target.value)');
    expect(source).toContain('parsePurchaseOrderUnitPriceInput(e.target.value)');
    expect(source).toContain('placeholder="Freight, sample, surcharge..."');
    expect(source).toContain('setLineItemKeys((prev) => [...prev, lineItemKey])');
    expect(source).toContain('setLineItemKeys((prev) => prev.filter((_, idx) => idx !== index))');
    expect(source).toContain('key={itemKeys[index] ?? `line-${index}`}');
    expect(source).toContain('createBlankPurchaseOrderItem()');
    expect(source).toContain('getSupplierSelectionValidationError(formData.supplierId)');
    expect(source).toContain('getLineItemValidationError(formData.items)');
    expect(source).toContain('getPurchaseOrderSubmissionValidationError(formData)');
    expect(source).toContain('calculatePurchaseOrderReviewTotals(formData.items)');
    expect(source).not.toContain('const taxRate = 0.1');
    expect(source).not.toContain('key={index}');
    expect(source).not.toContain('product.costPrice || product.basePrice || 0');
    expect(source).not.toContain('parseInt(e.target.value) || 1');
    expect(source).not.toContain('parseFloat(e.target.value) || 0');
    expect(source).not.toContain('onUpdate({ ...item, productName: "Custom Item" })');
  });
});
