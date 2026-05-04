/**
 * Project Notes Hooks
 *
 * TanStack Query hooks for project notes management with audio support.
 *
 * @path src/hooks/jobs/use-notes.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
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
  ListNotesResponse,
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

  return useQuery<ListNotesResponse>({
    queryKey: queryKeys.projectNotes.byProjectFiltered(projectId, { siteVisitId, noteType }),
    queryFn: async () => {
      try {
        return await listNotes({
          data: { projectId, siteVisitId, noteType },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Project notes are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled ?? !!projectId,
  });
}

export function useNotesStats(projectId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectNotes.stats(projectId),
    queryFn: async () => {
      try {
        return await getProjectNotesStats({
          data: { projectId },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Project note summary is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: options.enabled ?? !!projectId,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useNote(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectNotes.detail(id),
    queryFn: async () => {
      try {
        return await getNote({
          data: { id },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Project note details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested project note could not be found.',
        });
      }
    },
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
      createNote({ data: { ...data, projectId, noteType: 'audio', status: 'completed' } }),
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
