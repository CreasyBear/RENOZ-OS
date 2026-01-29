/**
 * Job Assignment Documents Route
 *
 * SPRINT-03: Redirect legacy job assignments to project detail.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/jobs/assignments/$assignmentId')({
  component: () => null,
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId',
      params: { projectId: params.assignmentId },
    });
  },
});
