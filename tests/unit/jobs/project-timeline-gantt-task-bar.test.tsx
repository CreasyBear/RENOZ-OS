import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectTimelineGanttTaskBar } from '@/components/domain/jobs/projects/project-timeline-gantt-task-bar';
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

describe('project timeline gantt task bar', () => {
  it('renders the visible portion with deterministic position and progress', () => {
    const { container } = render(
      <ProjectTimelineGanttTaskBar
        task={makeTask()}
        viewStart={new Date(2026, 4, 18)}
        viewEnd={new Date(2026, 4, 24)}
        cellWidth={40}
      />
    );

    const bar = container.firstElementChild;

    expect(screen.getByText('Install batteries')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(bar).toHaveStyle({
      left: '44px',
      width: '74px',
      top: '8px',
    });
  });

  it('does not render bars outside the current timeline window', () => {
    render(
      <ProjectTimelineGanttTaskBar
        task={makeTask({
          startDate: new Date(2026, 4, 1),
          endDate: new Date(2026, 4, 2),
        })}
        viewStart={new Date(2026, 4, 18)}
        viewEnd={new Date(2026, 4, 24)}
        cellWidth={40}
      />
    );

    expect(screen.queryByText('Install batteries')).not.toBeInTheDocument();
  });

  it('moves task dates by whole timeline cells when dragged from the bar body', () => {
    const onDateChange = vi.fn();
    const { container } = render(
      <ProjectTimelineGanttTaskBar
        task={makeTask()}
        viewStart={new Date(2026, 4, 18)}
        viewEnd={new Date(2026, 4, 24)}
        cellWidth={40}
        onDateChange={onDateChange}
      />
    );

    const bar = container.firstElementChild as HTMLElement;
    bar.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 32,
      width: 100,
      height: 32,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(bar, { clientX: 50 });
    fireEvent.pointerUp(window, { clientX: 90 });

    expect(onDateChange).toHaveBeenCalledWith(
      new Date(2026, 4, 20),
      new Date(2026, 4, 21)
    );
  });
});
