import { Edit, Eye, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SerializedItem } from '@/lib/schemas/inventory';

interface SerializedItemsListPresenterProps {
  items: SerializedItem[];
  isLoading?: boolean;
  onView: (itemId: string) => void;
  onEdit: (item: SerializedItem) => void;
  onDelete: (item: SerializedItem) => void;
}

function getStatusClassName(status: SerializedItem['status']): string {
  if (status === 'available') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'allocated') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'shipped') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (status === 'returned') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'quarantined') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-zinc-100 text-zinc-700 border-zinc-200';
}

export function SerializedItemsListPresenter({
  items,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
}: SerializedItemsListPresenterProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Journey</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[160px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading serialized items...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No serialized items found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.serialNumberNormalized}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{item.productName ?? 'Unknown product'}</p>
                      <p className="text-xs text-muted-foreground">{item.productSku ?? 'No SKU'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(getStatusClassName(item.status), 'capitalize')}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.inventoryLocationName ?? 'Unassigned'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.activeOrderId ? (
                        <Link to="/orders/$orderId" params={{ orderId: item.activeOrderId }}>
                          <Badge variant="outline">{item.activeOrderNumber ?? 'Allocated order'}</Badge>
                        </Link>
                      ) : null}
                      {item.latestShipmentNumber ? (
                        <Badge variant="outline">Ship {item.latestShipmentNumber}</Badge>
                      ) : null}
                      {item.latestWarrantyId ? (
                        <Link to="/support/warranties/$warrantyId" params={{ warrantyId: item.latestWarrantyId }}>
                          <Badge variant="outline">{item.latestWarrantyNumber ?? 'Warranty'}</Badge>
                        </Link>
                      ) : null}
                      {item.latestRmaId ? (
                        <Link to="/support/rmas/$rmaId" params={{ rmaId: item.latestRmaId }}>
                          <Badge variant="outline">{item.latestRmaNumber ?? 'RMA'}</Badge>
                        </Link>
                      ) : null}
                      {!item.activeOrderId &&
                      !item.latestShipmentNumber &&
                      !item.latestWarrantyId &&
                      !item.latestRmaId ? (
                        <span className="text-xs text-muted-foreground">No linked lifecycle records</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onView(item.id)} aria-label="View detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onEdit(item)} aria-label="Edit item">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(item)}
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
