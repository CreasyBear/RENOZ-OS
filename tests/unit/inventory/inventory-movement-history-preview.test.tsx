import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MovementHistoryPreview } from '@/components/domain/inventory/views/inventory-movement-history-preview';
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

describe('MovementHistoryPreview', () => {
  it('renders the first five movements, total count, signed quantities, and overflow count', () => {
    render(
      <MovementHistoryPreview
        movements={[
          movement({ id: 'm-1', movementType: 'receive', quantity: 12 }),
          movement({ id: 'm-2', movementType: 'allocate', quantity: -4 }),
          movement({ id: 'm-3', movementType: 'ship', quantity: -3 }),
          movement({ id: 'm-4', movementType: 'adjust', quantity: 2 }),
          movement({ id: 'm-5', movementType: 'return', quantity: 1 }),
          movement({ id: 'm-6', movementType: 'transfer', quantity: -1 }),
        ]}
      />
    );

    expect(screen.getByText('Recent Movements')).toBeInTheDocument();
    expect(screen.getByText('6 total')).toBeInTheDocument();
    expect(screen.getByText('receive')).toBeInTheDocument();
    expect(screen.getByText('allocate')).toBeInTheDocument();
    expect(screen.getByText('ship')).toBeInTheDocument();
    expect(screen.getByText('adjust')).toBeInTheDocument();
    expect(screen.getByText('return')).toBeInTheDocument();
    expect(screen.queryByText('transfer')).not.toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('-4')).toBeInTheDocument();
    expect(screen.getByText('+1 more movements')).toBeInTheDocument();
  });

  it('renders no empty placeholder when there are no movements', () => {
    const { container } = render(<MovementHistoryPreview movements={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps movement history preview out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const preview = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-movement-history-preview.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { MovementHistoryPreview } from './inventory-movement-history-preview'"
    );
    expect(detailView).not.toContain('function MovementHistoryPreview');
    expect(preview).toContain('export function MovementHistoryPreview');
    expect(preview).toContain('movements.slice(0, 5)');
  });
});
