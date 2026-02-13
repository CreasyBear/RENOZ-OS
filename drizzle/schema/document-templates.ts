/**
 * Document Templates Schema
 *
 * Stores organization-wide document customization settings for generated PDFs
 * (quotes, invoices, delivery notes, etc.). Each organization has one template
 * configuration per document type.
 *
 * Table category: settings (per column-patterns.json)
 *
 * @see PRD INT-DOC-005-A
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "./_shared/patterns";
import { organizations } from "./settings/organizations";

// ============================================================================
// DOCUMENT TYPES ENUM
// ============================================================================

/**
 * Valid document types for template customization.
 */
export const DOCUMENT_TYPES = [
  "quote",
  "invoice",
  "delivery_note",
  "purchase_order",
  "work_order",
  "warranty_certificate",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ============================================================================
// PAPER SIZE ENUM
// ============================================================================

/**
 * Supported paper sizes for PDF generation.
 */
export const PAPER_SIZES = ["a4", "letter"] as const;

export type PaperSize = (typeof PAPER_SIZES)[number];

// ============================================================================
// FONT FAMILY ENUM
// ============================================================================

/**
 * Supported font families for document generation.
 */
export const FONT_FAMILIES = [
  "inter",
  "roboto",
  "open-sans",
  "lato",
  "montserrat",
  "poppins",
  "source-sans",
  "nunito",
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];

// ============================================================================
// DOCUMENT TEMPLATES TABLE
// ============================================================================

export const documentTemplates = pgTable(
  "document_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Document classification
    documentType: text("document_type").notNull(), // 'quote', 'invoice', 'delivery_note', etc.

    // Branding
    logoUrl: text("logo_url"), // Custom logo URL for documents
    primaryColor: text("primary_color").default("#1f2937"), // Hex color code
    secondaryColor: text("secondary_color").default("#6b7280"), // Hex color code

    // Typography
    fontFamily: text("font_family").default("inter"), // Font preference

    // Layout
    paperSize: text("paper_size").default("a4"), // 'a4' or 'letter'
    includeQr: boolean("include_qr").default(false), // Whether to include QR code

    // Content
    footerText: text("footer_text"), // Custom footer text
    termsText: text("terms_text"), // Terms and conditions

    // Standard timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Unique constraint: one template per org per document type
    orgDocTypeUnique: unique("uq_document_templates_org_doc_type").on(
      table.organizationId,
      table.documentType
    ),

    // Multi-tenant queries
    orgIdx: index("idx_document_templates_org").on(table.organizationId),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("document_templates"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const documentTemplatesRelations = relations(
  documentTemplates,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [documentTemplates.organizationId],
      references: [organizations.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;
