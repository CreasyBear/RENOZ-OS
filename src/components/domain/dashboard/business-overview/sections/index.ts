/**
 * Business Overview Section Components
 *
 * Individual section components for the Business Overview dashboard.
 */

// --- Financial ---
export { FinancialSection } from './financial-section';
export type {
  FinancialSectionProps,
  FinancialMetrics,
  RevenueTrendPoint,
} from './financial-section';

// --- Pipeline ---
export { PipelineSection } from './pipeline-section';
export type {
  PipelineSectionProps,
  PipelineMetrics,
  StageData,
  ForecastPoint,
} from './pipeline-section';

// --- Customer ---
export { CustomerSection } from './customer-section';
export type {
  CustomerSectionProps,
  CustomerKpis,
  HealthDistribution,
} from './customer-section';

// --- Operations ---
export { OperationsSection } from './operations-section';
export type { OperationsSectionProps, OperationsMetrics } from './operations-section';
