/**
 * Entity Verification Registry
 *
 * Internal table/column config for entity verification.
 * Explicit helpers in entity-verification.ts remain the primary API.
 * Use this registry when adding new entity types or for generic verification.
 *
 * @internal
 */

export interface EntityConfig {
  tableName: string;
  idColumn: string;
  orgColumn: string;
  /** Optional soft-delete column; if specified, filter to isNull(column) */
  deletedAtColumn?: string;
}

/** Registry of entity types. Documents table config for each verified entity. */
export const ENTITY_REGISTRY: Record<string, EntityConfig> = {
  customer: {
    tableName: 'customers',
    idColumn: 'id',
    orgColumn: 'organizationId',
    deletedAtColumn: 'deletedAt',
  },
  order: {
    tableName: 'orders',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
  product: {
    tableName: 'products',
    idColumn: 'id',
    orgColumn: 'organizationId',
    deletedAtColumn: 'deletedAt',
  },
  job: {
    tableName: 'job_assignments',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
  project: {
    tableName: 'projects',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
  warranty: {
    tableName: 'warranties',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
  warrantyClaim: {
    tableName: 'warranty_claims',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
  opportunity: {
    tableName: 'opportunities',
    idColumn: 'id',
    orgColumn: 'organizationId',
    deletedAtColumn: 'deletedAt',
  },
  siteVisit: {
    tableName: 'site_visits',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
  jobMaterial: {
    tableName: 'job_materials',
    idColumn: 'id',
    orgColumn: 'organizationId',
  },
} as const;

/** Entity type keys for type-safe registry access. */
export type EntityType = keyof typeof ENTITY_REGISTRY;
