/**
 * useWarrantyHeaderActions
 *
 * Shared logic for warranty detail header actions (primary + secondary).
 * Used by both WarrantyDetailView and WarrantyDetailContainer to avoid duplication.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useMemo } from 'react';
import {
  FileWarning,
  FileText,
  Loader2,
  RefreshCw,
  CalendarPlus,
} from 'lucide-react';
import type { EntityHeaderAction } from '@/components/shared/detail-view/entity-header';

export interface WarrantyHeaderActionsInput {
  warrantyStatus: string;
  isSubmittingClaim: boolean;
  isSubmittingExtend: boolean;
  isCertificateLoading: boolean;
  certificateExists?: boolean;
  isCertificateRegenerating: boolean;
  isCertificateGenerating: boolean;
  onClaimDialogOpen: () => void;
  onExtendDialogOpen: () => void;
  onDownloadCertificate?: () => void;
  onRegenerateCertificate?: () => void;
  onGenerateCertificate?: () => void;
}

export interface WarrantyHeaderActionsResult {
  primaryAction: {
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
    disabled?: boolean;
  } | undefined;
  secondaryActions: EntityHeaderAction[];
}

export function useWarrantyHeaderActions(
  input: WarrantyHeaderActionsInput
): WarrantyHeaderActionsResult {
  const {
    warrantyStatus,
    isSubmittingClaim,
    isSubmittingExtend,
    isCertificateLoading,
    certificateExists,
    isCertificateRegenerating,
    isCertificateGenerating,
    onClaimDialogOpen,
    onExtendDialogOpen,
    onDownloadCertificate,
    onRegenerateCertificate,
    onGenerateCertificate,
  } = input;

  const canFileClaim =
    warrantyStatus === 'active' || warrantyStatus === 'expiring_soon';

  const primaryAction = canFileClaim
    ? {
        label: 'File a Claim',
        onClick: onClaimDialogOpen,
        icon: <FileWarning className="h-4 w-4" />,
        disabled: isSubmittingClaim,
      }
    : undefined;

  const secondaryActions = useMemo(() => {
    const actions: EntityHeaderAction[] = [
      {
        label: 'Extend Warranty',
        onClick: onExtendDialogOpen,
        icon: <CalendarPlus className="h-4 w-4" />,
        disabled: isSubmittingExtend,
      },
    ];

    if (isCertificateLoading) {
      actions.push({
        label: 'Loading certificate status...',
        onClick: () => {},
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        disabled: true,
      });
    } else if (certificateExists) {
      if (onDownloadCertificate) {
        actions.push({
          label: 'View Certificate',
          onClick: onDownloadCertificate,
          icon: <FileText className="h-4 w-4" />,
        });
      }
      if (onRegenerateCertificate) {
        actions.push({
          label: 'Regenerate Certificate',
          onClick: onRegenerateCertificate,
          icon: <RefreshCw className="h-4 w-4" />,
          disabled: isCertificateRegenerating,
        });
      }
    } else if (onGenerateCertificate) {
      actions.push({
        label: 'Generate Certificate',
        onClick: onGenerateCertificate,
        icon: <FileText className="h-4 w-4" />,
        disabled: isCertificateGenerating,
      });
    }

    return actions;
  }, [
    onExtendDialogOpen,
    isSubmittingExtend,
    isCertificateLoading,
    certificateExists,
    onDownloadCertificate,
    onRegenerateCertificate,
    isCertificateRegenerating,
    onGenerateCertificate,
    isCertificateGenerating,
  ]);

  return { primaryAction, secondaryActions };
}
