/**
 * Tool Streaming Utilities
 *
 * Utilities for tools that need to stream progressive results.
 * Implements ARCH-003 streaming pattern from helicopter review.
 *
 * @see patterns/04-tool-patterns.md
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Status of a streaming tool result.
 */
export type ToolStreamStatus =
  | 'loading'
  | 'fetching_data'
  | 'processing'
  | 'analyzing'
  | 'complete'
  | 'error';

/**
 * A progressive streaming result from a tool.
 */
export interface StreamingToolResult<T = unknown> {
  /** Current status */
  status: ToolStreamStatus;
  /** Progress message for UI */
  message?: string;
  /** Partial data (may be incomplete) */
  data?: Partial<T>;
  /** Final complete data (only when status is 'complete') */
  result?: T;
  /** Error message (only when status is 'error') */
  error?: string;
}

// ============================================================================
// STREAMING HELPERS
// ============================================================================

/**
 * Create a loading state for streaming tools.
 */
export function createLoadingState(message: string = 'Loading...'): StreamingToolResult {
  return {
    status: 'loading',
    message,
  };
}

/**
 * Create a progress state for streaming tools.
 */
export function createProgressState<T>(
  status: ToolStreamStatus,
  message: string,
  partialData?: Partial<T>
): StreamingToolResult<T> {
  return {
    status,
    message,
    data: partialData,
  };
}

/**
 * Create a complete state for streaming tools.
 */
export function createCompleteState<T>(result: T): StreamingToolResult<T> {
  return {
    status: 'complete',
    result,
  };
}

/**
 * Create an error state for streaming tools.
 */
export function createErrorState(error: string): StreamingToolResult {
  return {
    status: 'error',
    error,
  };
}

// ============================================================================
// ASYNC GENERATOR WRAPPER
// ============================================================================

/**
 * Type for a streaming tool execute function.
 * Use this type signature for tools that need progressive streaming.
 *
 * @example
 * ```typescript
 * const generateReport: StreamingToolExecute<ReportResult> = async function* (params, context) {
 *   yield createLoadingState('Generating report...');
 *
 *   const data = await fetchReportData(params);
 *   yield createProgressState('processing', 'Processing data...', { rowCount: data.length });
 *
 *   const analysis = await analyzeData(data);
 *   yield createProgressState('analyzing', 'Running analysis...', { analysis: analysis.summary });
 *
 *   const result = formatReport(data, analysis);
 *   yield createCompleteState(result);
 * };
 * ```
 */
export type StreamingToolExecute<TResult, TParams = unknown, TContext = unknown> = (
  params: TParams,
  context: TContext
) => AsyncGenerator<StreamingToolResult<TResult>, void, unknown>;

/**
 * Convert a streaming tool result generator to an array of results.
 * Useful for testing or when you need all intermediate states.
 */
export async function collectStreamingResults<T>(
  generator: AsyncGenerator<StreamingToolResult<T>, void, unknown>
): Promise<StreamingToolResult<T>[]> {
  const results: StreamingToolResult<T>[] = [];
  for await (const result of generator) {
    results.push(result);
  }
  return results;
}

/**
 * Get only the final result from a streaming tool.
 * Consumes the generator and returns the last yielded value.
 */
export async function getFinalResult<T>(
  generator: AsyncGenerator<StreamingToolResult<T>, void, unknown>
): Promise<StreamingToolResult<T> | undefined> {
  let lastResult: StreamingToolResult<T> | undefined;
  for await (const result of generator) {
    lastResult = result;
  }
  return lastResult;
}

// ============================================================================
// NON-STREAMING TOOL PATTERN
// ============================================================================

/**
 * For simple tools that don't need streaming, continue using the standard
 * execute function with a direct return. The tool() function from AI SDK
 * handles these correctly.
 *
 * Only use async generators for:
 * - Report generation (multiple steps)
 * - Large data aggregation (progressive loading)
 * - Analysis operations (fetch -> process -> analyze)
 * - Any operation that takes >2 seconds
 *
 * Simple queries like getCustomer and searchCustomers should remain
 * synchronous (returning a Promise directly) for simplicity.
 */
