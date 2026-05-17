import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('inventory turnover window contract', () => {
  it('uses chronological previous-period bounds for product turnover trends', () => {
    const valuationSource = compact(read('src/server/functions/inventory/valuation.ts'));
    const source = compact(read('src/server/functions/inventory/inventory-turnover-read.ts'));

    expect(valuationSource).toContain(
      "import{readInventoryTurnover}from'./inventory-turnover-read'"
    );
    expect(valuationSource).toContain('returnreadInventoryTurnover({organizationId:ctx.organizationId,period:data.period,productId:data.productId,})');
    expect(valuationSource).not.toContain('product_cogs_prevAS');

    expect(source).toContain('constpreviousPeriodStartDaysAgo=periodDays*2;');
    expect(source).toContain('constpreviousPeriodEndDaysAgo=periodDays;');
    expect(source).toContain(
      "constpreviousPeriodStartDate=sql`NOW()-INTERVAL'1day'*${previousPeriodStartDaysAgo}`;"
    );
    expect(source).toContain(
      "constpreviousPeriodEndDate=sql`NOW()-INTERVAL'1day'*${previousPeriodEndDaysAgo}`;"
    );
    expect(source).toContain(
      'ANDcreated_at>=${previousPeriodStartDate}ANDcreated_at<${previousPeriodEndDate}'
    );
    expect(source).not.toContain(
      "ANDcreated_at>=${previousPeriodEndDate}ANDcreated_at<NOW()-INTERVAL'1day'*${previousPeriodStart}"
    );
  });

  it('uses chronological trend bucket bounds ending at now for the current bucket', () => {
    const source = compact(read('src/server/functions/inventory/inventory-turnover-read.ts'));

    expect(source).toContain('consttrendWindowStartDaysAgo=(i+1)*trendInterval;');
    expect(source).toContain('consttrendWindowEndDaysAgo=i*trendInterval;');
    expect(source).toContain(
      "consttrendWindowStartDate=sql`NOW()-INTERVAL'1day'*${trendWindowStartDaysAgo}`;"
    );
    expect(source).toContain(
      "consttrendWindowEndDate=sql`NOW()-INTERVAL'1day'*${trendWindowEndDaysAgo}`;"
    );
    expect(source).toContain(
      'ANDcreated_at>=${trendWindowStartDate}ANDcreated_at<${trendWindowEndDate}'
    );
    expect(source).not.toContain('constperiodStart=periodDays-(i+1)*trendInterval;');
    expect(source).not.toContain('constperiodEnd=periodDays-i*trendInterval;');
  });
});
