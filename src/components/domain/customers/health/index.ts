/**
 * Customer Health Components
 *
 * Container/Presenter Pattern:
 * - Containers handle data fetching via centralized hooks
 * - Presenters are pure UI components receiving data via props
 * - Use *Container components in routes and parent components
 * - Legacy names exported for backwards compatibility
 */

// ============================================================================
// DASHBOARD - Container
// ============================================================================
export { HealthDashboardContainer } from './health-dashboard-container';

// ============================================================================
// DASHBOARD - Presenter (for backwards compatibility)
// ============================================================================
export {
  HealthDashboard,
  HealthDashboardPresenter,
  type HealthDashboardProps,
  type HealthDashboardContainerProps,
  type HealthDashboardPresenterProps,
} from './health-dashboard';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
export { HealthRecommendations } from './health-recommendations';
export { HealthScoreGauge } from './health-score-gauge';
export { RiskAlerts } from './risk-alerts';
export { ActionPlans } from './action-plans';
export { HealthHistory } from './health-history';
