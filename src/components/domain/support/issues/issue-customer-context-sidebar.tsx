import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ExternalLink, Package, Shield, TicketIcon, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { CustomerContextData } from '@/hooks/support';
import { IssueRelatedEntityLink, IssueWarrantyEntityLink } from './issue-related-links';
import { getWarrantyBadgeVariant } from './issue-warranty-badge-variant';

interface IssueCustomerContextSidebarProps {
  customerId: string;
  customerName: string | null | undefined;
  contextData: CustomerContextData;
}

export function IssueCustomerContextSidebar({
  customerId,
  customerName,
  contextData,
}: IssueCustomerContextSidebarProps) {
  return (
    <div className="space-y-4">
      <CustomerInfoCard customerId={customerId} customerName={customerName} />
      <CustomerOrdersCard
        data={contextData.orderSummary}
        isLoading={contextData.isLoading}
        error={contextData.error}
      />
      <CustomerWarrantiesCard
        warranties={contextData.warranties}
        isLoading={contextData.isLoading}
        error={contextData.error}
      />
      <CustomerIssuesCard
        issues={contextData.otherIssues}
        isLoading={contextData.isLoading}
        error={contextData.error}
      />
    </div>
  );
}

function CustomerInfoCard({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string | null | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Customer
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to="/customers/$customerId"
              params={{ customerId }}
              search={{}}
              className="font-medium hover:underline text-primary truncate block"
            >
              {customerName || 'Unknown Customer'}
            </Link>
            <p className="text-xs text-muted-foreground mt-1">ID: {customerId.slice(0, 8)}...</p>
          </div>
          <Link
            to="/customers/$customerId"
            params={{ customerId }}
            search={{}}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-11 w-11 shrink-0')}
            aria-label="View customer details"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerOrdersCard({
  data,
  isLoading,
  error,
}: {
  data: CustomerContextData['orderSummary'];
  isLoading: boolean;
  error: Error | null;
}) {
  const recentOrders = data?.recentOrders?.slice(0, 3) || [];
  const totalOrders = data?.totalOrders ?? 0;

  if (isLoading) {
    return <SidebarLoadingCard icon={<Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} title="Recent Orders" />;
  }

  if (error) {
    return (
      <SidebarErrorCard
        icon={<Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        title="Recent Orders"
        message="Failed to load orders"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Recent Orders
          <Badge variant="secondary" className="text-xs">
            {totalOrders}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No orders found</p>
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

function CustomerWarrantiesCard({
  warranties,
  isLoading,
  error,
}: {
  warranties: CustomerContextData['warranties'];
  isLoading: boolean;
  error: Error | null;
}) {
  const activeWarranties = warranties.filter(
    (w) => w.status === 'active' || w.status === 'expiring_soon'
  );

  if (isLoading) {
    return <SidebarLoadingCard icon={<Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} title="Warranties" />;
  }

  if (error) {
    return (
      <SidebarErrorCard
        icon={<Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        title="Warranties"
        message="Failed to load warranties"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Warranties
          {activeWarranties.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeWarranties.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {warranties.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No warranties found</p>
        ) : (
          <div className="space-y-2">
            {warranties.slice(0, 3).map((warranty) => (
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

function CustomerIssuesCard({
  issues,
  isLoading,
  error,
}: {
  issues: CustomerContextData['otherIssues'];
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return <SidebarLoadingCard icon={<TicketIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} title="Previous Issues" />;
  }

  if (error) {
    return (
      <SidebarErrorCard
        icon={<TicketIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        title="Previous Issues"
        message="Failed to load issues"
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TicketIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Previous Issues
          {issues.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {issues.length}+
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No previous issues</p>
        ) : (
          <div className="space-y-2">
            {issues.slice(0, 3).map((issue) => (
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

function SidebarLoadingCard({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-center py-4">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            role="status"
            aria-label="Loading"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarErrorCard({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-red-600 py-2">{message}</p>
      </CardContent>
    </Card>
  );
}
