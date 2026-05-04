import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function routeFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((entry) => {
    const path = join(dir, entry);
    const absolute = join(root, path);
    if (statSync(absolute).isDirectory()) return routeFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('finance domain remediation trace', () => {
  it('keeps financial child routes inside the parent shell instead of nested PageLayout islands', () => {
    const childRoutes = routeFiles('src/routes/_authenticated/financial');

    expect(childRoutes).not.toContain(
      'src/routes/_authenticated/financial/financial-page.tsx',
    );
    for (const file of childRoutes) {
      expect(
        read(file),
        `${file} should not import/render PageLayout`,
      ).not.toContain('PageLayout');
    }
  });

  it('marks statements with a resolved real email instead of an empty string', () => {
    const route = read('src/routes/_authenticated/financial/statements.tsx');
    const mutations = read(
      'src/server/functions/financial/_shared/statement-mutations.ts',
    );

    expect(route).not.toContain("sentToEmail: ''");
    expect(mutations).toContain(
      'const sentToEmail = data.sentToEmail ?? statement.customerEmail',
    );
    expect(mutations).toContain(
      'No customer email available for this statement',
    );
  });

  it('counts only applied credits in statements and treats reminders as queued until sent', () => {
    const statements = read(
      'src/server/functions/financial/_shared/statement-ledger-read.ts',
    );
    const reminders = read(
      'src/server/functions/financial/_shared/payment-reminder-queue.ts',
    );
    const reminderSelection = read(
      'src/server/functions/financial/_shared/payment-reminder-selection.ts',
    );
    const reminderJob = read('src/trigger/jobs/process-payment-reminders.ts');

    expect(statements).toContain("eq(creditNotes.status, 'applied')");
    expect(statements).not.toContain("eq(creditNotes.status, 'issued')");
    expect(reminders).toContain("deliveryStatus: 'queued'");
    expect(reminders).toContain('processPaymentReminderOrganization');
    expect(reminderSelection).not.toContain("deliveryStatus: 'queued'");
    expect(reminderJob).toContain('processPaymentReminderOrganization');
    expect(reminderJob).toContain('_shared/payment-reminder-queue');
  });
});
