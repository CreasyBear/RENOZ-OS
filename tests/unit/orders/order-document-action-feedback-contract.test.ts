import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getOrderDocumentActionErrorMessage,
  getShipmentOperationalDocumentErrorMessage,
} from '@/hooks/orders/order-document-action-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order document action feedback contract', () => {
  it('sanitizes unsafe order document generation failures', () => {
    expect(
      getOrderDocumentActionErrorMessage(
        new Error('duplicate key value violates document constraint'),
        'quote'
      )
    ).toBe('Unable to generate quote.');

    expect(
      getOrderDocumentActionErrorMessage(
        { statusCode: 429, message: 'Too many document requests' },
        'invoice'
      )
    ).toBe('Too many document requests');
  });

  it('sanitizes unsafe shipment operational document failures', () => {
    expect(
      getShipmentOperationalDocumentErrorMessage(
        new Error('postgres database stack leaked'),
        'packing-slip'
      )
    ).toBe('Unable to generate packing slip.');

    expect(
      getShipmentOperationalDocumentErrorMessage(
        {
          statusCode: 400,
          errors: {
            code: ['transition_blocked'],
            shipment: ['Shipment must be shipped before generating a delivery note.'],
          },
        },
        'delivery-note'
      )
    ).toBe('Shipment must be shipped before generating a delivery note.');
  });

  it('keeps order detail document actions behind order-owned formatters', () => {
    const actions = read(
      'src/components/domain/orders/containers/use-order-detail-container-actions.ts'
    );
    const container = read('src/components/domain/orders/containers/order-detail-container.tsx');

    expect(actions).toContain("getOrderDocumentActionErrorMessage(error, 'quote')");
    expect(actions).toContain("getOrderDocumentActionErrorMessage(error, 'invoice')");
    expect(actions).toContain("getOrderDocumentActionErrorMessage(error, 'pro-forma')");
    expect(container).toContain('getShipmentOperationalDocumentErrorMessage(error, documentType)');
    expect(actions).not.toContain(
      "toastError(error instanceof Error ? error.message : 'Failed to generate quote')"
    );
    expect(actions).not.toContain(
      "toastError(error instanceof Error ? error.message : 'Failed to generate invoice')"
    );
    expect(actions).not.toContain(
      "toastError(error instanceof Error ? error.message : 'Failed to generate pro-forma')"
    );
    expect(container).not.toContain(
      'error instanceof Error ? error.message : `Failed to generate ${documentType}`'
    );
  });
});
