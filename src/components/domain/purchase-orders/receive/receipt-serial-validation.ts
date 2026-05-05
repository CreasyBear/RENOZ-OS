import { normalizeSerial } from '@/lib/serials';

export interface ReceiptSerialLine {
  productId: string | null;
  productName: string;
  serialNumbers: string[];
}

export interface CrossLineDuplicateReceiptSerial {
  productId: string;
  productName: string;
  serialNumber: string;
}

export function findDuplicateReceiptSerials(serialNumbers: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const serialNumber of serialNumbers) {
    const normalized = normalizeSerial(serialNumber);
    if (normalized.length === 0) continue;
    if (seen.has(normalized)) {
      duplicates.add(normalized);
      continue;
    }
    seen.add(normalized);
  }

  return Array.from(duplicates);
}

export function findCrossLineDuplicateReceiptSerials(
  lines: ReceiptSerialLine[]
): CrossLineDuplicateReceiptSerial[] {
  const seen = new Map<string, CrossLineDuplicateReceiptSerial>();
  const duplicates = new Map<string, CrossLineDuplicateReceiptSerial>();

  for (const line of lines) {
    if (!line.productId) continue;

    for (const serialNumber of line.serialNumbers) {
      const normalized = normalizeSerial(serialNumber);
      if (normalized.length === 0) continue;

      const key = `${line.productId}:${normalized}`;
      const duplicate = {
        productId: line.productId,
        productName: line.productName,
        serialNumber: normalized,
      };

      if (seen.has(key)) {
        duplicates.set(key, duplicate);
        continue;
      }

      seen.set(key, duplicate);
    }
  }

  return Array.from(duplicates.values());
}
