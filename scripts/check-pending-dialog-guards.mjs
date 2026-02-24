#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

let filesOutput;
try {
  filesOutput = execSync(
    "rg --files src/components/domain src/routes/_authenticated | rg '\\.(ts|tsx)$'",
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();
} catch {
  filesOutput = execSync(
    'find src/components/domain src/routes/_authenticated -type f \\( -name "*.ts" -o -name "*.tsx" \\) 2>/dev/null',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();
}

const files = filesOutput ? filesOutput.split('\n') : [];
const offenders = [];
const baselinePath = path.resolve('docs/reliability/baselines/pending-dialog-guards.txt');
const shouldUpdateBaseline = process.argv.includes('--update-baseline');

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  // Only check files that use DialogContent from @/components/ui/dialog (not AlertDialogContent)
  if (!content.includes('<DialogContent')) continue;
  if (!/(isPending|isSubmitting)/.test(content)) continue;
  const hasAsyncSubmitPath = /(onSubmit|mutateAsync|mutationFn|handleSubmit)/.test(content);
  if (!hasAsyncSubmitPath) continue;

  const hasEscapeGuard = content.includes('onEscapeKeyDown');
  const hasOutsideGuard = content.includes('onInteractOutside');

  if (!hasEscapeGuard || !hasOutsideGuard) {
    offenders.push({ file, hasEscapeGuard, hasOutsideGuard });
  }
}

const offenderFiles = offenders.map((o) => o.file).sort();

if (shouldUpdateBaseline) {
  mkdirSync(path.dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${offenderFiles.join('\n')}\n`, 'utf8');
  console.log(`Pending dialog baseline updated: ${baselinePath} (${offenderFiles.length} entries)`);
  process.exit(0);
}

const baselineFiles = existsSync(baselinePath)
  ? readFileSync(baselinePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  : [];

const baselineSet = new Set(baselineFiles);
const newOffenders = offenders.filter((offender) => !baselineSet.has(offender.file));

if (newOffenders.length > 0) {
  console.error('Pending dialog guard check failed (new offenders beyond baseline):');
  for (const offender of newOffenders) {
    console.error(
      `- ${offender.file} (escapeGuard=${offender.hasEscapeGuard}, outsideGuard=${offender.hasOutsideGuard})`
    );
  }
  console.error(
    `\nBaseline file: ${baselinePath}\n` +
      'If intentional debt reconciliation is complete, regenerate baseline with:\n' +
      '  node scripts/check-pending-dialog-guards.mjs --update-baseline'
  );
  process.exit(1);
}

if (offenders.length > 0) {
  console.log(
    `Pending dialog guard check passed (baseline mode). Current offenders: ${offenders.length}, baseline: ${baselineFiles.length}.`
  );
} else {
  console.log('Pending dialog guard check passed.');
}
