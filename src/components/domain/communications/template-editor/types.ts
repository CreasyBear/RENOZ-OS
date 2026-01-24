/**
 * Template Editor Types (Presenter)
 *
 * Type definitions for the template editor presenter component.
 * All mutations are handled by the container.
 *
 * @see DOM-COMMS-007
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */

import { z } from 'zod';
import type { TemplateCategory } from '../../../../../drizzle/schema';

// ============================================================================
// SCHEMAS
// ============================================================================

export const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum([
    'quotes',
    'orders',
    'installations',
    'warranty',
    'support',
    'marketing',
    'follow_up',
    'custom',
  ]),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body is required'),
  isActive: z.boolean(),
  createVersion: z.boolean(),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

// ============================================================================
// COMPONENT TYPES
// ============================================================================

/**
 * Props for the TemplateEditor presenter component.
 * All mutations are handled by the container.
 */
export interface TemplateEditorProps {
  template?: {
    id: string;
    name: string;
    description?: string | null;
    category: TemplateCategory;
    subject: string;
    bodyHtml: string;
    isActive: boolean;
    version: number;
  };
  /** @source useCreateEmailTemplate() or useUpdateEmailTemplate() in container */
  onSubmit: (values: TemplateFormValues) => Promise<void>;
  onCancel?: () => void;
  onViewHistory?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: 'quotes', label: 'Quotes' },
  { value: 'orders', label: 'Orders' },
  { value: 'installations', label: 'Installations' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'support', label: 'Support' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'custom', label: 'Custom' },
];
