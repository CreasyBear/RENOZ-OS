/**
 * Schedule Route
 *
 * Domain landing hub at /schedule per DOMAIN-LANDING-STANDARDS.
 * Shows nav cards for Calendar and Timeline views.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */
import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout';
import { ScheduleHub } from '@/components/domain/jobs';

export const Route = createFileRoute('/_authenticated/schedule/')({
  component: ScheduleIndexPage,
});

function ScheduleIndexPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Schedule"
        description="View and manage site visits across projects"
      />
      <PageLayout.Content>
        <ScheduleHub />
      </PageLayout.Content>
    </PageLayout>
  );
}
