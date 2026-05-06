import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getOrderAmendmentActionErrorMessage,
  getOrderAmendmentStepErrorMessage,
} from '@/hooks/orders/order-amendment-action-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order amendment feedback contract', () => {
  it('sanitizes unsafe amendment action failures', () => {
    expect(
      getOrderAmendmentActionErrorMessage(
        new Error('duplicate key value violates amendment constraint'),
        'approve'
      )
    ).toBe('Unable to approve amendment.');

    expect(
      getOrderAmendmentActionErrorMessage(new Error('postgres database stack leaked'), 'cancel')
    ).toBe('Unable to cancel amendment.');

    expect(
      getOrderAmendmentActionErrorMessage(
        {
          statusCode: 409,
          message: 'Order was modified by another user. Please refresh and try again.',
          code: 'CONFLICT',
        },
        'apply'
      )
    ).toContain('refresh');
  });

  it('keeps staged amendment request copy safe and specific', () => {
    expect(
      getOrderAmendmentStepErrorMessage(
        new Error('database driver stack leaked'),
        'request'
      )
    ).toBe('Request failed: Unable to request amendment.');

    expect(
      getOrderAmendmentStepErrorMessage(
        {
          statusCode: 400,
          errors: {
            reason: ['Explain why this amendment is needed.'],
          },
        },
        'approve'
      )
    ).toBe('Approval failed: Explain why this amendment is needed.');
  });

  it('keeps amendment UI failures behind the order-owned formatter', () => {
    const reviewDialog = read('src/components/domain/orders/amendments/amendment-review-dialog.tsx');
    const requestContainer = read(
      'src/components/domain/orders/amendments/amendment-request-dialog-container.tsx'
    );
    const detailActions = read(
      'src/components/domain/orders/containers/use-order-detail-container-actions.ts'
    );
    const fulfillmentTab = read('src/components/domain/orders/tabs/order-fulfillment-tab.tsx');

    expect(reviewDialog).toContain('getOrderAmendmentActionErrorMessage(error, "approve")');
    expect(reviewDialog).toContain('getOrderAmendmentActionErrorMessage(error, "reject")');
    expect(reviewDialog).toContain(
      'getOrderAmendmentActionErrorMessage(error, "approve-and-apply")'
    );
    expect(requestContainer).toContain('getOrderAmendmentStepErrorMessage(e, "request")');
    expect(requestContainer).toContain('getOrderAmendmentStepErrorMessage(e, "approve")');
    expect(requestContainer).toContain('getOrderAmendmentStepErrorMessage(e, "apply")');
    expect(detailActions).toContain("getOrderAmendmentActionErrorMessage(error, 'apply')");
    expect(fulfillmentTab).toContain("getOrderAmendmentActionErrorMessage(err, 'cancel')");
    expect(reviewDialog).not.toContain(
      'error instanceof Error ? error.message : "Failed to approve amendment"'
    );
    expect(reviewDialog).not.toContain(
      'error instanceof Error ? error.message : "Failed to reject amendment"'
    );
    expect(requestContainer).not.toContain('e instanceof Error ? e.message : String(e)');
    expect(detailActions).not.toContain(
      "toastError(error instanceof Error ? error.message : 'Failed to apply amendment')"
    );
    expect(fulfillmentTab).not.toContain(
      "toastError(err instanceof Error ? err.message : 'Failed to cancel amendment')"
    );
  });
});
