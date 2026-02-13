/**
 * escalateIssue Schema Unit Tests
 *
 * Validates behavior of escalateIssue input schema:
 * - Valid inputs are accepted
 * - Invalid inputs are rejected (missing fields, wrong types, invalid UUIDs)
 *
 * @see src/server/functions/support/escalation.ts
 */

import { describe, it, expect } from 'vitest';
import { escalateIssueSchema } from '@/server/functions/support/escalation';

const VALID_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_USER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('escalateIssueSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: VALID_ISSUE_ID,
      reason: 'Customer escalation requested',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issueId).toBe(VALID_ISSUE_ID);
      expect(result.data.reason).toBe('Customer escalation requested');
      expect(result.data.escalateToUserId).toBeUndefined();
    }
  });

  it('accepts valid input with optional escalateToUserId', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: VALID_ISSUE_ID,
      reason: 'Needs senior review',
      escalateToUserId: VALID_USER_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escalateToUserId).toBe(VALID_USER_ID);
    }
  });

  it('rejects missing issueId', () => {
    const result = escalateIssueSchema.safeParse({
      reason: 'Some reason',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing reason', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: VALID_ISSUE_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid issueId (not UUID)', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: 'not-a-uuid',
      reason: 'Some reason',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty reason', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: VALID_ISSUE_ID,
      reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reason exceeding max length (1000)', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: VALID_ISSUE_ID,
      reason: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid escalateToUserId when provided', () => {
    const result = escalateIssueSchema.safeParse({
      issueId: VALID_ISSUE_ID,
      reason: 'Some reason',
      escalateToUserId: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
