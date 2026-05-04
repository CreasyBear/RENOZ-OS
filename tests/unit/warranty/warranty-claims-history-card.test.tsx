import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WarrantyClaimsHistoryCard } from '@/components/domain/warranty/views/warranty-claims-history-card';
import type { WarrantyClaimListItem } from '@/lib/schemas/warranty';

type WarrantyClaimsHistoryCardProps = ComponentProps<typeof WarrantyClaimsHistoryCard>;

function createClaim(overrides: Partial<WarrantyClaimListItem> = {}): WarrantyClaimListItem {
  return {
    id: 'claim-1',
    claimNumber: 'CLM-001',
    warrantyId: 'warranty-1',
    customerId: 'customer-1',
    claimantRole: 'owner',
    claimantCustomerId: 'customer-1',
    claimantSnapshot: null,
    channelBypassReason: null,
    productId: 'product-1',
    claimType: 'bms_fault',
    status: 'submitted',
    cost: 250,
    submittedAt: '2026-02-03T00:00:00.000Z',
    description: 'BMS fault reported by operator.',
    cycleCountAtClaim: null,
    warranty: {
      warrantyNumber: 'WAR-001',
      productSerial: 'BAT-001',
    },
    commercialCustomer: {
      id: 'customer-1',
      name: 'Acme Energy',
    },
    customer: {
      id: 'customer-1',
      name: 'Acme Energy',
    },
    claimant: {
      role: 'owner',
      displayName: 'Acme Energy',
      customerId: 'customer-1',
      customer: {
        id: 'customer-1',
        name: 'Acme Energy',
      },
      snapshot: null,
      channelBypassReason: null,
    },
    product: {
      id: 'product-1',
      name: 'RENOZ Battery',
    },
    slaTracking: null,
    ...overrides,
  };
}

function createProps(
  overrides: Partial<WarrantyClaimsHistoryCardProps> = {}
): WarrantyClaimsHistoryCardProps {
  return {
    claims: [],
    canFileClaim: true,
    isClaimsLoading: false,
    isClaimsError: false,
    pendingClaimAction: null,
    onClaimRowClick: vi.fn(),
    onResolveClaimRow: vi.fn(),
    onReviewClaim: vi.fn(),
    onClaimDialogOpenChange: vi.fn(),
    onRetryClaims: vi.fn(),
    ...overrides,
  };
}

describe('WarrantyClaimsHistoryCard', () => {
  it('shows unavailable claim history without pretending there are no claims', () => {
    const onRetryClaims = vi.fn();

    render(
      <WarrantyClaimsHistoryCard
        {...createProps({
          isClaimsError: true,
          onRetryClaims,
        })}
      />
    );

    expect(
      screen.getByText('Claim history is temporarily unavailable for this warranty.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Warranty claims are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No claims filed')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetryClaims).toHaveBeenCalledTimes(1);
  });

  it('opens the claim dialog from empty states when filing is allowed', () => {
    const onClaimDialogOpenChange = vi.fn();

    render(
      <WarrantyClaimsHistoryCard
        {...createProps({
          onClaimDialogOpenChange,
        })}
      />
    );

    expect(screen.getByText('No claims filed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'File a Claim' }));

    expect(onClaimDialogOpenChange).toHaveBeenCalledWith(true);
  });

  it('keeps submitted claim review action separate from row open', () => {
    const claim = createClaim();
    const onClaimRowClick = vi.fn();
    const onReviewClaim = vi.fn();

    render(
      <WarrantyClaimsHistoryCard
        {...createProps({
          claims: [claim],
          onClaimRowClick,
          onReviewClaim,
        })}
      />
    );

    expect(screen.getByText('CLM-001')).toBeInTheDocument();
    expect(screen.getByText('BMS Fault')).toBeInTheDocument();
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Review claim CLM-001' }));

    expect(onReviewClaim).toHaveBeenCalledWith(claim);
    expect(onClaimRowClick).not.toHaveBeenCalled();
  });

  it('routes approved claim resolution through the resolve callback', () => {
    const onClaimRowClick = vi.fn();
    const onResolveClaimRow = vi.fn();

    render(
      <WarrantyClaimsHistoryCard
        {...createProps({
          claims: [createClaim({ status: 'approved' })],
          onClaimRowClick,
          onResolveClaimRow,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resolve claim CLM-001' }));

    expect(onResolveClaimRow).toHaveBeenCalledWith('claim-1');
    expect(onClaimRowClick).not.toHaveBeenCalled();
  });

  it('shows pending open state and disables duplicate open actions', () => {
    const onClaimRowClick = vi.fn();

    render(
      <WarrantyClaimsHistoryCard
        {...createProps({
          claims: [createClaim()],
          pendingClaimAction: {
            claimId: 'claim-1',
            action: 'open',
          },
          onClaimRowClick,
        })}
      />
    );

    const openButton = screen.getByRole('button', { name: 'View claim CLM-001' });

    expect(openButton).toBeDisabled();
    expect(onClaimRowClick).not.toHaveBeenCalled();
  });
});
