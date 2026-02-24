/**
 * Serial number normalization and validation utilities.
 *
 * Canonical format is uppercased + trimmed to avoid case/whitespace drift.
 */

export function normalizeSerial(serial: string): string {
  return serial.trim().toUpperCase();
}

export function normalizeSerials(serials: string[]): string[] {
  return serials.map(normalizeSerial);
}

export function hasDuplicateSerials(serials: string[]): boolean {
  return new Set(serials).size !== serials.length;
}

export function findDuplicateSerials(serials: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const serial of serials) {
    if (seen.has(serial)) {
      duplicates.add(serial);
    } else {
      seen.add(serial);
    }
  }
  return Array.from(duplicates);
}
