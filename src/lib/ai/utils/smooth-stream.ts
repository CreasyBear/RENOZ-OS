/**
 * Stream Smoothing Utilities
 *
 * Provides smooth text streaming for a more natural reading experience.
 * Uses AI SDK's smoothStream transform to buffer and release content smoothly.
 *
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/smooth-stream
 */

import { smoothStream } from 'ai';

// ============================================================================
// TYPES
// ============================================================================

export type ChunkingMode = 'word' | 'line' | RegExp;

export interface SmoothStreamOptions {
  /**
   * Delay between outputting each chunk in milliseconds.
   * @default 10
   */
  delayInMs?: number | null;
  /**
   * How to chunk the text for streaming.
   * - 'word': Stream word by word (default)
   * - 'line': Stream line by line
   * - RegExp: Custom chunking pattern
   * @default 'word'
   */
  chunking?: ChunkingMode;
}

// ============================================================================
// PRESETS
// ============================================================================

/**
 * Default smooth stream configuration.
 * Word-by-word streaming with 10ms delay.
 */
export const DEFAULT_SMOOTH_STREAM = smoothStream();

/**
 * Fast smooth stream for quick responses.
 * Word-by-word streaming with 5ms delay.
 */
export const FAST_SMOOTH_STREAM = smoothStream({
  delayInMs: 5,
  chunking: 'word',
});

/**
 * Slow smooth stream for dramatic effect.
 * Word-by-word streaming with 20ms delay.
 */
export const SLOW_SMOOTH_STREAM = smoothStream({
  delayInMs: 20,
  chunking: 'word',
});

/**
 * Line-by-line streaming for code or structured content.
 * Buffers until newline, then releases the whole line.
 */
export const LINE_SMOOTH_STREAM = smoothStream({
  delayInMs: 15,
  chunking: 'line',
});

/**
 * Instant streaming (no smoothing).
 * Pass through content immediately as received.
 */
export const NO_SMOOTH_STREAM = smoothStream({
  delayInMs: null,
});

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a custom smooth stream transform.
 *
 * @example
 * ```typescript
 * import { createSmoothStream } from '@/lib/ai/utils/smooth-stream';
 * import { streamText } from 'ai';
 *
 * const result = await streamText({
 *   model,
 *   prompt,
 *   experimental_transform: createSmoothStream({ delayInMs: 15 }),
 * });
 * ```
 */
export function createSmoothStream(options?: SmoothStreamOptions) {
  return smoothStream({
    delayInMs: options?.delayInMs ?? 10,
    chunking: options?.chunking ?? 'word',
  });
}

/**
 * Get the appropriate smooth stream based on content type.
 *
 * @param contentType - The type of content being streamed
 * @returns A smooth stream transform appropriate for the content type
 */
export function getSmoothStreamForContent(
  contentType: 'chat' | 'code' | 'report' | 'fast' | 'none'
) {
  switch (contentType) {
    case 'chat':
      return DEFAULT_SMOOTH_STREAM;
    case 'code':
      return LINE_SMOOTH_STREAM;
    case 'report':
      return SLOW_SMOOTH_STREAM;
    case 'fast':
      return FAST_SMOOTH_STREAM;
    case 'none':
      return NO_SMOOTH_STREAM;
    default:
      return DEFAULT_SMOOTH_STREAM;
  }
}
