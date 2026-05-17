import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getManualReceiveSerializationIssues,
  manualReceiveSerializationMessages,
} from '@/lib/schemas/inventory/receiving';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('manual receive serialization contract', () => {
  it('requires serialized receives to be one unit with a serial number', () => {
    expect(
      getManualReceiveSerializationIssues({
        isSerialized: true,
        quantity: 2,
        serialNumber: '',
      })
    ).toEqual([
      {
        path: 'quantity',
        code: 'serialized_quantity',
        message: manualReceiveSerializationMessages.serializedQuantity,
      },
      {
        path: 'serialNumber',
        code: 'serialized_serial_required',
        message: manualReceiveSerializationMessages.serializedSerialRequired,
      },
    ]);
  });

  it('rejects serial numbers for non-serialized receives before server submit', () => {
    expect(
      getManualReceiveSerializationIssues({
        isSerialized: false,
        quantity: 5,
        serialNumber: 'SN-001',
      })
    ).toEqual([
      {
        path: 'serialNumber',
        code: 'non_serialized_serial',
        message: manualReceiveSerializationMessages.nonSerializedSerial,
      },
    ]);
  });

  it('keeps the receiving form and server on the shared serialization helper', () => {
    const form = read('src/components/domain/inventory/receiving/receiving-form.tsx');
    const server = read('src/server/functions/inventory/manual-receive-inventory.ts');

    expect(form).toContain('getManualReceiveSerializationIssues');
    expect(server).toContain('getManualReceiveSerializationIssues');
    expect(form).toContain('disabled={!isSerializedProduct}');
    expect(form).toContain('form.setFieldValue("serialNumber", "")');
  });

  it('keeps manual receipt reasons owned by the receiving schema file', () => {
    const receivingSchema = read('src/lib/schemas/inventory/receiving.ts');
    const inventorySchema = read('src/lib/schemas/inventory/inventory.ts');

    expect(receivingSchema).toContain('export const manualReceiptReasonValues');
    expect(receivingSchema).toContain('export const manualReceiptReasonSchema');
    expect(receivingSchema).toContain('export interface InventoryReceiving');
    expect(inventorySchema).not.toContain('manualReceiptReasonValues');
    expect(inventorySchema).not.toContain('manualReceiptReasonSchema');
    expect(inventorySchema).not.toContain('export interface InventoryReceiving');
  });
});
