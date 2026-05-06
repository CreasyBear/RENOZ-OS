import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPipelineActivityMutationError } from '@/hooks/pipeline/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('pipeline activity mutation feedback contract', () => {
  it('suppresses unsafe activity failures with action-specific fallback copy', () => {
    expect(
      formatPipelineActivityMutationError(
        new Error('duplicate key value violates unique constraint opportunity_activities_pkey'),
        'log'
      )
    ).toBe('Unable to log activity. Refresh and try again.');

    expect(
      formatPipelineActivityMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading activityId)',
        },
        'complete'
      )
    ).toBe('Unable to complete activity. Refresh and try again.');

    expect(
      formatPipelineActivityMutationError(
        new Error('SQL insert failed at follow-up stack frame'),
        'scheduleFollowUp'
      )
    ).toBe('Unable to schedule follow-up. Refresh and try again.');
  });

  it('keeps safe validation and known activity codes useful for operators', () => {
    expect(
      formatPipelineActivityMutationError(
        { statusCode: 400, errors: { description: ['Activity description is required.'] } },
        'log'
      )
    ).toBe('Activity description is required.');

    expect(
      formatPipelineActivityMutationError({ statusCode: 404, code: 'NOT_FOUND' }, 'complete')
    ).toBe('Activity was not found. Refresh and try again.');
  });

  it('keeps activity mutation actions on the pipeline formatter contract', () => {
    const index = read('src/hooks/pipeline/index.ts');
    const formatter = read('src/hooks/pipeline/_mutation-errors.ts');
    const server = read('src/server/functions/pipeline/pipeline.ts');
    const activityLogger = read('src/components/domain/pipeline/activities/activity-logger.tsx');
    const followUpScheduler = read(
      'src/components/domain/pipeline/activities/follow-up-scheduler.tsx'
    );
    const timelineContainer = read(
      'src/components/domain/pipeline/opportunities/containers/opportunity-activity-timeline-container.tsx'
    );
    const detailContainer = read(
      'src/components/domain/pipeline/opportunities/containers/opportunity-detail-container.tsx'
    );

    expect(index).toContain('formatPipelineActivityMutationError');
    expect(formatter).toContain('PIPELINE_ACTIVITY_CODE_MESSAGES');
    expect(server).toContain('const [activity] = await tx');
    expect(server).toContain("'PIPELINE_ACTIVITY_LOG_FAILED'");
    expect(server).toContain('const [activity] = await db');
    expect(server).toContain('const [deletedActivity] = await db');
    expect(server).toContain('.returning({ id: opportunityActivities.id })');
    expect(server).toContain("throw new NotFoundError('Activity not found', 'opportunityActivity')");
    expect(server).not.toContain('return { activity: result[0] }');
    expect(activityLogger).toContain('formatPipelineActivityMutationError(error, "log")');
    expect(followUpScheduler).toContain(
      'formatPipelineActivityMutationError(error, "scheduleFollowUp")'
    );
    expect(followUpScheduler).toContain('formatPipelineActivityMutationError(error, "complete")');
    expect(timelineContainer).toContain("formatPipelineActivityMutationError(error, 'complete')");
    expect(detailContainer).toContain("formatPipelineActivityMutationError(error, 'complete')");

    expect(activityLogger).not.toContain('toastError("Failed to log activity. Please try again.")');
    expect(followUpScheduler).not.toContain(
      'toastError("Failed to schedule follow-up. Please try again.")'
    );
    expect(followUpScheduler).not.toContain(
      'toastError("Failed to complete follow-up. Please try again.")'
    );
    expect(timelineContainer).not.toContain(
      "toastError('Failed to complete activity. Please try again.')"
    );
    expect(detailContainer).not.toContain(
      "toastError('Failed to complete activity. Please try again.')"
    );
  });
});
