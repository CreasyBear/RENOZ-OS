import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { WarrantyActivityTabPanels } from '@/components/domain/warranty/views/warranty-activity-tab-panels';

const timelineCalls = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);

vi.mock('@/components/shared/activity/unified-activity-timeline', () => ({
  UnifiedActivityTimeline: (props: Record<string, unknown>) => {
    timelineCalls.push(props);
    return <div data-testid="timeline">{String(props.title)}</div>;
  },
}));

type WarrantyActivityTabPanelsProps = ComponentProps<typeof WarrantyActivityTabPanels>;

function renderPanels(
  overrides: Partial<WarrantyActivityTabPanelsProps> = {}
) {
  const props: WarrantyActivityTabPanelsProps = {
    activeTab: 'warranty-activity',
    hasServiceSystem: true,
    activities: [],
    activitiesLoading: false,
    activitiesError: null,
    systemActivities: [],
    systemActivitiesLoading: false,
    systemActivitiesError: null,
    onLogActivity: vi.fn(),
    onScheduleFollowUp: vi.fn(),
    ...overrides,
  };

  render(
    <Tabs value={props.activeTab}>
      <WarrantyActivityTabPanels {...props} />
    </Tabs>
  );

  return props;
}

describe('WarrantyActivityTabPanels', () => {
  it('renders warranty activity actions and timeline contract', () => {
    timelineCalls.length = 0;
    const onLogActivity = vi.fn();
    const onScheduleFollowUp = vi.fn();

    renderPanels({ onLogActivity, onScheduleFollowUp });

    fireEvent.click(screen.getByRole('button', { name: 'Schedule Follow-up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log Activity' }));

    expect(onScheduleFollowUp).toHaveBeenCalledTimes(1);
    expect(onLogActivity).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('timeline')).toHaveTextContent('Warranty Activity');
    expect(timelineCalls[0]).toMatchObject({
      activities: [],
      isLoading: false,
      hasError: false,
      error: undefined,
      title: 'Warranty Activity',
      description: 'Warranty-specific actions, notes, claims, and operator activity.',
      showFilters: true,
      viewAllSearch: { entityType: 'warranty' },
      emptyMessage: 'No activity recorded yet',
      emptyDescription: 'Warranty activities will appear here when interactions occur.',
    });
  });

  it('renders canonical service-system history when a service system exists', () => {
    timelineCalls.length = 0;
    const systemError = new Error('System history temporarily unavailable.');

    renderPanels({
      activeTab: 'system-history',
      hasServiceSystem: true,
      systemActivities: [
        {
          id: 'activity-1',
          source: 'audit',
          entityType: 'service_system',
          entityId: 'service-system-1',
          type: 'status_changed',
          description: 'Linked warranty to service system.',
          userId: 'user-1',
          userName: 'Admin',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ] as WarrantyActivityTabPanelsProps['systemActivities'],
      systemActivitiesLoading: true,
      systemActivitiesError: systemError,
    });

    expect(screen.getByTestId('timeline')).toHaveTextContent('System History');
    expect(timelineCalls[0]).toMatchObject({
      isLoading: true,
      hasError: true,
      error: systemError,
      title: 'System History',
      description: 'Canonical service-system events such as linkage, ownership transfer, and backfill outcomes.',
      showFilters: true,
      viewAllSearch: { entityType: 'service_system' },
      emptyMessage: 'No system history recorded yet',
      emptyDescription: 'System events will appear here as the installed-system record changes.',
    });
  });

  it('shows a no-system state instead of system history when no service system is linked', () => {
    timelineCalls.length = 0;

    renderPanels({
      activeTab: 'system-history',
      hasServiceSystem: false,
    });

    expect(
      screen.getByText('No service system is linked yet, so there is no canonical system history to show.')
    ).toBeInTheDocument();
    expect(timelineCalls).toHaveLength(0);
  });

  it('does not mount activity panels for unrelated tabs', () => {
    timelineCalls.length = 0;

    renderPanels({ activeTab: 'overview' });

    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
    expect(timelineCalls).toHaveLength(0);
  });
});
