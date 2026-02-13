/**
 * Generated Documents Schema
 *
 * Audit table for tracking all generated documents (PDFs, certificates, etc.)
 * across the system. Provides a centralized record of document generation.
 *
 * Table category: business (per column-patterns.json)
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "./_shared/patterns";
import { organizations } from "./settings/organizations";
import { users } from "./users/users";

// ============================================================================
// GENERATED DOCUMENTS TABLE
// ============================================================================

export const generatedDocuments = pgTable(
  "generated_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Document classification
    documentType: text("document_type").notNull(), // e.g., "quote", "invoice", "warranty_certificate"
    entityType: text("entity_type").notNull(), // e.g., "order", "warranty"
    entityId: uuid("entity_id").notNull(), // Reference to the parent entity

    // File details
    filename: text("filename").notNull(),
    storageUrl: text("storage_url").notNull(),
    fileSize: integer("file_size"), // Size in bytes

    // Generation metadata
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    generatedById: uuid("generated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Regeneration tracking (incremented on each regenerate)
    regenerationCount: integer("regeneration_count").notNull().default(0),

    // Standard timestamps
    ...timestampColumns,
  },
  (table) => ({
    // UNIQUE: One document per entity per type per org (enables upsert)
    // This is the core constraint that prevents duplicate documents
    uniqueDocPerEntity: uniqueIndex("idx_generated_documents_unique_per_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.documentType
    ),

    // Primary lookup by entity (for listing all docs of an entity)
    entityIdx: index("idx_generated_documents_entity").on(
      table.entityType,
      table.entityId
    ),

    // Document type queries
    orgDocTypeIdx: index("idx_generated_documents_org_doc_type").on(
      table.organizationId,
      table.documentType
    ),

    // User's generated documents
    generatedByIdx: index("idx_generated_documents_generated_by").on(
      table.generatedById
    ),

    // Recent documents
    orgCreatedIdx: index("idx_generated_documents_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("generated_documents"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const generatedDocumentsRelations = relations(
  generatedDocuments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [generatedDocuments.organizationId],
      references: [organizations.id],
    }),
    generatedBy: one(users, {
      fields: [generatedDocuments.generatedById],
      references: [users.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
