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

  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => getProjects({ data: filters as ProjectListQuery }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

interface ProjectItem {
  id: string;
  [key: string]: unknown;
}

interface ProjectsResponse {
  items: ProjectItem[];
  pagination: {
    totalItems: number;
  };
}

/**
 * Get all projects (for small datasets)
 */
export function useAllProjects(filters: Partial<ProjectListQuery> = {}, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.projects.lists(), 'all', filters],
    queryFn: async () => {
      const allResults: ProjectItem[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore && page < 20) { // Safety limit
        const result = await getProjects({
          data: { ...filters, page, pageSize: 100 } as ProjectListQuery,
        }) as ProjectsResponse;
        allResults.push(...result.items);
        hasMore = result.items.length === 100 && allResults.length < result.pagination.totalItems;
        page++;
      }
      
      return allResults;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Get projects with cursor pagination
 */
export function useProjectsCursor(filters: Partial<ProjectCursorQuery> = {}) {
  return useQuery({
    queryKey: [...queryKeys.projects.lists(), 'cursor', filters],
    queryFn: () => getProjectsCursor({ data: filters as ProjectCursorQuery }),
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
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => getProject({ data: { projectId } }),
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
    queryFn: () =>
      getProjects({
        data: { customerId, page: 1, pageSize: 100 } as ProjectListQuery,
      }),
    enabled: enabled && !!customerId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

type ProjectResult = { id: string; customerId: string | null };

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createProject);

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const result = await createFn({ data: input });
      return result as ProjectResult;
    },
    onSuccess: (result) => {
      // Invalidate project lists
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
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
      queryFn: () => getProject({ data: { projectId } }),
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
