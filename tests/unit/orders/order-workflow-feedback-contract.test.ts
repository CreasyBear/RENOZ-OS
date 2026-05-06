import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getOrderWorkflowActionErrorMessage,
  getReopenShipmentActionErrorMessage,
} from '@/hooks/orders/order-workflow-action-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order workflow feedback contract', () => {
  it('sanitizes unsafe order workflow failures', () => {
    expect(
      getOrderWorkflowActionErrorMessage(
        new Error('duplicate key value violates order_status_events constraint'),
        'update'
      )
    ).toBe('Unable to update the order workflow.');

    expect(
      getOrderWorkflowActionErrorMessage(new Error('postgres database stack leaked'), 'update')
    ).toBe('Unable to update the order workflow.');
  });

  it('keeps safe workflow conflict and shipment reopen guidance', () => {
    const workflowConflict = getOrderWorkflowActionErrorMessage(
      {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Order was modified by another user. Please refresh and try again.',
      },
      'update'
    );

    expect(workflowConflict).toContain('refresh');

    expect(
      getReopenShipmentActionErrorMessage(new Error('supabase shipment transaction failed'))
    ).toBe('Unable to reopen the shipment.');

    const reopenConflict = getReopenShipmentActionErrorMessage({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Shipment was modified by another user. Please refresh and try again.',
    });

    expect(reopenConflict).toContain('refresh');
  });

  it('keeps detail workflow actions behind the order-owned formatter', () => {
    const source = read('src/components/domain/orders/containers/order-detail-container.tsx');

    expect(source).toContain("getOrderWorkflowActionErrorMessage(error, 'update')");
    expect(source).toContain('getReopenShipmentActionErrorMessage(error)');
    expect(source).not.toContain("toastError(error.message || 'Unable to update the order workflow.')");
    expect(source).not.toContain("toastError(error.message || 'Unable to reopen the shipment.')");
    expect(source).not.toContain('toastError(error.message');
  });
});
