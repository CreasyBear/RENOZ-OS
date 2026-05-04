import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
  server: {
    preset: 'vercel',
  },
  router: {
    // TanStack applies this pattern to the basename, not the full path.
    // Ignore helper suffixes plus the known non-Route API handler basenames.
    routeFileIgnorePattern:
      '^((agent|approvals(\\.\\$approvalId)?|approve|artifacts\\.\\$id|callback|chat|connections(\\.\\$connectionId)?|cost|debug-ping|debug-rls-clash|health|initiate|pending-selection|resend|unsubscribe\\.\\$token|xero)|.*-(page|layout|nav|tab|types|container|presenter|columns|config|schema|helpers|utils|sorting))\\.(tsx|ts)$',
  },
})
