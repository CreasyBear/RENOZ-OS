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

export type CreateSignatureInput = z.infer<typeof createSignatureSchema>
export type UpdateSignatureInput = z.infer<typeof updateSignatureSchema>
export type GetSignaturesInput = z.infer<typeof getSignaturesSchema>
export type GetSignatureInput = z.infer<typeof getSignatureSchema>
export type DeleteSignatureInput = z.infer<typeof deleteSignatureSchema>
export type SetDefaultSignatureInput = z.infer<typeof setDefaultSignatureSchema>
