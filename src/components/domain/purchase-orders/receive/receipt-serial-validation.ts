import { normalizeSerial } from '@/lib/serials';

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
