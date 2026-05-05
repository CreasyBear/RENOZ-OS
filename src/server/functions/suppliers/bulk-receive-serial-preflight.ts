import { normalizeSerial } from '@/lib/serials';
import type { SerializedMutationErrorCode } from '@/lib/schemas/inventory';

export interface BulkReceiveSerialPreflightLine {
  poId: string;
  poItemId: string;
  productId: string | null;
  productName: string;
  serialNumbers: string[];
}

export interface BulkReceiveSerialPreflightFailure {
  poId: string;
  poItemId: string;
  productId: string;
  productName: string;
  serialNumber: string;
  error: string;
  code: SerializedMutationErrorCode;
}

interface SerialOccurrence {
  poId: string;
  poItemId: string;
  productId: string;
  productName: string;
  serialNumber: string;
}

export function findBulkReceiveDuplicateSerialFailures(
  lines: BulkReceiveSerialPreflightLine[]
): BulkReceiveSerialPreflightFailure[] {
  const occurrencesByKey = new Map<string, SerialOccurrence[]>();

  for (const line of lines) {
    if (!line.productId) continue;

    for (const serialNumber of line.serialNumbers) {
      const normalized = normalizeSerial(serialNumber);
      if (normalized.length === 0) continue;

      const key = `${line.productId}:${normalized}`;
      const occurrences = occurrencesByKey.get(key) ?? [];
      occurrences.push({
        poId: line.poId,
        poItemId: line.poItemId,
        productId: line.productId,
        productName: line.productName,
        serialNumber: normalized,
      });
      occurrencesByKey.set(key, occurrences);
    }
  }

  const failures = new Map<string, BulkReceiveSerialPreflightFailure>();

  occurrencesByKey.forEach((occurrences) => {
    if (occurrences.length < 2) return;

    occurrences.forEach((occurrence) => {
      const key = `${occurrence.poId}:${occurrence.productId}:${occurrence.serialNumber}`;
      failures.set(key, {
        poId: occurrence.poId,
        poItemId: occurrence.poItemId,
        productId: occurrence.productId,
        productName: occurrence.productName,
        serialNumber: occurrence.serialNumber,
        error: `Serial "${occurrence.serialNumber}" appears multiple times for "${occurrence.productName}" in this bulk receipt request.`,
        code: 'invalid_serial_state',
      });
    });
  });

  return Array.from(failures.values());
}
