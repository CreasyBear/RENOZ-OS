/**
 * Manual receiving workflow validation helpers.
 *
 * Shared by the receiving UI and receiveInventory server function so serialized
 * stock-in rules stay aligned without coupling either layer to the other.
 */

import { z } from 'zod';

export const manualReceiptReasonValues = [
  'initial_stock',
  'found_stock',
  'sample_or_promo',
  'non_supplier_inbound',
  'other_exception',
] as const;

export const manualReceiptReasonSchema = z.enum(manualReceiptReasonValues);
export type ManualReceiptReason = z.infer<typeof manualReceiptReasonSchema>;

export const manualReceiveSerializationMessages = {
  serializedQuantity: 'Serialized products must be received one unit per serial.',
  serializedSerialRequired: 'Serial number is required for serialized products.',
  nonSerializedSerial: 'Serial number is only allowed for serialized products.',
} as const;

export type ManualReceiveSerializationIssueCode =
  | 'serialized_quantity'
  | 'serialized_serial_required'
  | 'non_serialized_serial';

export interface ManualReceiveSerializationIssue {
  path: 'quantity' | 'serialNumber';
  code: ManualReceiveSerializationIssueCode;
  message: string;
}

export interface ManualReceiveSerializationInput {
  isSerialized: boolean;
  quantity: number;
  serialNumber?: string | null;
}

export function getManualReceiveSerializationIssues({
  isSerialized,
  quantity,
  serialNumber,
}: ManualReceiveSerializationInput): ManualReceiveSerializationIssue[] {
  const hasSerialNumber = !!serialNumber?.trim();
  const issues: ManualReceiveSerializationIssue[] = [];

  if (isSerialized) {
    if (quantity !== 1) {
      issues.push({
        path: 'quantity',
        code: 'serialized_quantity',
        message: manualReceiveSerializationMessages.serializedQuantity,
      });
    }
    if (!hasSerialNumber) {
      issues.push({
        path: 'serialNumber',
        code: 'serialized_serial_required',
        message: manualReceiveSerializationMessages.serializedSerialRequired,
      });
    }
    return issues;
  }

  if (hasSerialNumber) {
    issues.push({
      path: 'serialNumber',
      code: 'non_serialized_serial',
      message: manualReceiveSerializationMessages.nonSerializedSerial,
    });
  }

  return issues;
}
