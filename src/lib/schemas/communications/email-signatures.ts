/**
 * Email Signatures Schemas
 *
 * Validation schemas for email signature server functions.
 *
 * @see DOM-COMMS-006
 */
import { z } from 'zod'

export const createSignatureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  isDefault: z.boolean().default(false),
  isCompanyWide: z.boolean().default(false),
})

export const updateSignatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
})

export const getSignaturesSchema = z.object({
  includeCompanyWide: z.boolean().default(true),
})

export const getSignatureSchema = z.object({
  id: z.string().uuid(),
})

export const deleteSignatureSchema = z.object({
  id: z.string().uuid(),
})

export const setDefaultSignatureSchema = z.object({
  id: z.string().uuid(),
})

// ============================================================================
// INPUT TYPES (from Zod schemas)
// ============================================================================

export type CreateSignatureInput = z.infer<typeof createSignatureSchema>
export type UpdateSignatureInput = z.infer<typeof updateSignatureSchema>
export type GetSignaturesInput = z.infer<typeof getSignaturesSchema>
export type GetSignatureInput = z.infer<typeof getSignatureSchema>
export type DeleteSignatureInput = z.infer<typeof deleteSignatureSchema>
export type SetDefaultSignatureInput = z.infer<typeof setDefaultSignatureSchema>

// ============================================================================
// OUTPUT TYPES (from Drizzle schema - what server functions return)
// ============================================================================

import type { EmailSignature } from '../../../../drizzle/schema/communications/email-signatures'

/**
 * Signature output type - matches what getSignatures returns
 * Server functions return EmailSignature rows directly from Drizzle
 */
export type Signature = EmailSignature

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for SignaturesList presenter component
 * All data is passed from the container route.
 */
export interface SignaturesListProps {
  /** @source useEmailSignatures() in container */
  signatures: Signature[]
  /** @source useEmailSignatures().isLoading in container */
  isLoading: boolean
  /** @source useCreateEmailSignature() in container */
  onCreate: (values: SignatureFormValues) => Promise<void>
  /** @source useUpdateEmailSignature() in container */
  onUpdate: (id: string, values: SignatureFormValues) => Promise<void>
  /** @source useDeleteEmailSignature() in container */
  onDelete: (id: string) => Promise<void>
  /** @source useSetDefaultSignature() in container */
  onSetDefault: (id: string) => Promise<void>
  isDeleting?: boolean
  isSettingDefault?: boolean
  isSaving?: boolean
  className?: string
}

/** Form schema for signature editor */
export const signatureFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Signature content is required'),
  isDefault: z.boolean(),
})

/**
 * Signature form values for UI components
 * Used in SignatureEditor component
 */
export type SignatureFormValues = z.infer<typeof signatureFormSchema>

/**
 * Props for SignatureEditor component
 */
export interface SignatureEditorProps {
  signature?: {
    id: string
    name: string
    content: string
    isDefault: boolean
  }
  onSave?: () => void
  onCancel?: () => void
  className?: string
}

/**
 * Props for SignatureSelector component
 */
export interface SignatureSelectorProps {
  value?: string
  onChange: (signatureId: string | null, content: string) => void
  onCreateNew?: () => void
  className?: string
}
