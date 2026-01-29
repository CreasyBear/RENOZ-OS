/**
 * Project Files Hooks
 *
 * TanStack Query hooks for project files management.
 *
 * @path src/hooks/jobs/use-files.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
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
  
  return useQuery({
    queryKey: [...queryKeys.projectFiles.byProject(projectId), { siteVisitId, fileType }],
    queryFn: () => listFiles({ data: { projectId, siteVisitId, fileType } }),
    enabled: enabled ?? !!projectId,
  });
}

export function useFilesStats(projectId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectFiles.stats(projectId),
    queryFn: () => getProjectFilesStats({ data: { projectId } }),
    enabled: options.enabled ?? !!projectId,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export function useFile(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projectFiles.detail(id),
    queryFn: () => getFile({ data: { id } }),
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
