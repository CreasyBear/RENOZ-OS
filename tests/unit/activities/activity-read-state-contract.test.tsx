import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnifiedActivityTimeline } from '@/components/shared/activity/unified-activity-timeline';
import { ACTIVITY_READ_MESSAGES } from '@/lib/activities/read-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('activity read state contract', () => {
  it('shows safe fallback copy in the unified timeline error state', () => {
    render(
      <UnifiedActivityTimeline
        activities={[]}
        hasError
        error={new Error('database timeout from activity_audit')}
        showFilters={false}
        asCard={false}
      />
    );

    expect(screen.getByText('Activity history unavailable')).toBeInTheDocument();
    expect(screen.getByText(ACTIVITY_READ_MESSAGES.history)).toBeInTheDocument();
    expect(screen.queryByText(/database timeout/)).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load activities')).not.toBeInTheDocument();
  });

  it('keeps activity read fallback copy centralized across hooks and presenters', () => {
    const formatter = read('src/lib/activities/read-error-messages.ts');
    const barrel = read('src/lib/activities/index.ts');
    const activityFeed = read('src/components/shared/activity/activity-feed.tsx');
    const timeline = read('src/components/shared/activity/unified-activity-timeline.tsx');
    const activityHooks = read('src/hooks/activities/use-activities.ts');
    const unifiedHooks = read('src/hooks/activities/use-unified-activities.ts');

    expect(formatter).toContain('formatActivityReadError');
    expect(barrel).toContain('formatActivityReadError');
    expect(activityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.feed');
    expect(activityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.history');
    expect(unifiedHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.history');

    for (const source of [activityFeed, timeline]) {
      expect(source).toContain('formatActivityReadError');
      expect(source).not.toContain('Failed to load activities');
      expect(source).not.toContain('{error.message}');
    }
  });
});
