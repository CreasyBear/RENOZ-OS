/**
 * Hook for fetching active/recent projects for sidebar contextual display.
 *
 * Returns up to 5 most recently updated projects that are in progress.
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getProjects } from '@/server/functions/projects'

export interface ActiveProject {
  id: string
  title: string
  projectNumber: string
  status: string
  progress: number // 0-100
  customerName?: string
}

interface ProjectItem {
  id: string
  title: string
  projectNumber: string
  status: string
  customer?: { name: string } | null
  workstreams?: Array<{ tasks?: Array<{ status: string }> }>
}

export function useActiveProjects(limit = 5, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  return useQuery({
    queryKey: queryKeys.jobs.activeProjects(limit),
    queryFn: async () => {
      const result = await getProjects({
        data: {
          status: 'in_progress',
          pageSize: limit,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      }) as unknown as { items: ProjectItem[]; pagination: unknown }

      const projects: ActiveProject[] = (result?.items || []).map((p) => ({
        id: p.id,
        title: p.title,
        projectNumber: p.projectNumber,
        status: p.status,
        progress: calculateProgress(p),
        customerName: p.customer?.name,
      }))

      return projects
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })
}

/**
 * Calculate project progress based on workstream/task completion.
 * Falls back to status-based estimate if no tasks available.
 */
function calculateProgress(project: ProjectItem): number {
  // Try to calculate from tasks
  const allTasks = project.workstreams?.flatMap((w) => w.tasks || []) || []

  if (allTasks.length > 0) {
    const completed = allTasks.filter((t) => t.status === 'completed').length
    return Math.round((completed / allTasks.length) * 100)
  }

  // Fall back to status-based estimate
  switch (project.status) {
    case 'quoting':
      return 10
    case 'approved':
      return 20
    case 'in_progress':
      return 50
    case 'on_hold':
      return 50
    case 'completed':
      return 100
    case 'cancelled':
      return 0
    default:
      return 0
  }
}
