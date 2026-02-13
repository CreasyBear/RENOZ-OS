/**
 * Domain Status Card Component
 *
 * Displays email domain verification status with DNS records.
 *
 * @see INT-RES-005
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Globe,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import type {
  DomainVerificationStatus,
  DnsRecord,
  DnsRecordStatus,
} from "@/lib/schemas/communications/email-domain";

// ============================================================================
// TYPES
// ============================================================================

export interface DomainStatusCardProps {
  status: {
    configured: boolean;
    domain: DomainVerificationStatus | null;
    error?: string;
  } | undefined;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: DnsRecordStatus }) {
  const variants: Record<DnsRecordStatus, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: React.ReactNode }> = {
    verified: {
      label: "Verified",
      variant: "default",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      label: "Pending",
      variant: "secondary",
      icon: <Clock className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      variant: "destructive",
      icon: <XCircle className="h-3 w-3" />,
    },
    not_started: {
      label: "Not Started",
      variant: "outline",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// DNS RECORD ROW
// ============================================================================

function DnsRecordRow({ record }: { record: DnsRecord }) {
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{record.type}</span>
          <StatusBadge status={record.status} />
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Name:</span>
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[300px]">
              {record.name}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleCopy(record.name)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Value:</span>
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs truncate max-w-[300px]">
              {record.value}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleCopy(record.value)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function DomainStatusCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DomainStatusCard = memo(function DomainStatusCard({
  status,
  isLoading,
  className,
}: DomainStatusCardProps) {
  if (isLoading) {
    return <DomainStatusCardSkeleton />;
  }

  // Not configured
  if (!status?.configured) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domain Verification
          </CardTitle>
          <CardDescription>Configure your email sending domain</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Domain Not Configured</AlertTitle>
            <AlertDescription>
              Set the RESEND_DOMAIN_ID environment variable to enable domain
              verification status. Visit the{" "}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Resend Dashboard
              </a>{" "}
              to configure your domain.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Error fetching
  if (status.error && !status.domain) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domain Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const domain = status.domain;
  if (!domain) {
    return null;
  }

  const allVerified = domain.records.every((r) => r.status === "verified");

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Verification
            </CardTitle>
            <CardDescription className="mt-1">{domain.domain}</CardDescription>
          </div>
          <Badge
            variant={allVerified ? "default" : "secondary"}
            className="gap-1"
          >
            {allVerified ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {domain.status === "verified"
              ? "Verified"
              : domain.status === "pending"
                ? "Pending"
                : domain.status === "failed"
                  ? "Failed"
                  : "Not Configured"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {allVerified ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>All Records Verified</AlertTitle>
            <AlertDescription>
              Your domain is fully verified and ready to send emails.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>DNS Records Required</AlertTitle>
              <AlertDescription>
                Add the following DNS records to verify your domain. Changes may
                take up to 48 hours to propagate.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              {domain.records.map((record, i) => (
                <DnsRecordRow key={`${record.type}-${i}`} record={record} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
