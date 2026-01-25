/**
 * Support Domain Components
 *
 * UI components for the Support/Issues domain including
 * SLA tracking visualizations, escalation management, RMA workflow,
 * CSAT feedback, and knowledge base management.
 */

// Re-export IssueStatus type from schemas for convenience
export type { IssueStatus } from '@/lib/schemas/support/issues';

// --- SLA ---
export * from './sla';

// --- Escalation ---
export * from './escalation';

// --- Issues ---
export * from './issues';

// --- RMA ---
export * from './rma';

// --- CSAT ---
export * from './csat';

// --- Knowledge Base ---
export * from './knowledge-base';

// --- Analytics ---
export {
  MetricCard,
  SummaryMetricsGrid,
  ClaimsByProductChart,
  ClaimsByTypeChart,
  ClaimsTrendChart,
  SlaComplianceCard,
  CycleCountAnalysisChart,
  RevenueVsCostChart,
  ExtensionTypeChart,
  ResolutionTypeChart,
} from './warranty-analytics-charts';
