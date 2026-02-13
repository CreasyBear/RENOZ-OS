/**
 * Job Tasks Kanban Schemas
 *
 * Validation schemas and types for job tasks kanban board operations.
 * Server uses these; hooks import types from here per SCHEMA-TRACE.md.
 *
 * @see src/server/functions/jobs/job-tasks-kanban.ts
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

export const listJobTasksForKanbanSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  limit: z.number().min(1).max(1000).default(200),
});

export const getMyTasksForKanbanSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  limit: z.number().min(1).max(1000).default(200),
});

export type ListJobTasksForKanbanInput = z.infer<typeof listJobTasksForKanbanSchema>;
export type GetMyTasksForKanbanInput = z.infer<typeof getMyTasksForKanbanSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  position: number;
  estimatedHours: number | null;
  actualHours: number | null;
  dueDate: Date | null;

  jobAssignment: {
    id: string;
    jobNumber: string;
    type: string;
    scheduledDate: Date | null;
  };

  customer: {
    id: string;
    name: string;
  } | null;

  assignee: {
    id: string;
    name: string;
    avatar?: string;
  } | null;

  metadata?: {
    comments: number;
    attachments: number;
    subtasks: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
