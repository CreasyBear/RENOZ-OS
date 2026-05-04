/**
 * Projects Hooks
 *
 * TanStack Query hooks for project data fetching:
 * - Project list with pagination and filtering
 * - Project detail view
 * - Project mutations (create, update, delete)
 * - Project member management
 *
 * SPRINT-03: New domain hooks for project-centric jobs model
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import {
  isReadQueryError,
  normalizeReadQueryError,
  requireReadResult,
} from '@/lib/read-path-policy';
import {
  getProjects,
  getProjectsCursor,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  completeProject,
} from '@/server/functions/projects';
import type {
  ProjectListQuery,
  ProjectCursorQuery,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  RemoveProjectMemberInput,
  CompleteProjectInput,
  ProjectListResponse,
  Project,
  GetProjectRawInput,
} from '@/lib/schemas/jobs/projects';

// ============================================================================
// LIST HOOKS
// ============================================================================

export interface UseProjectsOptions extends Partial<ProjectListQuery> {
  enabled?: boolean;
}

/**
 * Get projects list with pagination
 */
export function useProjects(options: UseProjectsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery<ProjectListResponse>({
    queryKey: queryKeys.projects.list(filters),
    queryFn: async () => {
      try {
        const result = await getProjects({ data: filters as ProjectListQuery });
        return requireReadResult(result, {
          message: 'Projects list returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get all projects (for small datasets)
 */
export function useAllProjects(filters: Partial<ProjectListQuery> = {}, enabled = true) {
  return useQuery<Project[]>({
    queryKey: queryKeys.projects.listAll(filters),
    queryFn: async () => {
      try {
        const allResults: Project[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && page < 20) {
          const result = (await getProjects({
            data: { ...filters, page, pageSize: 100 } as ProjectListQuery,
          })) as ProjectListResponse | null;
          const ensuredResult = requireReadResult(result, {
            message: 'Projects list returned no data',
            contractType: 'always-shaped',
            fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
          });
          if (!Array.isArray(ensuredResult.items)) {
            throw normalizeReadQueryError(
              {
                code: 'SERVER_ERROR',
                statusCode: 500,
                message: 'Projects list returned malformed items',
              },
              {
                contractType: 'always-shaped',
                fallbackMessage:
                  'Projects are temporarily unavailable. Please refresh and try again.',
              }
            );
          }
          allResults.push(...ensuredResult.items);
          hasMore =
            ensuredResult.items.length === 100 &&
            allResults.length < ensuredResult.pagination.totalItems;
          page++;
        }

        return allResults;
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Returns loadOptions for project combobox (searchable async).
 * Encapsulates getProjects server call per STANDARDS.md - no direct server fn in components.
 */
export function useLoadProjectOptions() {
  return async (search: string): Promise<{ value: string; label: string }[]> => {
    let items: Project[] = [];
    try {
      const result = await getProjects({
        data: {
          search: search || undefined,
          page: 1,
          pageSize: 20,
        } as ProjectListQuery,
      });
      const ensuredResult = requireReadResult(result, {
        message: 'Projects list returned no data',
        contractType: 'always-shaped',
        fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
      });
      if (!Array.isArray(ensuredResult.items)) {
        throw normalizeReadQueryError(
          {
            code: 'SERVER_ERROR',
            statusCode: 500,
            message: 'Projects list returned malformed items',
          },
          {
            contractType: 'always-shaped',
            fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
          }
        );
      }
      items = ensuredResult.items;
    } catch (error) {
      if (isReadQueryError(error)) throw error;
      throw normalizeReadQueryError(error, {
        contractType: 'always-shaped',
        fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
      });
    }
    return items.map((p) => ({
      value: p.id,
      label: `${p.title ?? 'Untitled'}${p.projectNumber ? ` (${p.projectNumber})` : ''}`,
    }));
  };
}

/**
 * Get projects with cursor pagination
 */
export function useProjectsCursor(filters: Partial<ProjectCursorQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.projects.listCursor(filters),
    queryFn: async () => {
      try {
        const result = await getProjectsCursor({ data: filters as ProjectCursorQuery });
        return requireReadResult(result, {
          message: 'Projects cursor returned no data',
          contractType: 'always-shaped',
          fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage: 'Projects are temporarily unavailable. Please refresh and try again.',
        });
      }
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// DETAIL HOOKS
// ============================================================================

export interface UseProjectOptions {
  projectId: string;
  enabled?: boolean;
}

/**
 * Get single project by ID
 */
export function useProject({ projectId, enabled = true }: UseProjectOptions) {
  return useQuery<GetProjectRawInput>({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: async () => {
      try {
        const result = await getProject({ data: { projectId } });
        return requireReadResult(result, {
          message: 'Project not found',
          contractType: 'detail-not-found',
          fallbackMessage: 'Project details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested project could not be found.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'detail-not-found',
          fallbackMessage: 'Project details are temporarily unavailable. Please refresh and try again.',
          notFoundMessage: 'The requested project could not be found.',
        });
      }
    },
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get projects by customer
 */
export function useProjectsByCustomer(customerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects.byCustomer(customerId),
    queryFn: async () => {
      try {
        const result = await getProjects({
          data: { customerId, page: 1, pageSize: 100 } as ProjectListQuery,
        });
        return requireReadResult(result, {
          message: 'Projects by customer returned no data',
          contractType: 'always-shaped',
          fallbackMessage:
            'Projects are temporarily unavailable for this customer. Please refresh and try again.',
        });
      } catch (error) {
        if (isReadQueryError(error)) throw error;
        throw normalizeReadQueryError(error, {
          contractType: 'always-shaped',
          fallbackMessage:
            'Projects are temporarily unavailable for this customer. Please refresh and try again.',
        });
      }
    },
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createProject);

  return useMutation<Project, Error, CreateProjectInput>({
    mutationFn: async (input: CreateProjectInput) => {
      return await createFn({ data: input });
    },
    onSuccess: (result) => {
      // Invalidate project lists
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      // Invalidate project detail for the newly created project
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(result.id),
      });
      // Invalidate customer projects if applicable
      if (result.customerId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.byCustomer(result.customerId),
        });
      }
    },
  });
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateProject);

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => updateFn({ data: input }),
    onSuccess: (_, variables) => {
      // Invalidate specific project and lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      // Invalidate alerts (status, dates, budget changes affect multiple alert types)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(variables.projectId),
      });
    },
  });
}

/**
 * Delete (cancel) a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteProject);

  return useMutation({
    mutationFn: (projectId: string) => deleteFn({ data: { projectId } }),
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * Add a member to a project
 */
export function useAddProjectMember() {
  const queryClient = useQueryClient();
  const addFn = useServerFn(addProjectMember);

  return useMutation({
    mutationFn: async (input: AddProjectMemberInput) => {
      await addFn({ data: input });
    },
    onSuccess: (_, variables) => {
      // Invalidate project members
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
      // Invalidate project detail to refresh member list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
  });
}

/**
 * Remove a member from a project
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeProjectMember);

  return useMutation({
    mutationFn: async (input: RemoveProjectMemberInput) => {
      await removeFn({ data: input });
    },
    onSuccess: (_, variables) => {
      // Invalidate project members
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(variables.projectId),
      });
      // Invalidate project detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
  });
}

/**
 * Complete a project with final costs and customer feedback
 */
export function useCompleteProject() {
  const queryClient = useQueryClient();
  const completeFn = useServerFn(completeProject);

  return useMutation({
    mutationFn: async (input: CompleteProjectInput) => {
      return await completeFn({ data: input });
    },
    onSuccess: (_, variables) => {
      // Invalidate project lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });
      // Invalidate project detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      // Invalidate alerts (completion clears most alerts)
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.alerts(variables.projectId),
      });
    },
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Prefetch a project for faster navigation
 */
export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.detail(projectId),
      queryFn: async () => {
        try {
          const result = await getProject({ data: { projectId } });
          return requireReadResult(result, {
            message: 'Project not found',
            contractType: 'detail-not-found',
            fallbackMessage:
              'Project details are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'The requested project could not be found.',
          });
        } catch (error) {
          if (isReadQueryError(error)) throw error;
          throw normalizeReadQueryError(error, {
            contractType: 'detail-not-found',
            fallbackMessage:
              'Project details are temporarily unavailable. Please refresh and try again.',
            notFoundMessage: 'The requested project could not be found.',
          });
        }
      },
      staleTime: 60 * 1000,
    });
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type {
  ProjectListQuery,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  RemoveProjectMemberInput,
  CompleteProjectInput,
};
