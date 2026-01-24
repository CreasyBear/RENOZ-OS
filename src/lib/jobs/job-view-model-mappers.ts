import type { CalendarJobEvent, CalendarKanbanTask } from '@/lib/schemas/jobs/job-calendar';
import type { TimelineJobItem } from '@/lib/schemas/jobs/job-timeline';
import type { JobViewModel } from '@/lib/schemas/jobs/job-view-model';

export function toJobViewModelFromCalendarEvent(event: CalendarJobEvent): JobViewModel {
  return {
    assignmentId: event.id,
    jobNumber: event.jobNumber,
    title: event.title,
    description: null,
    status: event.status,
    jobType: event.jobType,
    priority: undefined,
    startDate: event.start,
    endDate: event.end,
    durationMinutes: Math.max(0, (event.end.getTime() - event.start.getTime()) / 60000),
    installer: event.installer,
    customer: event.customer,
    allDay: event.allDay,
    estimatedDuration: event.estimatedDuration ?? null,
  };
}

export function toCalendarEventFromJobViewModel(model: JobViewModel): CalendarJobEvent {
  return {
    id: model.assignmentId,
    jobNumber: model.jobNumber,
    title: model.title,
    start: model.startDate,
    end: model.endDate,
    allDay: model.allDay ?? false,
    status: model.status,
    jobType: model.jobType,
    installer: {
      id: model.installer.id,
      name: model.installer.name ?? null,
      email: model.installer.email ?? '',
    },
    customer: {
      id: model.customer.id,
      name: model.customer.name ?? '',
    },
    estimatedDuration: model.estimatedDuration ?? null,
  };
}

export function toJobViewModelFromCalendarTask(task: CalendarKanbanTask): JobViewModel {
  return {
    assignmentId: task.id,
    jobNumber: task.jobNumber,
    title: task.title,
    description: task.description,
    status: task.status,
    jobType: task.jobType,
    priority: task.priority,
    startDate: task.startTime,
    endDate: task.endTime,
    durationMinutes: task.duration,
    installer: task.installer,
    customer: task.customer,
  };
}

export function toCalendarTaskFromJobViewModel(model: JobViewModel): CalendarKanbanTask {
  return {
    id: model.assignmentId,
    jobNumber: model.jobNumber,
    title: model.title,
    description: model.description ?? null,
    startTime: model.startDate,
    endTime: model.endDate,
    duration: model.durationMinutes,
    status: model.status,
    jobType: model.jobType,
    priority: model.priority ?? 'medium',
    installer: {
      id: model.installer.id,
      name: model.installer.name ?? null,
      email: model.installer.email ?? '',
    },
    customer: {
      id: model.customer.id,
      name: model.customer.name ?? '',
    },
    createdAt: model.startDate,
    updatedAt: model.endDate,
  };
}

export function toJobViewModelFromTimelineItem(item: TimelineJobItem): JobViewModel {
  return {
    assignmentId: item.id,
    jobNumber: item.jobNumber,
    title: item.title,
    description: item.description,
    status: item.status,
    jobType: item.jobType,
    priority: item.priority,
    startDate: item.startDate,
    endDate: item.endDate,
    durationMinutes: item.duration,
    installer: item.installer,
    customer: item.customer,
    timelineSpan: item.timelineSpan,
  };
}

export function toTimelineItemFromJobViewModel(model: JobViewModel): TimelineJobItem {
  if (!model.timelineSpan) {
    throw new Error('timelineSpan is required to build a TimelineJobItem');
  }

  return {
    id: model.assignmentId,
    jobNumber: model.jobNumber,
    title: model.title,
    description: model.description ?? null,
    startDate: model.startDate,
    endDate: model.endDate,
    duration: model.durationMinutes,
    status: model.status,
    jobType: model.jobType,
    priority: model.priority ?? 'medium',
    installer: {
      id: model.installer.id,
      name: model.installer.name ?? null,
      email: model.installer.email ?? '',
    },
    customer: {
      id: model.customer.id,
      name: model.customer.name ?? '',
    },
    timelineSpan: model.timelineSpan,
    createdAt: model.startDate,
    updatedAt: model.endDate,
  };
}
