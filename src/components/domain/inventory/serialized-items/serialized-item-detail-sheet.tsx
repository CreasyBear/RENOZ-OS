import { useState } from 'react';
import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SerializedItemDetailResult } from '@/lib/schemas/inventory';

interface SerializedItemDetailSheetProps {
  open: boolean;
  data?: SerializedItemDetailResult;
  isLoading?: boolean;
  isSavingNote?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitNote: (note: string) => Promise<void>;
}

export function SerializedItemDetailSheet({
  open,
  data,
  isLoading = false,
  isSavingNote = false,
  onOpenChange,
  onSubmitNote,
}: SerializedItemDetailSheetProps) {
  const [note, setNote] = useState('');

  const submitNote = async () => {
    const next = note.trim();
    if (!next) return;
    await onSubmitNote(next);
    setNote('');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSavingNote && !nextOpen) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Serialized Item Detail</SheetTitle>
          <SheetDescription>
            Event lineage, status, and references for this serial.
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="mt-6 text-sm text-muted-foreground">Loading serialized item details...</div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-md border p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm">{data.item.serialNumberNormalized}</p>
                <Badge variant="secondary">{data.item.status}</Badge>
              </div>
              <p className="text-sm">
                {data.item.productName ?? 'Unknown product'} {data.item.productSku ? `(${data.item.productSku})` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated {format(new Date(data.item.updatedAt), 'PPp')}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {data.item.sourceReceiptNumber ? (
                  <Badge variant="outline">Receipt {data.item.sourceReceiptNumber}</Badge>
                ) : null}
                {data.item.activeOrderId ? (
                  <Link to="/orders/$orderId" params={{ orderId: data.item.activeOrderId }}>
                    <Badge variant="outline">{data.item.activeOrderNumber ?? 'Allocated order'}</Badge>
                  </Link>
                ) : null}
                {data.item.latestShipmentNumber ? (
                  <Badge variant="outline">Shipment {data.item.latestShipmentNumber}</Badge>
                ) : null}
                {data.item.latestWarrantyId ? (
                  <Link to="/support/warranties/$warrantyId" params={{ warrantyId: data.item.latestWarrantyId }}>
                    <Badge variant="outline">{data.item.latestWarrantyNumber ?? 'Warranty'}</Badge>
                  </Link>
                ) : null}
                {data.item.latestRmaId ? (
                  <Link to="/support/rmas/$rmaId" params={{ rmaId: data.item.latestRmaId }}>
                    <Badge variant="outline">{data.item.latestRmaNumber ?? 'RMA'}</Badge>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Add note</p>
              <div className="flex gap-2">
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add context to lineage timeline"
                  disabled={isSavingNote}
                />
                <Button onClick={submitNote} disabled={isSavingNote || note.trim().length === 0}>
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Event timeline</p>
              <ScrollArea className="h-[380px] rounded-md border p-3">
                <div className="space-y-3">
                  {data.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events recorded yet.</p>
                  ) : (
                    data.events.map((event) => (
                      <div key={event.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">{event.eventType}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.occurredAt), 'PPp')}
                          </span>
                        </div>
                        {event.notes ? (
                          <p className="mt-2 text-sm text-muted-foreground">{event.notes}</p>
                        ) : null}
                        {event.entityType || event.entityId ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ref: {event.entityType ?? 'entity'} {event.entityId ?? 'unknown'}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
