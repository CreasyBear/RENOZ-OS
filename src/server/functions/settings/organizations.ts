/**
 * Organization Server Functions
 *
 * Server functions for organization profile and settings management.
 * Manages organization-level configuration, branding, and contact info.
 *
 * @see drizzle/schema/organizations.ts for database schema
 * @see src/lib/schemas/settings.ts for validation schemas
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/lib/db';
import { organizations } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '../_shared/audit-logs';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from 'drizzle/schema';
import { NotFoundError } from '@/lib/server/errors';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const addressSchema = z.object({
  street1: z.string().max(255).optional(),
  street2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

const settingsSchema = z.object({
  timezone: z.string().max(100).optional(),
  locale: z.string().max(20).optional(),
  currency: z.string().length(3).optional(),
  dateFormat: z.string().max(50).optional(),
  fiscalYearStart: z.number().int().min(1).max(12).optional(),
  defaultPaymentTerms: z.number().int().min(0).max(365).optional(),
  portalBranding: z
    .object({
      logoUrl: z.string().url().optional().or(z.literal('')),
      primaryColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      secondaryColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      websiteUrl: z.string().url().optional().or(z.literal('')),
    })
    .partial()
    .optional(),
});

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal('')),
  abn: z.string().max(50).optional(),
  address: addressSchema.optional(),
  settings: settingsSchema.optional(),
  branding: brandingSchema.optional(),
});

// ============================================================================
// GET CURRENT ORGANIZATION
// ============================================================================

/**
 * Get the current user's organization details.
 * All authenticated users can view their organization.
 */
/**
 * Get organization details for the current user.
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getOrganization = cache(async (organizationId: string) => {
  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      abn: organizations.abn,
      email: organizations.email,
      phone: organizations.phone,
      website: organizations.website,
      address: organizations.address,
      // Tier 1 Settings (first-class columns)
      timezone: organizations.timezone,
      locale: organizations.locale,
      currency: organizations.currency,
      dateFormat: organizations.dateFormat,
      timeFormat: organizations.timeFormat,
      numberFormat: organizations.numberFormat,
      fiscalYearStart: organizations.fiscalYearStart,
      weekStartDay: organizations.weekStartDay,
      defaultTaxRate: organizations.defaultTaxRate,
      defaultPaymentTerms: organizations.defaultPaymentTerms,
      // Legacy JSONB (for portal branding and deprecated settings)
      settings: organizations.settings,
      branding: organizations.branding,
      plan: organizations.plan,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!organization) {
    throw new NotFoundError('Organization not found', 'organization');
  }

  return organization;
});

export const getOrganization = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();
  return _getOrganization(ctx.organizationId);
});

// ============================================================================
// UPDATE ORGANIZATION
// ============================================================================

/**
 * Update organization details.
 * Requires: org.update permission (typically admin/owner)
 */
export const updateOrganization = createServerFn({ method: 'POST' })
  .inputValidator(updateOrganizationSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization?.update });

    // Get current values for audit
    const [currentOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!currentOrg) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    // Build update object with merged nested fields
    const updateData: Partial<typeof currentOrg> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.abn !== undefined) updateData.abn = data.abn || null;

    // Merge address
    if (data.address !== undefined) {
      updateData.address = {
        ...(currentOrg.address as Record<string, string>),
        ...data.address,
      };
    }

    // Merge settings
    if (data.settings !== undefined) {
      updateData.settings = {
        ...(currentOrg.settings as Record<string, unknown>),
        ...data.settings,
      };
    }

    // Merge branding
    if (data.branding !== undefined) {
      updateData.branding = {
        ...(currentOrg.branding as Record<string, string>),
        ...data.branding,
      };
    }

    const [updated] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, ctx.organizationId))
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: AUDIT_ACTIONS.USER_UPDATE, // Using user update since no specific org action
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: ctx.organizationId,
      oldValues: {
        name: currentOrg.name,
        email: currentOrg.email,
        address: currentOrg.address,
        settings: currentOrg.settings,
        branding: currentOrg.branding,
      },
      newValues: {
        name: updated.name,
        email: updated.email,
        address: updated.address,
        settings: updated.settings,
        branding: updated.branding,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      abn: updated.abn,
      email: updated.email,
      phone: updated.phone,
      website: updated.website,
      address: updated.address,
      settings: updated.settings,
      branding: updated.branding,
      plan: updated.plan,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });

// ============================================================================
// GET ORGANIZATION SETTINGS
// ============================================================================

/**
 * Get organization settings only (for quick access).
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getOrganizationSettings = cache(async (organizationId: string) => {
  const [organization] = await db
    .select({
      id: organizations.id,
      // Tier 1 Settings (first-class columns - preferred source)
      timezone: organizations.timezone,
      locale: organizations.locale,
      currency: organizations.currency,
      dateFormat: organizations.dateFormat,
      timeFormat: organizations.timeFormat,
      numberFormat: organizations.numberFormat,
      fiscalYearStart: organizations.fiscalYearStart,
      weekStartDay: organizations.weekStartDay,
      defaultTaxRate: organizations.defaultTaxRate,
      defaultPaymentTerms: organizations.defaultPaymentTerms,
      // Legacy JSONB (for portalBranding only)
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!organization) {
    throw new NotFoundError('Organization not found', 'organization');
  }

  // Return merged settings: columns preferred, JSONB for portalBranding
  const legacySettings = organization.settings as Record<string, unknown> | null;
  return {
    timezone: organization.timezone,
    locale: organization.locale,
    currency: organization.currency,
    dateFormat: organization.dateFormat,
    // Cast to match OrganizationSettings schema enum types
    timeFormat: organization.timeFormat as '12h' | '24h',
    numberFormat: organization.numberFormat as '1,234.56' | '1.234,56' | '1 234,56',
    fiscalYearStart: organization.fiscalYearStart,
    weekStartDay: organization.weekStartDay,
    defaultTaxRate: organization.defaultTaxRate,
    defaultPaymentTerms: organization.defaultPaymentTerms,
    portalBranding: legacySettings?.portalBranding ?? {},
  };
});

export const getOrganizationSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();
  return _getOrganizationSettings(ctx.organizationId);
});

// ============================================================================
// UPDATE ORGANIZATION SETTINGS
// ============================================================================

/**
 * Update organization settings only.
 * Requires: org.update permission
 */
export const updateOrganizationSettings = createServerFn({ method: 'POST' })
  .inputValidator(settingsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization?.update });

    const [currentOrg] = await db
      .select({
        id: organizations.id,
        settings: organizations.settings,
        timezone: organizations.timezone,
        locale: organizations.locale,
        currency: organizations.currency,
        dateFormat: organizations.dateFormat,
        timeFormat: organizations.timeFormat,
        numberFormat: organizations.numberFormat,
        fiscalYearStart: organizations.fiscalYearStart,
        weekStartDay: organizations.weekStartDay,
        defaultTaxRate: organizations.defaultTaxRate,
        defaultPaymentTerms: organizations.defaultPaymentTerms,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!currentOrg) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    // Build update object with DOUBLE WRITE (columns + JSONB for backward compat)
    const updatePayload: Record<string, unknown> = {};

    // Write to Tier 1 columns (preferred)
    if (data.timezone !== undefined) updatePayload.timezone = data.timezone;
    if (data.locale !== undefined) updatePayload.locale = data.locale;
    if (data.currency !== undefined) updatePayload.currency = data.currency;
    if (data.dateFormat !== undefined) updatePayload.dateFormat = data.dateFormat;
    if (data.fiscalYearStart !== undefined) updatePayload.fiscalYearStart = data.fiscalYearStart;
    if (data.defaultPaymentTerms !== undefined) updatePayload.defaultPaymentTerms = data.defaultPaymentTerms;

    // Also write to JSONB for backward compatibility (Double Write)
    const newSettings = {
      ...(currentOrg.settings as Record<string, unknown>),
      ...data,
    };
    updatePayload.settings = newSettings;

    const [updated] = await db
      .update(organizations)
      .set(updatePayload)
      .where(eq(organizations.id, ctx.organizationId))
      .returning({
        id: organizations.id,
        timezone: organizations.timezone,
        locale: organizations.locale,
        currency: organizations.currency,
        dateFormat: organizations.dateFormat,
        timeFormat: organizations.timeFormat,
        numberFormat: organizations.numberFormat,
        fiscalYearStart: organizations.fiscalYearStart,
        weekStartDay: organizations.weekStartDay,
        defaultTaxRate: organizations.defaultTaxRate,
        defaultPaymentTerms: organizations.defaultPaymentTerms,
        settings: organizations.settings,
      });

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'settings.update',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: ctx.organizationId,
      oldValues: { settings: currentOrg.settings },
      newValues: { settings: updated.settings },
    });

    // Return merged settings (columns preferred)
    const legacySettings = updated.settings as Record<string, unknown> | null;
    return {
      timezone: updated.timezone,
      locale: updated.locale,
      currency: updated.currency,
      dateFormat: updated.dateFormat,
      timeFormat: updated.timeFormat,
      numberFormat: updated.numberFormat,
      fiscalYearStart: updated.fiscalYearStart,
      weekStartDay: updated.weekStartDay,
      defaultTaxRate: updated.defaultTaxRate,
      defaultPaymentTerms: updated.defaultPaymentTerms,
      portalBranding: legacySettings?.portalBranding ?? {},
    };
  });

// ============================================================================
// GET ORGANIZATION BRANDING
// ============================================================================

/**
 * Get organization branding for public display.
 * Available to all authenticated users.
 */
export const getOrganizationBranding = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();

  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      branding: organizations.branding,
    })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1);

  if (!organization) {
    throw new NotFoundError('Organization not found', 'organization');
  }

  return {
    name: organization.name,
    ...organization.branding,
  };
});

// ============================================================================
// UPDATE ORGANIZATION BRANDING
// ============================================================================

/**
 * Update organization branding.
 * Requires: org.update permission
 */
export const updateOrganizationBranding = createServerFn({ method: 'POST' })
  .inputValidator(brandingSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.organization?.update });

    const [currentOrg] = await db
      .select({
        id: organizations.id,
        branding: organizations.branding,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!currentOrg) {
      throw new NotFoundError('Organization not found', 'organization');
    }

    const newBranding = {
      ...(currentOrg.branding as Record<string, string>),
      ...data,
    };

    const [updated] = await db
      .update(organizations)
      .set({ branding: newBranding })
      .where(eq(organizations.id, ctx.organizationId))
      .returning({
        id: organizations.id,
        name: organizations.name,
        branding: organizations.branding,
      });

    // Log audit event
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'branding.update',
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: ctx.organizationId,
      oldValues: { branding: currentOrg.branding },
      newValues: { branding: updated.branding },
    });

    return {
      name: updated.name,
      ...updated.branding,
    };
  });
