import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Package, PackageSearch, Shield, TicketIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDate } from '@/lib/formatters';
import type { IssueDetail, IssueRelatedContext } from '@/lib/schemas/support/issues';
import {
  IssueRelatedEntityLink,
  IssueWarrantyEntityLink,
} from './issue-related-links';
import { getWarrantyBadgeVariant } from './issue-warranty-badge-variant';

interface IssueRelatedTabProps {
  customerId?: string | null;
  supportContext?: IssueDetail['supportContext'];
  relatedContext: IssueRelatedContext | null;
}

export function IssueRelatedTab({
  customerId,
  supportContext,
  relatedContext,
}: IssueRelatedTabProps) {
  const hasAnchorIssues =
    (relatedContext?.sameServiceSystemIssues.length ?? 0) > 0 ||
    (relatedContext?.sameSerializedItemIssues.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {relatedContext?.linkedWarranty && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Linked Warranty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to="/support/warranties/$warrantyId"
              params={{ warrantyId: relatedContext.linkedWarranty.id }}
              className="text-primary hover:underline"
            >
              {relatedContext.linkedWarranty.warrantyNumber}
            </Link>
          </CardContent>
        </Card>
      )}

      {relatedContext?.linkedOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              Source Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/orders/$orderId"
              params={{ orderId: relatedContext.linkedOrder.id }}
              className="text-primary hover:underline"
            >
              {relatedContext.linkedOrder.orderNumber ?? relatedContext.linkedOrder.id}
            </Link>
            {supportContext?.commercialCustomer?.id ? (
              <p className="text-sm text-muted-foreground">
                Purchased via{' '}
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: supportContext.commercialCustomer.id }}
                  className="text-primary hover:underline"
                >
                  {supportContext.commercialCustomer.name ?? 'Commercial customer'}
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {relatedContext?.linkedShipment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              Source Shipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">
              {relatedContext.linkedShipment.shipmentNumber ?? relatedContext.linkedShipment.id}
            </span>
          </CardContent>
        </Card>
      )}

      {relatedContext?.relatedSerials?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              Related Serials
              <Badge variant="secondary" className="text-xs">
                {relatedContext.relatedSerials.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Serials linked through the source order&apos;s shipment or allocation records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedContext.relatedSerials.map((serial) => (
                <div
                  key={`${serial.serialNumber}-${serial.orderLineItemId ?? 'line'}`}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-medium">{serial.serialNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      {serial.source === 'shipment'
                        ? 'Shipped'
                        : serial.source === 'allocation'
                          ? 'Allocated'
                          : 'Order line'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {serial.productName ??
                      serial.orderLineDescription ??
                      'Serialized order item'}
                    {serial.shipmentNumber ? ` · ${serial.shipmentNumber}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {supportContext?.serviceSystem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              Service System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/support/service-systems/$serviceSystemId"
              params={{ serviceSystemId: supportContext.serviceSystem.id }}
              className="text-primary hover:underline"
            >
              {supportContext.serviceSystem.displayName}
            </Link>
            {supportContext.currentOwner ? (
              <p className="text-sm text-muted-foreground">
                Current owner: {supportContext.currentOwner.fullName}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {relatedContext?.sameServiceSystemIssues?.length ? (
        <RelatedIssuesListCard
          title="Same Service System"
          icon={<PackageSearch className="h-4 w-4" aria-hidden="true" />}
          issues={relatedContext.sameServiceSystemIssues}
        />
      ) : null}

      {relatedContext?.sameSerializedItemIssues?.length ? (
        <RelatedIssuesListCard
          title="Same Serialized Item"
          icon={<Package className="h-4 w-4" aria-hidden="true" />}
          issues={relatedContext.sameSerializedItemIssues}
        />
      ) : null}

      {!hasAnchorIssues ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System & Serial History</CardTitle>
            <CardDescription>
              Anchor-first history will show up here before we fall back to broader customer context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={PackageSearch}
              title="No anchor-linked issues yet"
              message="No other issues were found for this service system or serialized item."
            />
          </CardContent>
        </Card>
      ) : null}

      {relatedContext?.linkedRmas?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              Linked RMAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedContext.linkedRmas.map((rma) => (
                <IssueRelatedEntityLink
                  key={rma.id}
                  to="/support/rmas/$rmaId"
                  params={{ rmaId: rma.id }}
                  title={rma.rmaNumber}
                  subtitle={
                    rma.creditNoteId
                      ? `Credit note created · ${formatDate(rma.createdAt)}`
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
          </CardContent>
        </Card>
      ) : null}

      {customerId && relatedContext?.customerContext ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer-Wide Context</CardTitle>
              <CardDescription>
                Commercial history stays visible here, but it is intentionally secondary to system and serialized-item context.
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
          <RelatedOrdersSection
            data={relatedContext.customerContext}
            isLoading={false}
            error={null}
          />
          <RelatedWarrantiesSection
            warranties={relatedContext.customerContext.warranties}
            isLoading={false}
            error={null}
          />
          <RelatedIssuesSection
            issues={relatedContext.customerContext.otherIssues}
            isLoading={false}
            error={null}
          />
        </>
      ) : null}
    </div>
  );
}

function RelatedIssuesListCard({
  title,
  icon,
  issues,
}: {
  title: string;
  icon: ReactNode;
  issues: NonNullable<IssueRelatedContext['sameServiceSystemIssues']>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {issues.map((relatedIssue) => (
            <IssueRelatedEntityLink
              key={relatedIssue.id}
              to="/support/issues/$issueId"
              params={{ issueId: relatedIssue.id }}
              title={`${relatedIssue.issueNumber} · ${relatedIssue.title}`}
              subtitle={formatDate(relatedIssue.createdAt)}
              badge={relatedIssue.status}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RelatedOrdersSection({
  data,
  isLoading,
  error,
}: {
  data: NonNullable<IssueRelatedContext['customerContext']>;
  isLoading: boolean;
  error: Error | null;
}) {
  const recentOrders = data?.recentOrders?.slice(0, 5) || [];
  const totalOrders = data?.recentOrders.length ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            Customer Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden="true" />
            Customer Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" aria-hidden="true" />
          Customer Orders
          <Badge variant="secondary">{totalOrders}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders found for this customer</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <IssueRelatedEntityLink
                key={order.id}
                to="/orders/$orderId"
                params={{ orderId: order.id }}
                title={order.orderNumber}
                subtitle={order.orderDate ? formatDate(order.orderDate) : 'No date'}
                badge={order.status}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedWarrantiesSection({
  warranties,
  isLoading,
  error,
}: {
  warranties: NonNullable<IssueRelatedContext['customerContext']>['warranties'];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Customer Warranties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Customer Warranties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load warranties</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden="true" />
          Customer Warranties
          <Badge variant="secondary">{warranties.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {warranties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warranties found for this customer</p>
        ) : (
          <div className="space-y-2">
            {warranties.slice(0, 5).map((warranty) => (
              <IssueWarrantyEntityLink
                key={warranty.id}
                warrantyId={warranty.id}
                title={warranty.productName || 'Unknown Product'}
                serialNumber={warranty.productSerial || null}
                badge={warranty.status}
                badgeVariant={getWarrantyBadgeVariant(warranty.status)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedIssuesSection({
  issues,
  isLoading,
  error,
}: {
  issues: NonNullable<IssueRelatedContext['customerContext']>['otherIssues'];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TicketIcon className="h-4 w-4" aria-hidden="true" />
            Other Issues from Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" role="status" aria-label="Loading" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TicketIcon className="h-4 w-4" aria-hidden="true" />
            Other Issues from Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load issues</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TicketIcon className="h-4 w-4" aria-hidden="true" />
          Other Issues from Customer
          {issues.length > 0 && <Badge variant="secondary">{issues.length}+</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other issues from this customer</p>
        ) : (
          <div className="space-y-2">
            {issues.slice(0, 5).map((issue) => (
              <IssueRelatedEntityLink
                key={issue.id}
                to="/support/issues/$issueId"
                params={{ issueId: issue.id }}
                title={issue.title}
                subtitle={issue.createdAt ? formatDate(issue.createdAt) : ''}
                badge={issue.status}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
