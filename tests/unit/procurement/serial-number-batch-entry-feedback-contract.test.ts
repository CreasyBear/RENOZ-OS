import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatSerialBatchParseError,
  SERIAL_BATCH_PARSE_FALLBACK_MESSAGE,
} from '@/components/domain/procurement/receiving/receiving-feedback-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('serial number batch entry feedback contract', () => {
  it('preserves known CSV parser guidance and hides system-shaped failures', () => {
    expect(formatSerialBatchParseError(new Error('File is empty'))).toBe('File is empty');
    expect(formatSerialBatchParseError(new Error('CSV file is empty'))).toBe('CSV file is empty');
    expect(formatSerialBatchParseError(new Error('No serial numbers found in CSV file'))).toBe(
      'No serial numbers found in CSV file'
    );
    expect(formatSerialBatchParseError(new Error('Failed to read file'))).toBe(
      'Failed to read file'
    );

    expect(
      formatSerialBatchParseError(
        new Error('duplicate key value violates unique constraint serial_numbers_pkey')
      )
    ).toBe(SERIAL_BATCH_PARSE_FALLBACK_MESSAGE);
    expect(
      formatSerialBatchParseError(
        new TypeError("Cannot read properties of undefined (reading 'split')")
      )
    ).toBe(SERIAL_BATCH_PARSE_FALLBACK_MESSAGE);
    expect(formatSerialBatchParseError(new Error('Unexpected parser failure'))).toBe(
      SERIAL_BATCH_PARSE_FALLBACK_MESSAGE
    );
  });

  it('keeps CSV upload toast feedback behind the receiving helper', () => {
    const entry = read(
      'src/components/domain/procurement/receiving/serial-number-batch-entry.tsx'
    );

    expect(entry).toContain('toastError(formatSerialBatchParseError(err))');
    expect(entry).not.toContain('err instanceof Error ? err.message');
    expect(entry).not.toContain("'Failed to parse CSV'");
  });
});
