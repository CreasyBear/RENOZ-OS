/**
 * Custom Fields Server Functions
 *
 * Server functions for managing dynamic custom field definitions.
 * Allows organizations to add custom attributes to entities.
 *
 * @see drizzle/schema/custom-fields.ts for database schema
 * @see drizzle/schema/custom-field-values.ts for values schema
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, and, sql, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  customFields,
  customFieldValues,
  MAX_CUSTOM_FIELDS_PER_ENTITY,
  type CustomFieldOption,
  type CustomFieldValidation,
  type CustomFieldMetadata,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logAuditEvent } from '../_shared/audit-logs-internal';
import { idParamSchema } from '@/lib/schemas';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/server/errors';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const fieldTypeSchema = z.enum([
  'text',
  'number',
  'date',
  'select',
  'checkbox',
  'textarea',
  'email',
  'url',
  'phone',
  'multiselect',
]);

const entityTypeSchema = z.enum([
  'customer',
  'contact',
  'order',
  'product',
  'supplier',
  'opportunity',
  'issue',
  'job',
]);

const optionSchema = z.object({
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isDefault: z.boolean().optional(),
});

const validationRulesSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().max(500).optional(),
  patternMessage: z.string().max(200).optional(),
  errorMessage: z.string().max(200).optional(),
});

const metadataSchema = z.object({
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  showInList: z.boolean().optional(),
  searchable: z.boolean().optional(),
  indexed: z.boolean().optional(),
});

const createCustomFieldSchema = z.object({
  entityType: entityTypeSchema,
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'Name must be lowercase with underscores'),
  label: z.string().min(1).max(100),
  fieldType: fieldTypeSchema,
  options: z.array(optionSchema).max(50).optional(),
  isRequired: z.boolean().default(false),
  validationRules: validationRulesSchema.optional(),
  defaultValue: z.unknown().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  metadata: metadataSchema.optional(),
});

const updateCustomFieldSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(100).optional(),
  options: z.array(optionSchema).max(50).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  validationRules: validationRulesSchema.optional(),
  defaultValue: z.unknown().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  metadata: metadataSchema.optional(),
});

const listCustomFieldsSchema = z.object({
  entityType: entityTypeSchema,
  includeInactive: z.boolean().optional().default(false),
});

const setFieldValueSchema = z.object({
  customFieldId: z.string().uuid(),
  entityId: z.string().uuid(),
  value: z.unknown(),
});

const getFieldValuesSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
});

const reorderFieldsSchema = z.object({
  entityType: entityTypeSchema,
  fieldIds: z.array(z.string().uuid()).min(1).max(50),
});

// ============================================================================
// LIST CUSTOM FIELDS
// ============================================================================

/**
 * List custom fields for an entity type.
 */
export const listCustomFields = createServerFn({ method: 'GET' })
  .inputValidator(listCustomFieldsSchema)
  // @ts-expect-error - TanStack Start type inference limitation with complex returns
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const conditions = [
      eq(customFields.organizationId, ctx.organizationId),
      eq(customFields.entityType, data.entityType),
    ];

    if (!data.includeInactive) {
      conditions.push(eq(customFields.isActive, true));
    }

    const fields = await db
      .select({
        id: customFields.id,
        organizationId: customFields.organizationId,
        entityType: customFields.entityType,
        name: customFields.name,
        label: customFields.label,
        fieldType: customFields.fieldType,
        options: customFields.options,
        isRequired: customFields.isRequired,
        isActive: customFields.isActive,
        validationRules: customFields.validationRules,
        defaultValue: customFields.defaultValue,
        sortOrder: customFields.sortOrder,
        metadata: customFields.metadata,
        createdAt: customFields.createdAt,
        updatedAt: customFields.updatedAt,
      })
      .from(customFields)
      .where(and(...conditions))
      .orderBy(asc(customFields.sortOrder), asc(customFields.label));

    return { items: fields } as unknown as { items: typeof fields };
  });

// ============================================================================
// GET CUSTOM FIELD
// ============================================================================

/**
 * Get a single custom field by ID.
 */
export const getCustomField = createServerFn({ method: 'GET' })
  .inputValidator(idParamSchema)
  // @ts-expect-error - TanStack Start type inference limitation with complex returns
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    const [field] = await db
      .select()
      .from(customFields)
      .where(and(eq(customFields.id, data.id), eq(customFields.organizationId, ctx.organizationId)))
      .limit(1);

    if (!field) {
      throw new NotFoundError('Custom field not found', 'customField');
    }

    return field as unknown as typeof field;
  });

// ============================================================================
// CREATE CUSTOM FIELD
// ============================================================================

/**
 * Create a new custom field.
 * Requires: settings.update permission
 */
export const createCustomField = createServerFn({ method: 'POST' })
  .inputValidator(createCustomFieldSchema)
  // @ts-expect-error - TanStack Start type inference limitation with complex returns
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const created = await db.transaction(async (tx) => {
      // Check max fields limit
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(customFields)
        .where(
          and(
            eq(customFields.organizationId, ctx.organizationId),
            eq(customFields.entityType, data.entityType)
          )
        );

      if (count >= MAX_CUSTOM_FIELDS_PER_ENTITY) {
        throw new ValidationError(`Maximum of ${MAX_CUSTOM_FIELDS_PER_ENTITY} custom fields per entity type`);
      }

      // Check for duplicate name
      const [existing] = await tx
        .select({ id: customFields.id })
        .from(customFields)
        .where(
          and(
            eq(customFields.organizationId, ctx.organizationId),
            eq(customFields.entityType, data.entityType),
            eq(customFields.name, data.name)
          )
        )
        .limit(1);

      if (existing) {
        throw new ConflictError('A custom field with this name already exists');
      }

      // Get next sort order if not specified
      let sortOrder = data.sortOrder;
      if (sortOrder === undefined) {
        const [{ maxOrder }] = await tx
          .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)::int` })
          .from(customFields)
          .where(
            and(
              eq(customFields.organizationId, ctx.organizationId),
              eq(customFields.entityType, data.entityType)
            )
          );
        sortOrder = maxOrder + 1;
      }

      const [inserted] = await tx
        .insert(customFields)
      .values({
        organizationId: ctx.organizationId,
        entityType: data.entityType,
        name: data.name,
        label: data.label,
        fieldType: data.fieldType,
        options: (data.options as CustomFieldOption[]) ?? [],
        isRequired: data.isRequired,
        validationRules: (data.validationRules as CustomFieldValidation) ?? {},
        defaultValue: data.defaultValue,
        sortOrder,
        metadata: (data.metadata as CustomFieldMetadata) ?? {},
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
        .returning();

      return inserted;
    });

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'custom_field.create',
      entityType: 'custom_field',
      entityId: created.id,
      newValues: {
        entityType: data.entityType,
        name: data.name,
        label: data.label,
        fieldType: data.fieldType,
      },
    });

    return created as unknown as typeof created;
  });

// ============================================================================
// UPDATE CUSTOM FIELD
// ============================================================================

/**
 * Update an existing custom field.
 * Note: Cannot change entityType, name, or fieldType after creation.
 * Requires: settings.update permission
 */
export const updateCustomField = createServerFn({ method: 'POST' })
  .inputValidator(updateCustomFieldSchema)
  // @ts-expect-error - TanStack Start type inference limitation with complex returns
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    const [current] = await db
      .select()
      .from(customFields)
      .where(and(eq(customFields.id, data.id), eq(customFields.organizationId, ctx.organizationId)))
      .limit(1);

    if (!current) {
      throw new NotFoundError('Custom field not found', 'customField');
    }

    const updateData: Partial<typeof current> = { updatedBy: ctx.user.id };
    if (data.label !== undefined) updateData.label = data.label;
    if (data.options !== undefined) updateData.options = data.options as CustomFieldOption[];
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.validationRules !== undefined)
      updateData.validationRules = data.validationRules as CustomFieldValidation;
    if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as CustomFieldMetadata;

    const [updated] = await db
      .update(customFields)
      .set({ ...updateData, version: sql`${customFields.version} + 1` })
      .where(eq(customFields.id, data.id))
      .returning();

    // Log audit
    await logAuditEvent({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: 'custom_field.update',
      entityType: 'custom_field',
      entityId: updated.id,
      oldValues: { label: current.label, isActive: current.isActive },
      newValues: { label: updated.label, isActive: updated.isActive },
    });

    return updated as typeof updated;
  });

// ============================================================================
// DELETE CUSTOM FIELD
// ============================================================================

/**
 * Delete a custom field and all its values.
 * Requires: settings.update permission
 */
export const deleteCustomField = createServerFn({ method: 'POST' })
  .inputValidator(idParamSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    return db.transaction(async (tx) => {
      const [field] = await tx
        .select({ id: customFields.id, name: customFields.name, entityType: customFields.entityType })
        .from(customFields)
        .where(and(eq(customFields.id, data.id), eq(customFields.organizationId, ctx.organizationId)))
        .limit(1);

      if (!field) {
        throw new NotFoundError('Custom field not found', 'customField');
      }

      // Delete values first (cascade should handle this, but explicit is safer)
      await tx.delete(customFieldValues).where(eq(customFieldValues.customFieldId, data.id));

      // Delete field
      await tx.delete(customFields).where(eq(customFields.id, data.id));

      return field;
    }).then(async (field) => {
      // Log audit outside transaction (fire-and-forget acceptable)
      await logAuditEvent({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: 'custom_field.delete',
        entityType: 'custom_field',
        entityId: data.id,
        oldValues: { name: field.name, entityType: field.entityType },
      });
      return { success: true };
    });
  });

// ============================================================================
// REORDER CUSTOM FIELDS
// ============================================================================

/**
 * Reorder custom fields by setting their sort orders.
 * Requires: settings.update permission
 */
export const reorderCustomFields = createServerFn({ method: 'POST' })
  .inputValidator(reorderFieldsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });

    return db.transaction(async (tx) => {
      // Update sort orders based on array position
      for (let i = 0; i < data.fieldIds.length; i++) {
        await tx
          .update(customFields)
          .set({ sortOrder: i, updatedBy: ctx.user.id })
          .where(
            and(
              eq(customFields.id, data.fieldIds[i]),
              eq(customFields.organizationId, ctx.organizationId),
              eq(customFields.entityType, data.entityType)
            )
          );
      }
      return { success: true };
    });
  });

// ============================================================================
// GET FIELD VALUES FOR ENTITY
// ============================================================================

/**
 * Get all custom field values for a specific entity.
 */
export const getCustomFieldValues = createServerFn({ method: 'GET' })
  .inputValidator(getFieldValuesSchema)
  // @ts-expect-error - TanStack Start type inference limitation with complex returns
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get fields with their values
    const fields = await db
      .select({
        field: {
          id: customFields.id,
          name: customFields.name,
          label: customFields.label,
          fieldType: customFields.fieldType,
          options: customFields.options,
          isRequired: customFields.isRequired,
          defaultValue: customFields.defaultValue,
          metadata: customFields.metadata,
        },
        value: {
          id: customFieldValues.id,
          value: customFieldValues.value,
        },
      })
      .from(customFields)
      .leftJoin(
        customFieldValues,
        and(
          eq(customFieldValues.customFieldId, customFields.id),
          eq(customFieldValues.entityId, data.entityId)
        )
      )
      .where(
        and(
          eq(customFields.organizationId, ctx.organizationId),
          eq(customFields.entityType, data.entityType),
          eq(customFields.isActive, true)
        )
      )
      .orderBy(asc(customFields.sortOrder));

    // Transform to map for easy consumption
    const valuesMap: Record<string, unknown> = {};
    for (const { field, value } of fields) {
      valuesMap[field.name] = value?.value ?? field.defaultValue ?? null;
    }

    return {
      fields: fields.map(({ field, value }) => ({
        ...field,
        value: value?.value ?? field.defaultValue ?? null,
        valueId: value?.id ?? null,
      })),
      valuesMap,
    } as const;
  });

// ============================================================================
// SET FIELD VALUE
// ============================================================================

/**
 * Set a custom field value for an entity.
 */
export const setCustomFieldValue = createServerFn({ method: 'POST' })
  .inputValidator(setFieldValueSchema)
  // @ts-expect-error - TanStack Start type inference limitation with complex returns
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return db.transaction(async (tx) => {
      // Verify field exists and belongs to org
      const [field] = await tx
        .select({ id: customFields.id, organizationId: customFields.organizationId })
        .from(customFields)
        .where(eq(customFields.id, data.customFieldId))
        .limit(1);

      if (!field || field.organizationId !== ctx.organizationId) {
        throw new NotFoundError('Custom field not found', 'customField');
      }

      // Upsert value
      const [existing] = await tx
        .select({ id: customFieldValues.id })
        .from(customFieldValues)
        .where(
          and(
            eq(customFieldValues.customFieldId, data.customFieldId),
            eq(customFieldValues.entityId, data.entityId)
          )
        )
        .limit(1);

      if (existing) {
        const [updated] = await tx
          .update(customFieldValues)
          .set({
            value: data.value,
            updatedBy: ctx.user.id,
            version: sql`${customFieldValues.version} + 1`,
          })
          .where(eq(customFieldValues.id, existing.id))
          .returning();

        return updated as typeof updated;
      } else {
        const [created] = await tx
          .insert(customFieldValues)
          .values({
            customFieldId: data.customFieldId,
            entityId: data.entityId,
            value: data.value,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .returning();

        return created as typeof created;
      }
    });
  });

// ============================================================================
// SET MULTIPLE FIELD VALUES
// ============================================================================

const setFieldValuesSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  values: z.record(z.string(), z.unknown()),
});

/**
 * Set multiple custom field values for an entity at once.
 */
export const setCustomFieldValues = createServerFn({ method: 'POST' })
  .inputValidator(setFieldValuesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    return db.transaction(async (tx) => {
      // Get all fields for this entity type
      const fields = await tx
        .select({ id: customFields.id, name: customFields.name })
        .from(customFields)
        .where(
          and(
            eq(customFields.organizationId, ctx.organizationId),
            eq(customFields.entityType, data.entityType),
            eq(customFields.isActive, true)
          )
        );

      const fieldMap = new Map(fields.map((f) => [f.name, f.id]));
      const results: Array<{ fieldName: string; success: boolean }> = [];

      for (const [fieldName, value] of Object.entries(data.values)) {
        const fieldId = fieldMap.get(fieldName);
        if (!fieldId) continue;

        const [existing] = await tx
          .select({ id: customFieldValues.id })
          .from(customFieldValues)
          .where(
            and(
              eq(customFieldValues.customFieldId, fieldId),
              eq(customFieldValues.entityId, data.entityId)
            )
          )
          .limit(1);

        if (existing) {
          await tx
            .update(customFieldValues)
            .set({
              value,
              updatedBy: ctx.user.id,
              version: sql`${customFieldValues.version} + 1`,
            })
            .where(eq(customFieldValues.id, existing.id));
        } else {
          await tx.insert(customFieldValues).values({
            customFieldId: fieldId,
            entityId: data.entityId,
            value,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        }

        results.push({ fieldName, success: true });
      }

      return { results };
    });
  });
