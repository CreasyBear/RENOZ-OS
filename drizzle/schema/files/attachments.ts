/**
 * Attachments Schema
 *
 * Metadata for all uploaded files stored in Cloudflare R2.
 * Files are stored with presigned URLs for secure direct upload/download.
 *
 * Storage key format: {orgId}/{entityType}/{uuid}-{sanitized-filename}
 *
 * @see file-storage.prd.json for full specification
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgPolicy,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../organizations";
import { users } from "../users";

// ============================================================================
// INTERFACES
// ============================================================================

export interface AttachmentMetadata {
  /** Original image dimensions if applicable */
  width?: number;
  height?: number;
  /** Duration in seconds for audio/video */
  duration?: number;
  /** Additional custom metadata */
  [key: string]: unknown;
}

// ============================================================================
// ATTACHMENTS TABLE
// ============================================================================

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant ownership
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Uploader reference
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // File metadata
    filename: text("filename").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),

    // Storage location
    storageKey: text("storage_key").notNull(),
    bucket: text("bucket").notNull().default("attachments"),

    // Entity association (polymorphic)
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),

    // Additional metadata (JSONB)
    metadata: jsonb("metadata").$type<AttachmentMetadata>().default({}),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Soft delete
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // Unique storage key
    storageKeyUnique: uniqueIndex("idx_attachments_storage_key_unique").on(
      table.storageKey
    ),

    // Multi-tenant queries
    orgIdx: index("idx_attachments_org").on(table.organizationId),

    // Entity attachment lookups
    entityIdx: index("idx_attachments_entity").on(
      table.entityType,
      table.entityId
    ),

    // Uploader lookup
    uploaderIdx: index("idx_attachments_uploader").on(table.uploadedBy),

    // RLS Policies - users can only access own org's attachments
    selectPolicy: pgPolicy("attachments_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    insertPolicy: pgPolicy("attachments_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    updatePolicy: pgPolicy("attachments_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
      withCheck: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
    deletePolicy: pgPolicy("attachments_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  organization: one(organizations, {
    fields: [attachments.organizationId],
    references: [organizations.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
