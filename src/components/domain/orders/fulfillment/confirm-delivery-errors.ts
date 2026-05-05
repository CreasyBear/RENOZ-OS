import { getShipmentActionErrorMessage } from "@/hooks/orders/shipment-action-errors";

export const DELIVERY_PHOTO_IMAGE_TYPE_MESSAGE = "Please select an image file.";
export const DELIVERY_PHOTO_SIZE_MESSAGE = "Image must be 10MB or smaller.";
export const DELIVERY_PHOTO_UPLOAD_FALLBACK = "Unable to upload delivery photo.";
export const DELIVERY_CONFIRMATION_FALLBACK = "Unable to confirm delivery.";

const SAFE_DELIVERY_PHOTO_MESSAGES = new Set([
  DELIVERY_PHOTO_IMAGE_TYPE_MESSAGE,
  DELIVERY_PHOTO_SIZE_MESSAGE,
]);

export function getDeliveryPhotoUploadErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    SAFE_DELIVERY_PHOTO_MESSAGES.has(error.message)
  ) {
    return error.message;
  }

  return getShipmentActionErrorMessage(error, DELIVERY_PHOTO_UPLOAD_FALLBACK);
}
