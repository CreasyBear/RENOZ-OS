import { createFileRoute } from '@tanstack/react-router';
import { confirmEmailFn } from '~/server/functions/auth/confirm';

export const Route = createFileRoute('/auth/confirm')({
  preload: false,
  loader: (opts) => confirmEmailFn({ data: opts.location.search }),
});
