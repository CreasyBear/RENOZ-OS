/**
 * Business Overview Dashboard Components
 *
 * Comprehensive business overview dashboard with Financial, Pipeline,
 * Customer, and Operations sections.
 */

// --- Container (data fetching) ---
export {
  BusinessOverviewContainer,
  type BusinessOverviewContainerProps,
} from './business-overview-container';

// --- Presenter (pure UI) ---
export {
  BusinessOverviewDashboard,
  type BusinessOverviewDashboardProps,
} from './business-overview-dashboard';

// --- Section Components ---
export {
  FinancialSection,
  PipelineSection,
  CustomerSection,
  OperationsSection,
} from './sections';

// --- Section Types ---
export type {
  FinancialSectionProps,
  FinancialMetrics,
  RevenueTrendPoint,
  PipelineSectionProps,
  PipelineMetrics,
  StageData,
  ForecastPoint,
  CustomerSectionProps,
  CustomerKpis,
  HealthDistribution,
  OperationsSectionProps,
  OperationsMetrics,
} from './sections';
