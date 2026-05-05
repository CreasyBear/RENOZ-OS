import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function compact(path: string): string {
  return readFileSync(join(root, path), 'utf8').replace(/\s+/g, '');
}

describe('bulk receive goods row failure contract', () => {
  it('keeps defensive row failures typed before normalization', () => {
    const source = compact('src/server/functions/suppliers/bulk-receive-goods.ts');

    expect(source).toContain(
      "import{NotFoundError,ValidationError}from'@/lib/server/errors';"
    );
    expect(source).toContain(
      "if(!poDetails){thrownewNotFoundError('Purchaseordernotfound','purchaseOrder');}"
    );
    expect(source).toContain(
      "if(!poDetails.items){thrownewValidationError('Purchaseorderreceivingdetailsareunavailable.Refreshandtryagain.');}"
    );
    expect(source).not.toContain("thrownewError('Purchaseordernotfoundorhasnoitems')");
  });

  it('counts no-pending purchase orders as skipped instead of received', () => {
    const source = compact('src/server/functions/suppliers/bulk-receive-goods.ts');

    expect(source).toContain('skipped:number;');
    expect(source).toContain('skippedDetails:BulkReceiveSkippedDetail[];');
    expect(source).toContain('skipped:0,');
    expect(source).toContain('skippedDetails:[]asBulkReceiveSkippedDetail[],');
    expect(source).toContain('if(pendingItems.length===0){');
    expect(source).toContain('results.skipped++;');
    expect(source).toContain("results.skippedDetails.push({poId,reason:'Nopendingitemstoreceive.',});");
    expect(source).not.toContain('if(pendingItems.length===0){//Nopendingitems-skipthisPOresults.processed++;');
    expect(source).toContain('formatBulkReceiveResultMessage(results)');
    expect(source).toContain('Skipped${skippedLabel}withnopendingitems.');
  });
});
