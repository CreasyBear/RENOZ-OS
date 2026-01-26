/**
 * AI Artifacts Module
 *
 * Structured streaming artifacts for rich visualizations.
 * Uses @ai-sdk-tools/artifacts for real-time data streaming.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 * @see https://github.com/midday-ai/ai-sdk-tools/tree/main/packages/artifacts
 */

// Re-export artifact definitions
export {
  // Artifact definitions
  revenueChartArtifact,
  ordersPipelineArtifact,
  customerSummaryArtifact,
  metricsCardArtifact,
  topCustomersArtifact,
  // Stage constants
  artifactStages,
  ARTIFACT_TYPES,
  // Types
  type ArtifactStage,
  type ArtifactType,
  type RevenueChartData,
  type OrdersPipelineData,
  type CustomerSummaryData,
  type MetricsCardData,
  type TopCustomersData,
} from './definitions';

// Re-export context utilities
export {
  setContext,
  getContext,
  requireContext,
  clearContext,
  hasContext,
  getWriter,
  requireWriter,
  type RenozArtifactContext,
} from './context';
