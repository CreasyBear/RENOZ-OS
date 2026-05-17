import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityTabContent } from '@/components/domain/inventory/views/inventory-activity-tab-content';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

vi.mock('@/components/shared/activity', () => ({
  UnifiedActivityTimeline: ({
    activities,
    isLoading,
    hasError,
    error,
    title,
    description,
    showFilters,
    viewAllSearch,
    emptyMessage,
    emptyDescription,
  }: {
    activities: unknown[];
    isLoading?: boolean;
    hasError?: boolean;
    error?: Error;
    title: string;
    description: string;
    showFilters?: boolean;
    viewAllSearch?: Record<string, unknown>;
    emptyMessage: string;
    emptyDescription: string;
  }) => (
    <div
      data-testid="activity-timeline"
      data-activity-count={activities.length}
      data-loading={String(isLoading)}
      data-has-error={String(hasError)}
      data-error-message={error?.message ?? ''}
      data-show-filters={String(showFilters)}
      data-view-all-search={JSON.stringify(viewAllSearch)}
    >
      <span>{title}</span>
      <span>{description}</span>
      <span>{emptyMessage}</span>
      <span>{emptyDescription}</span>
    </div>
  ),
}));

const activities = [
  { id: 'activity-1' },
  { id: 'activity-2' },
] as unknown as UnifiedActivity[];

describe('ActivityTabContent', () => {
  it('renders the activity logging action when a handler is available', () => {
    const onLogActivity = vi.fn();

    render(<ActivityTabContent activities={activities} onLogActivity={onLogActivity} />);

    fireEvent.click(screen.getByRole('button', { name: 'Log Activity' }));

    expect(onLogActivity).toHaveBeenCalledTimes(1);
  });

  it('does not render the activity logging action when the workflow is read-only', () => {
    render(<ActivityTabContent activities={activities} />);

    expect(screen.queryByRole('button', { name: 'Log Activity' })).not.toBeInTheDocument();
  });

  it('passes inventory activity feed state and copy to the shared activity timeline', () => {
    render(
      <ActivityTabContent
        activities={activities}
        activitiesLoading
        activitiesError={new Error('Activity feed unavailable')}
      />
    );

    const timeline = screen.getByTestId('activity-timeline');

    expect(timeline).toHaveAttribute('data-activity-count', '2');
    expect(timeline).toHaveAttribute('data-loading', 'true');
    expect(timeline).toHaveAttribute('data-has-error', 'true');
    expect(timeline).toHaveAttribute('data-error-message', 'Activity feed unavailable');
    expect(timeline).toHaveAttribute('data-show-filters', 'true');
    expect(timeline).toHaveAttribute('data-view-all-search', '{"entityType":"inventory"}');
    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    expect(
      screen.getByText('Complete history of inventory changes, stock movements, and system events')
    ).toBeInTheDocument();
    expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
    expect(
      screen.getByText('Inventory activities will appear here when changes are made.')
    ).toBeInTheDocument();
  });

  it('keeps the activity tab out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const activityTab = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-activity-tab-content.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { ActivityTabContent } from './inventory-activity-tab-content'"
    );
    expect(detailView).not.toContain('UnifiedActivityTimeline');
    expect(detailView).not.toContain("from '@/lib/activities'");
    expect(activityTab).toContain('export function ActivityTabContent');
    expect(activityTab).toContain('Activity Timeline');
  });
});
