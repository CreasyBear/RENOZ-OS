import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectTimelineGanttMobileCards } from '@/components/domain/jobs/projects/project-timeline-gantt-mobile-cards';
import type { TimelineTask } from '@/components/domain/jobs/projects/project-timeline-gantt-config';

function makeTask(overrides: Partial<TimelineTask> = {}): TimelineTask {
  return {
    id: 'timeline-task-1',
    title: 'Install batteries',
    startDate: new Date(2026, 4, 19),
    endDate: new Date(2026, 4, 20),
    status: 'in_progress',
    progress: 50,
    ...overrides,
  };
}

describe('project timeline gantt mobile cards', () => {
  it('sorts cards by start date and renders timeline metadata', () => {
    render(
      <ProjectTimelineGanttMobileCards
        tasks={[
          makeTask({
            id: 'later',
            title: 'Later task',
            startDate: new Date(2026, 4, 22),
            endDate: new Date(2026, 4, 22),
            status: 'todo',
            progress: 0,
          }),
          makeTask({
            id: 'earlier',
            title: 'Earlier task',
            startDate: new Date(2026, 4, 18),
            endDate: new Date(2026, 4, 20),
            status: 'completed',
            progress: 100,
          }),
        ]}
      />
    );

    const cards = screen.getAllByRole('button');

    expect(within(cards[0]).getByText('Earlier task')).toBeInTheDocument();
    expect(within(cards[0]).getByText('May 18 – May 20')).toBeInTheDocument();
    expect(within(cards[0]).getByText('3 days')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Completed')).toBeInTheDocument();
    expect(within(cards[0]).getByText('100%')).toBeInTheDocument();

    expect(within(cards[1]).getByText('Later task')).toBeInTheDocument();
    expect(within(cards[1]).getByText('1 day')).toBeInTheDocument();
    expect(within(cards[1]).getByText('To Do')).toBeInTheDocument();
  });

  it('passes the clicked task back to the parent handler', () => {
    const onItemClick = vi.fn();
    const task = makeTask({ id: 'clicked-task' });

    render(
      <ProjectTimelineGanttMobileCards
        tasks={[task]}
        onItemClick={onItemClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /install batteries/i }));

    expect(onItemClick).toHaveBeenCalledWith(task);
  });
});
