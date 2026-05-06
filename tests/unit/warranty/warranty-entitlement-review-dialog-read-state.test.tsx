import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseWarrantyEntitlement = vi.fn();

vi.mock('@/hooks/warranty', () => ({
  useWarrantyEntitlement: (...args: unknown[]) => mockUseWarrantyEntitlement(...args),
}));

describe('warranty entitlement review dialog read state', () => {
  it('uses operator-safe copy for entitlement detail failures', async () => {
    mockUseWarrantyEntitlement.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('postgres entitlement detail timeout'),
    });

    const { WarrantyEntitlementReviewDialog } = await import(
      '@/components/domain/warranty/dialogs/warranty-entitlement-review-dialog'
    );

    render(
      <WarrantyEntitlementReviewDialog
        entitlementId="entitlement-1"
        open
        onOpenChange={vi.fn()}
        onActivate={vi.fn()}
      />
    );

    expect(screen.getByText('Review Entitlement')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Warranty entitlement details are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres entitlement detail timeout')).not.toBeInTheDocument();
  });
});
