import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DELIVERY_PHOTO_IMAGE_TYPE_MESSAGE,
  DELIVERY_PHOTO_SIZE_MESSAGE,
  DELIVERY_PHOTO_UPLOAD_FALLBACK,
  getDeliveryPhotoUploadErrorMessage,
} from '@/components/domain/orders/fulfillment/confirm-delivery-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('confirm delivery feedback contract', () => {
  it('preserves local file validation copy and hides unknown upload errors', () => {
    expect(getDeliveryPhotoUploadErrorMessage(new Error(DELIVERY_PHOTO_IMAGE_TYPE_MESSAGE))).toBe(
      DELIVERY_PHOTO_IMAGE_TYPE_MESSAGE
    );
    expect(getDeliveryPhotoUploadErrorMessage(new Error(DELIVERY_PHOTO_SIZE_MESSAGE))).toBe(
      DELIVERY_PHOTO_SIZE_MESSAGE
    );
    expect(getDeliveryPhotoUploadErrorMessage(new Error('storage backend leaked'))).toBe(
      DELIVERY_PHOTO_UPLOAD_FALLBACK
    );
  });

  it('routes dialog upload and confirm failures through fulfillment-owned fallbacks', () => {
    const dialog = read('src/components/domain/orders/fulfillment/confirm-delivery-dialog.tsx');

    expect(dialog).toContain('getDeliveryPhotoUploadErrorMessage(error)');
    expect(dialog).toContain('getShipmentActionErrorMessage(error, DELIVERY_CONFIRMATION_FALLBACK)');
    expect(dialog).toContain('DELIVERY_PHOTO_IMAGE_TYPE_MESSAGE');
    expect(dialog).toContain('DELIVERY_PHOTO_SIZE_MESSAGE');
    expect(dialog).toContain('DELIVERY_CONFIRMATION_FALLBACK');
    expect(dialog).not.toContain('error instanceof Error ? error.message');
    expect(dialog).not.toContain('"Failed to upload photo"');
    expect(dialog).not.toContain('"Failed to confirm delivery"');
  });
});
