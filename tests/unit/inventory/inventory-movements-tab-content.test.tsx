import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MovementsTabContent } from '@/components/domain/inventory/views/inventory-movements-tab-content';
import type { MovementRecord } from '@/components/domain/inventory/item-tabs';

function movement(overrides: Partial<MovementRecord>): MovementRecord {
  return {
    id: overrides.id ?? 'movement-1',
    movementType: overrides.movementType ?? 'receive',
    quantity: overrides.quantity ?? 1,
    previousQuantity: overrides.previousQuantity ?? 0,
    newQuantity: overrides.newQuantity ?? 1,
    performedBy: overrides.performedBy ?? 'Operator',
    performedAt: overrides.performedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('MovementsTabContent', () => {
  it('renders an honest empty state when no movement trace exists', () => {
    render(<MovementsTabContent movements={[]} />);

    expect(screen.getByText('No movement history')).toBeInTheDocument();
  });

  it('renders loading placeholders while the movement trace is loading', () => {
    const { container } = render(<MovementsTabContent isLoading />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(20);
  });

  it('renders movement type, operator, reason, reference fallback, and quantity transition', () => {
    render(
      <MovementsTabContent
        movements={[
          movement({
            movementType: 'receive',
            quantity: 12,
            previousQuantity: 0,
            newQuantity: 12,
            performedBy: 'Joel',
            referenceType: 'stock_count',
            referenceNumber: 'SC-1001',
            reason: 'Initial receiving correction',
          }),
        ]}
      />
    );

    expect(screen.getByText('receive')).toBeInTheDocument();
    expect(screen.getByText(/Joel/)).toBeInTheDocument();
    expect(screen.getByText('SC-1001')).toBeInTheDocument();
    expect(screen.getByText('Initial receiving correction')).toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('0 - 12')).toBeInTheDocument();
  });

  it('keeps the full movement tab out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const movementsTab = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-movements-tab-content.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { MovementsTabContent } from './inventory-movements-tab-content'"
    );
    expect(detailView).not.toContain('function MovementsTabContent');
    expect(movementsTab).toContain('export function MovementsTabContent');
    expect(movementsTab).toContain('getMovementReferenceLink');
  });
});
