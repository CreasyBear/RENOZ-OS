import { describe, expect, it } from 'vitest';
import {
  PRICE_IMPORT_TEMPLATE_HEADERS,
  PRICE_IMPORT_TEMPLATE_SAMPLE_ROWS,
} from '@/server/functions/suppliers/price-imports';

describe('supplier price import template contract', () => {
  it('keeps sample rows aligned to the published template columns', () => {
    for (const row of PRICE_IMPORT_TEMPLATE_SAMPLE_ROWS) {
      expect(row).toHaveLength(PRICE_IMPORT_TEMPLATE_HEADERS.length);
    }
  });

  it('uses RENOZ battery OEM examples instead of generic office product examples', () => {
    const sampleText = PRICE_IMPORT_TEMPLATE_SAMPLE_ROWS.flat().join(' ');

    expect(sampleText).toMatch(/RENOZ .* Lithium Battery/);
    expect(sampleText).toMatch(/Battery|Cell|Power Electronics/);
    expect(sampleText).not.toMatch(/Office|Chair|Standing Desk|TechCorp/);
  });
});
