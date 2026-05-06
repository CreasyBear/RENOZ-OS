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
    const activityCharts = read('src/components/shared/activity/activity-charts.tsx');
    const activityHeatmap = read('src/components/shared/activity/activity-heatmap.tsx');
    const activityLeaderboard = read('src/components/shared/activity/activity-leaderboard.tsx');
    const followUpScheduler = read('src/components/domain/pipeline/activities/follow-up-scheduler.tsx');
    const pipelineActivityHooks = read('src/hooks/pipeline/use-activities.ts');
    const activityHooks = read('src/hooks/activities/use-activities.ts');
    const unifiedHooks = read('src/hooks/activities/use-unified-activities.ts');

    expect(formatter).toContain('formatActivityReadError');
    expect(formatter).toContain('followUps:');
    expect(formatter).toContain('statistics:');
    expect(formatter).toContain('leaderboard:');
    expect(barrel).toContain('formatActivityReadError');
    expect(activityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.feed');
    expect(activityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.history');
    expect(activityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.statistics');
    expect(activityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.leaderboard');
    expect(unifiedHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.history');
    expect(pipelineActivityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.feed');
    expect(pipelineActivityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.history');
    expect(pipelineActivityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.followUps');
    expect(pipelineActivityHooks).toContain('fallbackMessage: ACTIVITY_READ_MESSAGES.statistics');
    expect(pipelineActivityHooks).not.toMatch(/fallbackMessage:\s*['"]/);

    for (const source of [activityFeed, timeline]) {
      expect(source).toContain('formatActivityReadError');
      expect(source).not.toContain('Failed to load activities');
      expect(source).not.toContain('{error.message}');
    }

    expect(followUpScheduler).toContain('formatActivityReadError');
    expect(followUpScheduler).toContain('ACTIVITY_READ_MESSAGES.followUps');
    expect(followUpScheduler).not.toContain('Failed to load follow-ups.');

    for (const source of [activityCharts, activityHeatmap, activityLeaderboard]) {
      expect(source).toContain('formatActivityReadError');
      expect(source).not.toContain('Failed to load trend data');
      expect(source).not.toContain('Failed to load distribution data');
      expect(source).not.toContain('Failed to load entity data');
      expect(source).not.toContain('Failed to load heatmap data');
      expect(source).not.toContain('Failed to load leaderboard');
      expect(source).not.toContain('{error.message}');
    }
  });
});
