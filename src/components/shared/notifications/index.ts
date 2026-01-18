/**
 * Notification Components
 *
 * Specialized notification patterns for the Renoz application.
 *
 * @example
 * ```tsx
 * import { showConfirmationToast, JobProgressNotification } from '~/components/shared/notifications'
 * ```
 */

export {
  showConfirmationToast,
  type ConfirmationToastOptions,
} from './confirmation-toast'

export {
  JobProgressNotification,
  JobProgressNotificationList,
  JOB_TYPE_ICONS,
  type JobProgressNotificationProps,
  type JobProgressNotificationListProps,
} from './job-progress-notification'
