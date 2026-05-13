import { AlertCircle, CheckSquare, Filter, Plus } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getProjectTasksReadErrorMessage } from './project-read-error-messages';

export function ProjectTasksLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

export interface ProjectTasksUnavailableStateProps {
  error: unknown;
  onRetry: () => void;
}

export function ProjectTasksUnavailableState({
  error,
  onRetry,
}: ProjectTasksUnavailableStateProps) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Tasks unavailable</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          <span>{getProjectTasksReadErrorMessage(error)}</span>
          <Button variant="link" className="h-auto p-0" onClick={onRetry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export interface ProjectTasksCachedWarningProps {
  error: unknown;
  onRetry: () => void;
}

export function ProjectTasksCachedWarning({
  error,
  onRetry,
}: ProjectTasksCachedWarningProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Showing cached tasks</AlertTitle>
      <AlertDescription className="flex items-center gap-2">
        <span>{getProjectTasksReadErrorMessage(error)}</span>
        <Button variant="link" className="h-auto p-0" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export interface ProjectTasksEmptyStateProps {
  onAdd: () => void;
}

export function ProjectTasksEmptyState({ onAdd }: ProjectTasksEmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
        <CheckSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Add tasks to track work across your project. Tasks can be assigned to team members
        and linked to workstreams.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add First Task
      </Button>
    </Card>
  );
}

export interface ProjectTasksFilteredEmptyStateProps {
  onClearFilters: () => void;
}

export function ProjectTasksFilteredEmptyState({
  onClearFilters,
}: ProjectTasksFilteredEmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-medium mb-1">No tasks match your filters</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Try adjusting your filter criteria to see more tasks.
      </p>
      <Button variant="outline" size="sm" onClick={onClearFilters}>
        Clear all filters
      </Button>
    </Card>
  );
}
