import type React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityItem } from '@/components/shared/activity/activity-item';
import type { ActivityWithUser } from '@/lib/schemas/activities';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to?: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

function makeActivity(overrides: Partial<ActivityWithUser> = {}): ActivityWithUser {
  return {
    id: 'activity-1',
    organizationId: 'org-1',
    userId: 'user-1',
    entityType: 'customer',
    entityId: 'customer-1',
    entityName: 'Acme Solar',
    action: 'note_added',
    changes: null,
    metadata: {
      fullNotes: 'Configured standby timeout to 1440 minutes.\nCustomer approved the change.',
      contentPreview: 'Configured standby timeout to 1440 minutes.',
      noteTitle: 'Battery configuration updated',
      logType: 'decision',
    },
    ipAddress: null,
    userAgent: null,
    description: 'Configured standby timeout to 1440 minutes.',
    source: 'manual',
    sourceRef: null,
    createdAt: new Date('2026-04-10T01:00:00.000Z'),
    createdBy: 'user-1',
    user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    ...overrides,
  };
}

describe('ActivityItem structured note rendering', () => {
  it('renders note title and preview in the standard feed item', () => {
    render(<ActivityItem activity={makeActivity()} getEntityLink={() => null} />);

    expect(screen.getAllByText('Battery configuration updated').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configured standby timeout to 1440 minutes.').length).toBeGreaterThan(0);
    expect(screen.queryByText('Note Title')).toBeNull();
    expect(screen.queryByText('Content Preview')).toBeNull();
  });

  it('renders note title and preview in compact mode', () => {
    render(<ActivityItem activity={makeActivity()} compact getEntityLink={() => null} />);

    expect(screen.getByText('Battery configuration updated')).toBeInTheDocument();
    expect(screen.getByText('Configured standby timeout to 1440 minutes.')).toBeInTheDocument();
  });
});
