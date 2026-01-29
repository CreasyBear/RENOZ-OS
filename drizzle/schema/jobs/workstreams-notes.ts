/**
 * Workstreams, Notes, and Files Schema
 * 
 * Incorporates reference patterns:
 * - Workstreams: Group tasks by phase/category (like "Discovery", "Installation")
 * - Notes: Rich notes with audio transcripts and AI summaries
 * - Files: Project file attachments
 * 
 * @see _Initiation/_prd/sprints/sprint-03-ui-spec-projects.md
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  jsonb,
  index,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { projects } from "./projects";
import { jobTasks } from "./job-tasks";
// import { files } from "../files/files"; // Files schema not yet implemented

// ============================================================================
// PROJECT WORKSTREAMS (Task Groups)
// ============================================================================

export const projectWorkstreams = pgTable(
  "project_workstreams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Workstream details
    name: varchar("name", { length: 255 }).notNull(), // e.g., "Site Assessment", "Installation", "Commissioning"
    description: text("description"),
    
    // Ordering for display
    position: integer("position").notNull().default(0),

    // Optional: Link to a default site visit type
    defaultVisitType: varchar("default_visit_type", { length: 50 }),

    // Standard columns
    ...timestampColumns,
  },
  (table) => ({
    orgProjectIdx: index("idx_workstreams_org_project").on(
      table.organizationId,
      table.projectId
    ),
    projectPositionIdx: index("idx_workstreams_project_position").on(
      table.projectId,
      table.position
    ),

    // RLS
    selectPolicy: pgPolicy("workstreams_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("workstreams_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("workstreams_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("workstreams_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// PROJECT NOTES
// ============================================================================

export const noteTypeEnum = pgEnum("project_note_type", [
  "general",
  "meeting",
  "audio",
  "site_visit",
  "client_feedback",
]);

export const noteStatusEnum = pgEnum("project_note_status", [
  "draft",
  "completed",
  "processing", // For audio transcription
]);

export interface NoteTranscriptSegment {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
}

export interface AudioNoteData {
  duration: string; // "00:02:21"
  fileName: string;
  fileUrl: string;
  aiSummary?: string;
  keyPoints: string[];
  insights: string[];
  transcript: NoteTranscriptSegment[];
}

export const projectNotes = pgTable(
  "project_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Optional: Link to a specific site visit
    siteVisitId: uuid("site_visit_id"), // Will FK to site_visits when created

    // Note content
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    noteType: noteTypeEnum("note_type").notNull().default("general"),
    status: noteStatusEnum("status").notNull().default("completed"),

    // Audio-specific data
    audioData: jsonb("audio_data").$type<AudioNoteData>(),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgProjectIdx: index("idx_project_notes_org_project").on(
      table.organizationId,
      table.projectId
    ),
    projectCreatedIdx: index("idx_project_notes_project_created").on(
      table.projectId,
      table.createdAt.desc()
    ),
    siteVisitIdx: index("idx_project_notes_site_visit").on(table.siteVisitId),

    // RLS
    selectPolicy: pgPolicy("project_notes_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("project_notes_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("project_notes_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("project_notes_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// PROJECT FILES
// ============================================================================

export const projectFileTypeEnum = pgEnum("project_file_type", [
  "proposal",
  "contract",
  "specification",
  "drawing",
  "photo",
  "report",
  "warranty",
  "other",
]);

export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Link to actual file (will be uncommented when files schema is ready)
    // fileId: uuid("file_id")
    //   .notNull()
    //   .references(() => files.id, { onDelete: "cascade" }),
    fileUrl: text("file_url"), // Temporary: store file URL directly

    // File metadata
    fileName: varchar("file_name", { length: 500 }).notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 255 }),
    fileType: projectFileTypeEnum("file_type").notNull().default("other"),
    description: text("description"),
    
    // Optional: Link to site visit
    siteVisitId: uuid("site_visit_id"), // Will FK to site_visits when created

    // Display order
    position: integer("position").notNull().default(0),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    orgProjectIdx: index("idx_project_files_org_project").on(
      table.organizationId,
      table.projectId
    ),
    // projectFileIdx: index("idx_project_files_project_file").on(
    //   table.projectId,
    //   table.fileId
    // ),
    siteVisitIdx: index("idx_project_files_site_visit").on(table.siteVisitId),

    // RLS
    selectPolicy: pgPolicy("project_files_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("project_files_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("project_files_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("project_files_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const projectWorkstreamsRelations = relations(projectWorkstreams, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectWorkstreams.projectId],
    references: [projects.id],
  }),
  tasks: many(jobTasks),
}));

export const projectNotesRelations = relations(projectNotes, ({ one }) => ({
  project: one(projects, {
    fields: [projectNotes.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [projectNotes.createdBy],
    references: [users.id],
  }),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
  // file: one(files, {
  //   fields: [projectFiles.fileId],
  //   references: [files.id],
  // }),
  createdByUser: one(users, {
    fields: [projectFiles.createdBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProjectWorkstream = typeof projectWorkstreams.$inferSelect;
export type NewProjectWorkstream = typeof projectWorkstreams.$inferInsert;

export type ProjectNote = typeof projectNotes.$inferSelect;
export type NewProjectNote = typeof projectNotes.$inferInsert;
export type ProjectNoteType = (typeof noteTypeEnum.enumValues)[number];
export type ProjectNoteStatus = (typeof noteStatusEnum.enumValues)[number];

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;
export type ProjectFileType = (typeof projectFileTypeEnum.enumValues)[number];
