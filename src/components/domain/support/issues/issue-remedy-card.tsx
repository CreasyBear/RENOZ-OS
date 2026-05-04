import { Link } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import type { IssueRmaReadiness } from '@/lib/schemas/support/issues';
import { IssueRelatedEntityLink } from './issue-related-links';

interface IssueRemedyCardProps {
  issueId: string;
  rmaReadiness: IssueRmaReadiness;
}

export function IssueRemedyCard({
  issueId,
  rmaReadiness,
}: IssueRemedyCardProps) {
  const stateLabel =
    rmaReadiness.state === 'ready'
      ? 'RMA Ready'
      : rmaReadiness.state === 'linked'
        ? 'RMA Already Linked'
        : 'RMA Blocked';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Remedy</CardTitle>
        <CardDescription>
          Current return-readiness and prior return context for this issue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={rmaReadiness.state === 'ready' ? 'default' : 'outline'}>
            {stateLabel}
          </Badge>
          {rmaReadiness.suggestedReason ? (
            <Badge variant="secondary">
              Suggested reason: {rmaReadiness.suggestedReason.replaceAll('_', ' ')}
            </Badge>
          ) : null}
        </div>
        {rmaReadiness.blockedReason ? (
          <p className="text-sm text-muted-foreground">{rmaReadiness.blockedReason}</p>
        ) : null}
        {rmaReadiness.sourceOrder ? (
          <p className="text-sm text-muted-foreground">
            Source order:{' '}
            <Link
              to="/orders/$orderId"
              params={{ orderId: rmaReadiness.sourceOrder.id }}
              search={{ fromIssueId: issueId }}
              className="text-primary hover:underline"
            >
              {rmaReadiness.sourceOrder.orderNumber ?? rmaReadiness.sourceOrder.id}
            </Link>
          </p>
        ) : null}
        {rmaReadiness.existingRmas.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Prior RMAs</p>
            <div className="space-y-2">
              {rmaReadiness.existingRmas.map((rma) => (
                <IssueRelatedEntityLink
                  key={rma.id}
                  to="/support/rmas/$rmaId"
                  params={{ rmaId: rma.id }}
                  title={rma.rmaNumber}
                  subtitle={
                    rma.creditNoteId
                      ? `Credit note issued · ${formatDate(rma.createdAt)}`
                      : rma.replacementOrderId
                        ? `Replacement created · ${formatDate(rma.createdAt)}`
                        : rma.refundPaymentId
                          ? `Refund recorded · ${formatDate(rma.createdAt)}`
                          : formatDate(rma.createdAt)
                  }
                  badge={rma.executionStatus ?? rma.status}
                />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
