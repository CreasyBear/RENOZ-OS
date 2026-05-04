'use client';

import { ClaimApprovalDialog } from '@/components/domain/warranty/dialogs/claim-approval-dialog';
import { ExtendWarrantyDialog } from '@/components/domain/warranty/dialogs/extend-warranty-dialog';
import { WarrantyClaimFormDialog } from '@/components/domain/warranty/dialogs/warranty-claim-form-dialog';
import type {
  WarrantyClaimListItem,
  WarrantyDetail,
  WarrantyDetailViewProps,
} from '@/lib/schemas/warranty';

type WarrantyDetailDialogsWarranty = Pick<
  WarrantyDetail,
  | 'id'
  | 'warrantyNumber'
  | 'productName'
  | 'customerId'
  | 'customerName'
  | 'ownerRecord'
  | 'status'
  | 'policyType'
  | 'currentCycleCount'
  | 'cycleLimit'
  | 'productSerial'
  | 'expiryDate'
>;

type WarrantyDetailDialogsApprovalClaim = Pick<
  WarrantyClaimListItem,
  | 'id'
  | 'claimNumber'
  | 'claimType'
  | 'status'
  | 'description'
  | 'cost'
  | 'submittedAt'
  | 'cycleCountAtClaim'
> & {
  customer: Pick<WarrantyClaimListItem['customer'], 'name'>;
  product: Pick<NonNullable<WarrantyClaimListItem['product']>, 'name'> | null;
};

interface WarrantyDetailDialogsProps {
  warranty: WarrantyDetailDialogsWarranty;
  approvalClaim: WarrantyDetailDialogsApprovalClaim | null;
  isClaimDialogOpen: boolean;
  isApprovalDialogOpen: boolean;
  isExtendDialogOpen: boolean;
  isSubmittingClaim: boolean;
  isSubmittingApproval: boolean;
  isSubmittingExtend: boolean;
  onClaimDialogOpenChange: WarrantyDetailViewProps['onClaimDialogOpenChange'];
  onApprovalDialogOpenChange: WarrantyDetailViewProps['onApprovalDialogOpenChange'];
  onExtendDialogOpenChange: WarrantyDetailViewProps['onExtendDialogOpenChange'];
  onSubmitClaim: WarrantyDetailViewProps['onSubmitClaim'];
  onApproveClaim: WarrantyDetailViewProps['onApproveClaim'];
  onDenyClaim: WarrantyDetailViewProps['onDenyClaim'];
  onRequestInfoClaim: WarrantyDetailViewProps['onRequestInfoClaim'];
  onExtendWarranty: WarrantyDetailViewProps['onExtendWarranty'];
  onClaimsSuccess: WarrantyDetailViewProps['onClaimsSuccess'];
  onExtensionsSuccess: WarrantyDetailViewProps['onExtensionsSuccess'];
}

export function WarrantyDetailDialogs({
  warranty,
  approvalClaim,
  isClaimDialogOpen,
  isApprovalDialogOpen,
  isExtendDialogOpen,
  isSubmittingClaim,
  isSubmittingApproval,
  isSubmittingExtend,
  onClaimDialogOpenChange,
  onApprovalDialogOpenChange,
  onExtendDialogOpenChange,
  onSubmitClaim,
  onApproveClaim,
  onDenyClaim,
  onRequestInfoClaim,
  onExtendWarranty,
  onClaimsSuccess,
  onExtensionsSuccess,
}: WarrantyDetailDialogsProps) {
  return (
    <>
      <WarrantyClaimFormDialog
        open={isClaimDialogOpen}
        onOpenChange={onClaimDialogOpenChange}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          commercialCustomerId: warranty.customerId,
          commercialCustomerName: warranty.customerName ?? undefined,
          ownerRecord: warranty.ownerRecord
            ? {
                fullName: warranty.ownerRecord.fullName,
                email: warranty.ownerRecord.email,
                phone: warranty.ownerRecord.phone,
              }
            : null,
          status: warranty.status,
          policyType: warranty.policyType ?? undefined,
          currentCycleCount: warranty.currentCycleCount ?? undefined,
          cycleLimit: warranty.cycleLimit ?? undefined,
        }}
        onSubmit={onSubmitClaim}
        isSubmitting={isSubmittingClaim}
        onSuccess={onClaimsSuccess}
      />

      {approvalClaim && (
        <ClaimApprovalDialog
          open={isApprovalDialogOpen}
          onOpenChange={onApprovalDialogOpenChange}
          claim={{
            id: approvalClaim.id,
            claimNumber: approvalClaim.claimNumber,
            claimType: approvalClaim.claimType,
            status: approvalClaim.status,
            description: approvalClaim.description,
            cost: approvalClaim.cost,
            submittedAt: approvalClaim.submittedAt,
            cycleCountAtClaim: approvalClaim.cycleCountAtClaim,
            warranty: {
              warrantyNumber: warranty.warrantyNumber,
              productSerial: warranty.productSerial,
            },
            customer: {
              name: approvalClaim.customer.name ?? 'Unknown Customer',
            },
            product: {
              name: approvalClaim.product?.name ?? 'Unknown Product',
            },
          }}
          onApprove={onApproveClaim}
          onDeny={onDenyClaim}
          onRequestInfo={onRequestInfoClaim}
          isSubmitting={isSubmittingApproval}
          onSuccess={onClaimsSuccess}
        />
      )}

      <ExtendWarrantyDialog
        open={isExtendDialogOpen}
        onOpenChange={onExtendDialogOpenChange}
        warranty={{
          id: warranty.id,
          warrantyNumber: warranty.warrantyNumber,
          productName: warranty.productName ?? undefined,
          customerName: warranty.customerName ?? undefined,
          expiryDate: warranty.expiryDate,
          status: warranty.status,
        }}
        onSubmit={onExtendWarranty}
        isSubmitting={isSubmittingExtend}
        onSuccess={onExtensionsSuccess}
      />
    </>
  );
}
