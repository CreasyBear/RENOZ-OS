import { Link } from '@tanstack/react-router';
import { ArrowDown, PackageSearch, Trash2 } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { IssueRmaReadiness, IssueStatus } from '@/lib/schemas/support/issues';
import type { IssueDetailActionPolicy } from './issue-detail-action-policy';

interface IssueActionsCardProps {
  issueId: string;
  rmaReadiness?: IssueRmaReadiness | null;
  actionPolicy: IssueDetailActionPolicy;
  onStatusChange: (status: IssueStatus) => void;
  onDelete: () => void | Promise<void>;
  isPending: boolean;
}

export function IssueActionsCard({
  issueId,
  rmaReadiness,
  actionPolicy,
  onStatusChange,
  onDelete,
  isPending,
}: IssueActionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actionPolicy.showRmaSection && (
          <>
            {rmaReadiness?.state === 'ready' && rmaReadiness.sourceOrder ? (
              <Link
                to="/orders/$orderId"
                params={{ orderId: rmaReadiness.sourceOrder.id }}
                search={{ fromIssueId: issueId }}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'gap-2 w-full justify-center'
                )}
              >
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                Create RMA
              </Link>
            ) : (
              <div className="space-y-2">
                <Button size="sm" disabled className="w-full gap-2">
                  <PackageSearch className="h-4 w-4" aria-hidden="true" />
                  Create RMA
                </Button>
                <p className="text-xs text-muted-foreground">
                  {rmaReadiness?.blockedReason ??
                    'Resolve the source order before creating an RMA.'}
                </p>
              </div>
            )}
            <Separator className="my-2" />
          </>
        )}
        {(actionPolicy.canStart ||
          actionPolicy.canDeEscalate ||
          actionPolicy.canHold ||
          actionPolicy.canEscalate ||
          actionPolicy.canResolve) && (
          <>
            {(actionPolicy.canStart || actionPolicy.canDeEscalate) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onStatusChange('in_progress')}
                disabled={isPending}
              >
                {actionPolicy.canDeEscalate ? (
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {actionPolicy.canDeEscalate ? 'De-escalate' : 'Start Working'}
              </Button>
            )}
            {actionPolicy.canHold && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('on_hold')}
                disabled={isPending}
              >
                Put On Hold
              </Button>
            )}
            {actionPolicy.canEscalate && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onStatusChange('escalated')}
                disabled={isPending}
              >
                Escalate
              </Button>
            )}
            {actionPolicy.canResolve && (
              <Button size="sm" onClick={() => onStatusChange('resolved')} disabled={isPending}>
                Resolve
              </Button>
            )}
          </>
        )}
        {actionPolicy.canClose && (
          <Button size="sm" onClick={() => onStatusChange('closed')} disabled={isPending}>
            Close Issue
          </Button>
        )}

        {actionPolicy.canDelete && (
          <>
            <Separator className="my-2" />
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Issue
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
