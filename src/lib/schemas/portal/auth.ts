import { z } from 'zod';

export const portalScopeSchema = z.enum(['customer', 'subcontractor']);

export const requestPortalLinkSchema = z
  .object({
    email: z.string().email(),
    scope: portalScopeSchema,
    customerId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    jobAssignmentId: z.string().uuid().optional(),
    redirectTo: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'customer' && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'customerId is required for customer scope',
        path: ['customerId'],
      });
    }

    if (data.scope === 'subcontractor' && !data.jobAssignmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'jobAssignmentId is required for subcontractor scope',
        path: ['jobAssignmentId'],
      });
    }
  });

export const portalIdentitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  authUserId: z.string().uuid(),
  scope: portalScopeSchema,
  status: z.enum(['active', 'revoked', 'disabled']),
  customerId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  jobAssignmentId: z.string().uuid().nullable().optional(),
  lastSeenAt: z.string().datetime().nullable().optional(),
});

export const getPortalIdentitySchema = z.object({});

export const revokePortalAccessSchema = z.object({
  portalIdentityId: z.string().uuid(),
});
