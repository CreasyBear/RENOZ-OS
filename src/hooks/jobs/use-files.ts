/**
 * Project Files Hooks
 *
 * TanStack Query hooks for project files management.
 *
 * @path src/hooks/jobs/use-files.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import {
  listFiles,
  getFile,
  createFile,
  updateFile,
  deleteFile,
  getProjectFilesStats,
} from '@/server/functions/files';
import type {
  CreateFileInput,
  UpdateFileInput,
  ProjectFileType,
  ListFilesResponse,
} from '@/lib/schemas/jobs/workstreams-notes';

// ============================================================================
// LIST HOOKS
// ============================================================================

export function useFiles(projectId: string, options: {
  siteVisitId?: string;
  fileType?: ProjectFileType;
  enabled?: boolean;
} = {}) {
  const { siteVisitId, fileType, enabled } = options;

  return useQuery<ListFilesResponse>({
    queryKey: queryKeys.projectFiles.byProjectFiltered(projectId, { siteVisitId, fileType }),
    queryFn: async () => {
      try {
        return await listFiles({
          data: { projectId, siteVisitId, fileType },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Project files are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: enabled ?? !!projectId,
  });
}

export function useFilesStats(projectId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectFiles.stats(projectId),
    queryFn: async () => {
      try {
        return await getProjectFilesStats({
          data: { projectId },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Project file summary is temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled: options.enabled ?? !!projectId,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useFile(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectFiles.detail(id),
    queryFn: async () => {
      try {
        return await getFile({
          data: { id },
        });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Project file details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested project file could not be found.',
        });
      }
    },
    enabled: options.enabled ?? !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateFileInput, 'projectId'>) =>
      createFile({ data: { ...data, projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFiles.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFiles.stats(projectId),
      });
    },
  });
}

export function useUpdateFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFileInput) =>
      updateFile({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFiles.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFiles.stats(projectId),
      });
      if (result?.data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectFiles.detail(result.data.id),
        });
      }
    },
  });
}

export function useDeleteFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFile({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFiles.byProject(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectFiles.stats(projectId),
      });
    },
  });
}
