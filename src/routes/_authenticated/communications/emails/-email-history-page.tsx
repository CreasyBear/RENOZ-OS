/**
 * Email History Page
 *
 * Extracted for code-splitting - see history.tsx for route definition.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmailHistoryList } from "@/components/domain/communications/emails/email-history-list";
import { useEmailHistory } from "@/hooks/communications/use-email-history";

export default function EmailHistoryPage() {
  const { data, isLoading, error, refetch } = useEmailHistory({ pageSize: 25 });

  return (
    <div className="space-y-4">
      {error && data ? (
        <Alert>
          <AlertTitle>Showing cached email history</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              {error instanceof Error
                ? error.message
                : "Email history is temporarily unavailable. Please refresh and try again."}
            </span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <EmailHistoryList
        items={data?.items ?? []}
        isLoading={isLoading}
        error={data ? undefined : error}
        hasNextPage={data?.hasNextPage ?? false}
      />
    </div>
  );
}
