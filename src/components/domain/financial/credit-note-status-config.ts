/**
 * Credit Note Status Configuration
 *
 * Status badge configurations for credit note statuses.
 * Uses semantic colors for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import { Clock, FileText, CheckCircle, Ban } from 'lucide-react';
import type { SemanticStatusConfigItem } from '@/components/shared/data-table';
import type { CreditNoteStatus } from '@/lib/schemas/financial/credit-notes';

// ============================================================================
// TABLE STATUS CONFIG (with semantic colors)
// ============================================================================

/**
 * Credit note status configuration for StatusCell
 */
export const CREDIT_NOTE_STATUS_CONFIG: Record<CreditNoteStatus, SemanticStatusConfigItem> = {
  draft: {
    label: 'Draft',
    color: 'draft',
    icon: Clock,
  },
  issued: {
    label: 'Issued',
    color: 'info',
    icon: FileText,
  },
  applied: {
    label: 'Applied',
    color: 'success',
    icon: CheckCircle,
  },
  voided: {
    label: 'Voided',
    color: 'error',
    icon: Ban,
  },
};
