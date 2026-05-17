import { useMemo } from 'react';
import {
  CheckSquare,
} from 'lucide-react';
import {
  closestCenter,
  DndContext,
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
} from '@dnd-kit/sortable';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { TaskWithWorkstream } from '@/lib/schemas/jobs';
import { ProjectTaskSortableCard } from './project-task-sortable-card';

export interface ProjectTaskWorkstreamGroupProps {
  name: string;
  tasks: TaskWithWorkstream[];
  projectId: string;
  onToggleTask: (task: TaskWithWorkstream) => void;
  onEditTask: (task: TaskWithWorkstream) => void;
  onDeleteTask: (task: TaskWithWorkstream) => void;
  onReorderTasks: (taskIds: string[]) => void;
}

export function ProjectTaskWorkstreamGroup({
  name,
  tasks,
  projectId,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onReorderTasks,
}: ProjectTaskWorkstreamGroupProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    return { total, completed, inProgress, blocked, progress, totalHours };
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      onReorderTasks(reorderedTasks.map(t => t.id));
    }
  };

  if (tasks.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{stats.completed}/{stats.total} done</span>
                {stats.totalHours > 0 && (
                  <>
                    <span>•</span>
                    <span>{stats.totalHours}h estimated</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {stats.inProgress > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {stats.inProgress} active
                </Badge>
              )}
              {stats.blocked > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {stats.blocked} blocked
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 w-24">
              <Progress value={stats.progress} className="h-1.5" />
              <span className="text-xs font-medium w-8 text-right">{stats.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <CardContent className="p-4 space-y-3">
            {tasks.map(task => (
              <ProjectTaskSortableCard
                key={task.id}
                task={task}
                projectId={projectId}
                onToggle={() => onToggleTask(task)}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task)}
              />
            ))}
          </CardContent>
        </SortableContext>
      </DndContext>
    </Card>
  );
}
