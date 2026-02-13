/**
 * Email History Page
 *
 * Extracted for code-splitting - see history.tsx for route definition.
 */
import { EmailHistoryList } from "@/components/domain/communications/emails/email-history-list";
import { useEmailHistory } from "@/hooks/communications/use-email-history";

export default function EmailHistoryPage() {
  const { data, isLoading, error } = useEmailHistory({ pageSize: 25 });

  return (
    <EmailHistoryList
      items={data?.items ?? []}
      isLoading={isLoading}
      error={error}
      hasNextPage={data?.hasNextPage ?? false}
    />
  );
}
