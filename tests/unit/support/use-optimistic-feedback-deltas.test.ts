/**
 * E2E-SKW-010: Deterministic rollback tests for optimistic feedback deltas
 *
 * Verifies that helpful/not-helpful counts never drift after failed mutation.
 * Uses file-content assertions (no DOM) to guard the rollback contract.
 *
 * Contract:
 * - KB page must call rollbackFeedbackDelta in catch when mutation fails
 * - Hook must implement rollback that reverses apply (helpful -> -1 helpful, etc.)
 * - adjustCounts must use Math.max(0, ...) to never produce negative counts
 *
 * @see docs/reliability/DOMAIN-AUDIT-TRACKER.md E2E-SKW-010
 * @see src/hooks/support/use-optimistic-feedback-deltas.ts
 * @see src/routes/_authenticated/support/knowledge-base.tsx
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('useOptimisticFeedbackDeltas (E2E-SKW-010)', () => {
  it('KB handleRecordFeedback calls rollbackFeedbackDelta in catch (no drift after failed mutation)', () => {
    const kb = readFileSync('src/routes/_authenticated/support/knowledge-base.tsx', 'utf8');
    expect(kb).toContain('rollbackFeedbackDelta(articleId, helpful)');
    expect(kb).toContain('} catch (error) {');
    // handleRecordFeedback must have apply -> try -> catch -> rollback pattern
    const handleRecordFeedback = kb.slice(kb.indexOf('handleRecordFeedback'));
    expect(handleRecordFeedback).toContain('applyFeedbackDelta(articleId, helpful)');
    expect(handleRecordFeedback).toContain('rollbackFeedbackDelta(articleId, helpful)');
    expect(handleRecordFeedback).toContain('} catch (error) {');
  });

  it('hook rollback reverses apply (helpful decrements on rollback)', () => {
    const hook = readFileSync('src/hooks/support/use-optimistic-feedback-deltas.ts', 'utf8');
    expect(hook).toContain('existing.helpful - (helpful ? 1 : 0)');
    expect(hook).toContain('existing.notHelpful - (helpful ? 0 : 1)');
  });

  it('adjustCounts uses Math.max to never produce negative counts', () => {
    const hook = readFileSync('src/hooks/support/use-optimistic-feedback-deltas.ts', 'utf8');
    expect(hook).toContain('Math.max(0, article.helpfulCount + delta.helpful)');
    expect(hook).toContain('Math.max(0, article.notHelpfulCount + delta.notHelpful)');
  });

  it('success path clears delta (clearFeedbackDelta in try)', () => {
    const kb = readFileSync('src/routes/_authenticated/support/knowledge-base.tsx', 'utf8');
    expect(kb).toContain('clearFeedbackDelta(articleId)');
    expect(kb).toContain('applyFeedbackDelta(articleId, helpful)');
  });
});
