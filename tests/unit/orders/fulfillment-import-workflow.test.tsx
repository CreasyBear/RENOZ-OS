import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UseMutationResult } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FulfillmentImportDialog } from '@/components/domain/orders/fulfillment/fulfillment-import-dialog';
import type { FulfillmentImport } from '@/lib/schemas/orders/shipments';
import {
  buildFulfillmentImportResultsCsv,
  parseFulfillmentImport,
  type FulfillmentImportResult,
} from '@/hooks/orders/use-fulfillment-import-workflow';

const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/_shared/use-toast', () => ({
  toastSuccess: (...args: unknown[]) => mockToastSuccess(...args),
}));

function createImportMutation(
  mutateAsync: (input: FulfillmentImport) => Promise<FulfillmentImportResult>
): UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport> {
  return {
    mutateAsync,
    isPending: false,
  } as unknown as UseMutationResult<FulfillmentImportResult, Error, FulfillmentImport>;
}

describe('fulfillment import workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses fulfillment CSV rows through the shipment import schema', () => {
    const preview = parseFulfillmentImport(
      [
        'Order Number,Shipment Number,Carrier,Tracking Number,Tracking URL,Shipped Date',
        'ORD-001,SHP-001,"DHL Express",TRACK-1,https://track.example/1,2026-05-03',
        'ORD-002,,,"",,',
      ].join('\n')
    );

    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows[0].data).toMatchObject({
      orderNumber: 'ORD-001',
      shipmentNumber: 'SHP-001',
      carrier: 'DHL Express',
      trackingNumber: 'TRACK-1',
      trackingUrl: 'https://track.example/1',
    });
    expect(preview.rows[0].data?.shippedAt).toEqual(new Date('2026-05-03'));
    expect(preview.rows[1].errors.join(' ')).toContain('carrier: Invalid input');
    expect(preview.rows[1].errors.join(' ')).toContain('trackingNumber: Invalid input');
  });

  it('escapes import result CSV output for operator download', () => {
    const csv = buildFulfillmentImportResultsCsv({
      imported: 0,
      skipped: 1,
      failed: 1,
      results: [
        {
          orderNumber: 'ORD-001',
          shipmentNumber: 'SHP-001',
          status: 'skipped',
          message: 'Shipment status is in_transit',
        },
        {
          orderNumber: 'ORD-002',
          status: 'failed',
          message: 'Carrier said "hold"',
        },
      ],
    });

    expect(csv).toBe(
      [
        'orderNumber,shipmentNumber,status,message',
        '"ORD-001","SHP-001","skipped","Shipment status is in_transit"',
        '"ORD-002","","failed","Carrier said ""hold"""',
      ].join('\n')
    );
  });

  it('imports valid preview rows from the extracted dialog workflow', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      imported: 1,
      skipped: 0,
      failed: 0,
      results: [
        {
          orderNumber: 'ORD-001',
          shipmentNumber: 'SHP-001',
          status: 'imported',
        },
      ],
    });
    const onOpenChange = vi.fn();
    const file = new File([''], 'shipments.csv', { type: 'text/csv' });

    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('orderNumber,carrier,trackingNumber\nORD-001,DHL,TRACK-1'),
    });

    render(
      <FulfillmentImportDialog
        open
        onOpenChange={onOpenChange}
        importMutation={createImportMutation(mutateAsync)}
      />
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Choose file'), {
        target: { files: [file] },
      });
    });

    expect(await screen.findByText('Valid: 1')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import Shipments' }));
    });

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        rows: [
          {
            orderNumber: 'ORD-001',
            carrier: 'DHL',
            trackingNumber: 'TRACK-1',
          },
        ],
        dryRun: false,
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Fulfillment import complete');
    expect(screen.getByText('Imported 1 of 1')).toBeInTheDocument();
  }, 20000);
});
