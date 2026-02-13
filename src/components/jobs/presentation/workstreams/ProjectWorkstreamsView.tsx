/**
 * Project Workstreams View Component
 *
 * Displays project tasks grouped by workstream (phase).
 *
 * @path src/components/jobs/presentation/workstreams/ProjectWorkstreamsView.tsx
 */

import { useState, useEffect, startTransition } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  GripVertical,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  Users,
  ArrowRight,
} from 'lucide-react';

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import type { ProjectWorkstream } from '@/lib/schemas/jobs';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectWorkstreamsViewProps {
  workstreams: ProjectWorkstream[];
  onAddWorkstream?: () => void;
  onEditWorkstream?: (workstream: ProjectWorkstream) => void;
  onDeleteWorkstream?: (workstream: ProjectWorkstream) => void;
  onAddTask?: (workstreamId: string) => void;
  onEditTask?: (task: WorkstreamTask) => void;
  onDeleteTask?: (task: WorkstreamTask) => void;
  onReorderWorkstreams?: (workstreamIds: string[]) => void;
  isLoading?: boolean;
  isReorderable?: boolean;
}

// Task type for workstream
interface WorkstreamTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  estimatedDuration?: number | null;
  assignees?: Array<{ userId: string; role?: string }>;
}

// Extended workstream type with tasks from relations
interface WorkstreamWithTasks extends ProjectWorkstream {
  tasks: WorkstreamTask[];
}

// ============================================================================
// VISIT TYPE CONFIGURATION
// ============================================================================

const VISIT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  assessment: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Assessment' },
  installation: { icon: Calendar, color: 'text-green-600 bg-green-50', label: 'Installation' },
  commissioning: { icon: CheckCircle2, color: 'text-purple-600 bg-purple-50', label: 'Commissioning' },
  service: { icon: AlertCircle, color: 'text-amber-600 bg-amber-50', label: 'Service' },
  warranty: { icon: Clock, color: 'text-cyan-600 bg-cyan-50', label: 'Warranty' },
  inspection: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50', label: 'Inspection' },
  maintenance: { icon: Clock, color: 'text-gray-600 bg-gray-50', label: 'Maintenance' },
};

// ============================================================================
// TASK STATUS CONFIGURATION
// ============================================================================

const TASK_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Circle, color: 'text-gray-400', label: 'Pending' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  blocked: { icon: AlertCircle, color: 'text-red-500', label: 'Blocked' },
  review: { icon: Clock, color: 'text-amber-500', label: 'Review' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function VisitTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null;
  
  const config = VISIT_TYPE_CONFIG[type] || VISIT_TYPE_CONFIG.service;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function TaskCard({ 
  task, 
  onEdit, 
  onDelete 
}: { 
  task: WorkstreamTask; 
  onEdit?: (task: WorkstreamTask) => void;
  onDelete?: (task: WorkstreamTask) => void;
}) {
  const statusConfig = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className={cn('mt-0.5', statusConfig.color)}>
        <StatusIcon className="h-5 w-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{task.title}</p>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {task.description}
              </p>
            )}
          </div>
          
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(task)} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {task.estimatedDuration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.estimatedDuration} min
            </div>
          )}
          
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Due {format(new Date(task.dueDate), 'MMM d')}
            </div>
          )}

          {task.priority === 'high' && (
            <Badge variant="destructive" className="text-xs">High Priority</Badge>
          )}
          {task.priority === 'medium' && (
            <Badge variant="secondary" className="text-xs">Medium</Badge>
          )}
        </div>

        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            <Users className="h-3 w-3 text-muted-foreground" />
            <div className="flex -space-x-2">
              {task.assignees.slice(0, 3).map((assignee: {userId: string; role?: string}, i: number) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {assignee.userId.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkstreamCard({ 
  workstream, 
  onEdit, 
  onDelete, 
  onAddTask,
  onEditTask,
  onDeleteTask,
  isReorderable,
}: { 
  workstream: WorkstreamWithTasks;
  onEdit?: (workstream: ProjectWorkstream) => void;
  onDelete?: (workstream: ProjectWorkstream) => void;
  onAddTask?: (workstreamId: string) => void;
  onEditTask?: (task: WorkstreamTask) => void;
  onDeleteTask?: (task: WorkstreamTask) => void;
  isReorderable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  
  const completedTasks = workstream.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = workstream.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isReorderable && (
                <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{workstream.name}</CardTitle>
                  <VisitTypeBadge type={workstream.defaultVisitType} />
                </div>
                {workstream.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {workstream.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {completedTasks}/{totalTasks} tasks
              </Badge>
              
              {(onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(workstream)}>
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem onClick={() => onDelete(workstream)} className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {totalTasks > 0 && (
            <div className="mt-3 ml-11">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="ml-11 space-y-2">
              {workstream.tasks.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">No tasks in this workstream</p>
                  {onAddTask && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => onAddTask(workstream.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add first task
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {workstream.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  ))}
                  
                  {onAddTask && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      onClick={() => onAddTask(workstream.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Add task
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// SORTABLE WRAPPER
// ============================================================================

interface SortableWorkstreamCardProps {
  workstream: WorkstreamWithTasks;
  onEdit?: (workstream: ProjectWorkstream) => void;
  onDelete?: (workstream: ProjectWorkstream) => void;
  onAddTask?: (workstreamId: string) => void;
  onEditTask?: (task: WorkstreamTask) => void;
  onDeleteTask?: (task: WorkstreamTask) => void;
}

function SortableWorkstreamCard({
  workstream,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: SortableWorkstreamCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workstream.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WorkstreamCard
        workstream={workstream}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddTask={onAddTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        isReorderable
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectWorkstreamsView({
  workstreams,
  onAddWorkstream,
  onEditWorkstream,
  onDeleteWorkstream,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onReorderWorkstreams,
  isLoading,
  isReorderable = false,
}: ProjectWorkstreamsViewProps) {
  // All hooks must run unconditionally before any returns
  const [sortedWorkstreams, setSortedWorkstreams] = useState<WorkstreamWithTasks[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const sorted = [...workstreams]
      .sort((a, b) => a.position - b.position)
      .map(w => ({ ...w, tasks: (w as unknown as WorkstreamWithTasks).tasks || [] }));
    startTransition(() => setSortedWorkstreams(sorted));
  }, [workstreams]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortedWorkstreams((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Call the callback with new order
        onReorderWorkstreams?.(newItems.map((item) => item.id));
        
        return newItems;
      });
    }
  };

  const workstreamList = sortedWorkstreams.length > 0 ? sortedWorkstreams : 
    [...workstreams]
      .sort((a, b) => a.position - b.position)
      .map(w => ({ ...w, tasks: (w as unknown as WorkstreamWithTasks).tasks || [] }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-2 w-32 bg-muted rounded" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (workstreams.length === 0) {
    return (
      <EmptyState
        icon={ArrowRight}
        title="No workstreams yet"
        message="Create workstreams to organize project tasks by phase."
        action={onAddWorkstream ? {
          label: 'Add Workstream',
          onClick: onAddWorkstream,
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {isReorderable && onReorderWorkstreams ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={workstreamList.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            {workstreamList.map((workstream) => (
              <SortableWorkstreamCard
                key={workstream.id}
                workstream={workstream}
                onEdit={onEditWorkstream}
                onDelete={onDeleteWorkstream}
                onAddTask={onAddTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        workstreamList.map((workstream) => (
          <WorkstreamCard
            key={workstream.id}
            workstream={workstream}
            onEdit={onEditWorkstream}
            onDelete={onDeleteWorkstream}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))
      )}
      
      {onAddWorkstream && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={onAddWorkstream}
        >
          <Plus className="h-4 w-4" />
          Add Workstream
        </Button>
      )}
    </div>
  );
}
