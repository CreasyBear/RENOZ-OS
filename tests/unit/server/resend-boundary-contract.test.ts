import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const resendMutationModules = [
  'src/server/functions/communications/_shared/campaign-send-processing.ts',
  'src/server/functions/communications/_shared/scheduled-email-processing.ts',
  'src/server/functions/invoices/send-invoice-reminder.ts',
  'src/server/functions/pipeline/quote-send.ts',
  'src/trigger/jobs/process-scheduled-reports.ts',
  'src/trigger/jobs/send-email.ts',
  'src/trigger/jobs/warranty-notifications.ts',
];

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('Resend execution boundary', () => {
  it('does not bind the Resend API key during module import', () => {
    for (const modulePath of resendMutationModules) {
      const source = read(modulePath);

      expect(source, modulePath).not.toContain('new Resend(process.env.RESEND_API_KEY)');
      expect(source, modulePath).not.toMatch(/^const\s+\w+\s*=\s*new Resend\(/m);
    }
  });

  it('uses the shared email config so RESEND_FROM_EMAIL works in Vercel', () => {
    for (const modulePath of resendMutationModules) {
      const source = read(modulePath);

      expect(source, modulePath).toContain("getResendApiKey");
      expect(source, modulePath).toContain("getEmailFrom");
    }
  });
});
