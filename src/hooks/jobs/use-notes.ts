/**
 * Project Notes Hooks
 *
 * TanStack Query hooks for project notes management with audio support.
 *
 * @path src/hooks/jobs/use-notes.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getProjectNotesStats,
} from '@/server/functions/notes';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  NoteType,
} from '@/lib/schemas/jobs/workstreams-notes';

// ============================================================================
// LIST HOOKS
// ============================================================================

export function useNotes(projectId: string, options: { 
  siteVisitId?: string;
  noteType?: NoteType;
  enabled?: boolean;
} = {}) {
  const { siteVisitId, noteType, enabled } = options;
  
  return useQuery({
    queryKey: [...queryKeys.projectNotes.byProject(projectId), { siteVisitId, noteType }],
    queryFn: () => listNotes({ data: { projectId, siteVisitId, noteType } }),
    enabled: enabled ?? !!projectId,
  });
}

export function useNotesStats(projectId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectNotes.stats(projectId),
    queryFn: () => getProjectNotesStats({ data: { projectId } }),
    enabled: options.enabled ?? !!projectId,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useNote(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectNotes.detail(id),
    queryFn: () => getNote({ data: { id } }),
    enabled: options.enabled ?? !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateNoteInput, 'projectId'>) =>
      createNote({ data: { ...data, projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.stats(projectId),
      });
    },
  });
}

export function useUpdateNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNoteInput) =>
      updateNote({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.stats(projectId),
      });
      if (result?.data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectNotes.detail(result.data.id),
        });
      }
    },
  });
}

export function useDeleteNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNote({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.stats(projectId),
      });
    },
  });
}

// ============================================================================
// AUDIO NOTE HELPERS
// ============================================================================

export function useCreateAudioNote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateNoteInput, 'projectId' | 'noteType'>) =>
      createNote({ data: { ...data, projectId, noteType: 'audio', status: 'processing' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectNotes.stats(projectId),
      });
    },
  });
}
