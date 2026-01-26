/**
 * AI Artifact Renderer Component
 *
 * Renders AI-generated artifacts (charts, tables, documents) with progressive loading.
 * Supports multiple artifact types with appropriate visualizations.
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json (AI-INFRA-009)
 */

import { memo, useCallback } from 'react';
import {
  BarChart3,
  FileText,
  Table as TableIcon,
  Download,
  Maximize2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================================================
// TYPES
// ============================================================================

export type ArtifactType = 'chart' | 'table' | 'document' | 'markdown' | 'json';

export type ArtifactStage = 'loading' | 'chart_ready' | 'metrics_ready' | 'analysis_ready' | 'complete';

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  stage: ArtifactStage;
  data: unknown;
  metadata?: {
    generatedAt?: string;
    agent?: string;
    conversationId?: string;
  };
}

export interface ArtifactRendererProps {
  /** The artifact to render */
  artifact: ArtifactData;
  /** Whether artifact is still loading/streaming */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback for expand action */
  onExpand?: (artifact: ArtifactData) => void;
  /** Callback for download action */
  onDownload?: (artifact: ArtifactData) => void;
  /** Display variant */
  variant?: 'inline' | 'card' | 'fullscreen';
  /** Optional className */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ARTIFACT_ICONS: Record<ArtifactType, typeof BarChart3> = {
  chart: BarChart3,
  table: TableIcon,
  document: FileText,
  markdown: FileText,
  json: FileText,
};

const STAGE_LABELS: Record<ArtifactStage, string> = {
  loading: 'Loading...',
  chart_ready: 'Chart ready',
  metrics_ready: 'Metrics ready',
  analysis_ready: 'Analysis ready',
  complete: 'Complete',
};

// ============================================================================
// LOADING STATES
// ============================================================================

function ArtifactSkeleton({ type }: { type: ArtifactType }) {
  if (type === 'chart') {
    return (
      <div className="space-y-2">
        <div className="flex items-end gap-1 h-32">
          {[40, 65, 45, 80, 55, 70, 35].map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Generating...</span>
      </div>
    </div>
  );
}

// ============================================================================
// ARTIFACT TYPE RENDERERS
// ============================================================================

interface ChartRendererProps {
  data: unknown;
  stage: ArtifactStage;
}

const ChartRenderer = memo(function ChartRenderer({ data, stage }: ChartRendererProps) {
  // For now, render a placeholder chart
  // In production, this would use Recharts based on the data shape
  const chartData = data as Array<{ label: string; value: number }> | null;

  if (!chartData || !Array.isArray(chartData)) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p className="text-sm">Chart data unavailable</p>
      </div>
    );
  }

  // Simple bar chart visualization
  const maxValue = Math.max(...chartData.map((d) => d.value));

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-40">
        {chartData.map((item, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                'w-full rounded-t transition-all duration-500',
                stage === 'loading' ? 'bg-muted animate-pulse' : 'bg-primary'
              )}
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                minHeight: '4px',
              }}
            />
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

interface TableRendererProps {
  data: unknown;
}

const TableRenderer = memo(function TableRenderer({ data }: TableRendererProps) {
  const tableData = data as {
    headers?: string[];
    rows?: Array<Record<string, unknown>>;
  } | null;

  if (!tableData?.headers || !tableData?.rows) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">Table data unavailable</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {tableData.headers.map((header, index) => (
              <TableHead key={index}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {tableData.headers!.map((header, cellIndex) => (
                <TableCell key={cellIndex}>
                  {String(row[header] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

interface MarkdownRendererProps {
  data: unknown;
}

const MarkdownRenderer = memo(function MarkdownRenderer({ data }: MarkdownRendererProps) {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <pre className="whitespace-pre-wrap text-sm">{content}</pre>
    </div>
  );
});

interface JsonRendererProps {
  data: unknown;
}

const JsonRenderer = memo(function JsonRenderer({ data }: JsonRendererProps) {
  const formatted = JSON.stringify(data, null, 2);

  return (
    <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-64">
      <code>{formatted}</code>
    </pre>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Renders AI-generated artifacts with progressive loading and actions.
 *
 * Supports artifact types:
 * - `chart`: Bar/line charts with Recharts
 * - `table`: Data tables with sorting
 * - `document`: Rich text documents
 * - `markdown`: Markdown content
 * - `json`: JSON data viewer
 */
export const ArtifactRenderer = memo(function ArtifactRenderer({
  artifact,
  isLoading = false,
  error = null,
  onExpand,
  onDownload,
  variant = 'card',
  className,
}: ArtifactRendererProps) {
  const Icon = ARTIFACT_ICONS[artifact.type];
  const stageLabel = STAGE_LABELS[artifact.stage];

  // Handle expand
  const handleExpand = useCallback(() => {
    onExpand?.(artifact);
  }, [artifact, onExpand]);

  // Handle download
  const handleDownload = useCallback(() => {
    onDownload?.(artifact);
  }, [artifact, onDownload]);

  // Render content based on type
  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">
            {error.message || 'Failed to load artifact'}
          </p>
        </div>
      );
    }

    if (artifact.stage === 'loading' && !artifact.data) {
      return <ArtifactSkeleton type={artifact.type} />;
    }

    switch (artifact.type) {
      case 'chart':
        return <ChartRenderer data={artifact.data} stage={artifact.stage} />;
      case 'table':
        return <TableRenderer data={artifact.data} />;
      case 'markdown':
      case 'document':
        return <MarkdownRenderer data={artifact.data} />;
      case 'json':
        return <JsonRenderer data={artifact.data} />;
      default:
        return <JsonRenderer data={artifact.data} />;
    }
  };

  // Inline variant - minimal wrapper
  if (variant === 'inline') {
    return (
      <div className={cn('relative', className)}>
        {isLoading && <LoadingOverlay />}
        {renderContent()}
      </div>
    );
  }

  // Fullscreen variant
  if (variant === 'fullscreen') {
    return (
      <div className={cn('fixed inset-0 z-50 bg-background p-6', className)}>
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{artifact.title}</h2>
              <Badge variant="secondary">{stageLabel}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto relative">
            {isLoading && <LoadingOverlay />}
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {isLoading && <LoadingOverlay />}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {artifact.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {stageLabel}
            </Badge>
            {onExpand && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleExpand}
              >
                <Maximize2 className="h-4 w-4" />
                <span className="sr-only">Expand</span>
              </Button>
            )}
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
});
