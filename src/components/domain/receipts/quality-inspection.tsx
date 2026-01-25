/**
 * Quality Inspection Component
 *
 * Simple quality inspection interface for reviewing received items.
 * Allows marking items as accepted/rejected with notes.
 *
 * @see SUPP-GOODS-RECEIPT story
 */

import { useState } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  conditionLabels,
  receiptRejectionReasonLabels,
  itemConditions,
  receiptRejectionReasons,
  type ItemCondition,
  type ReceiptRejectionReason,
} from '@/lib/schemas/receipts';

// ============================================================================
// TYPES
// ============================================================================

interface InspectionItem {
  id: string;
  productName: string;
  productSku?: string;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  condition?: ItemCondition;
  rejectionReason?: ReceiptRejectionReason;
  qualityNotes?: string;
}

interface QualityInspectionProps {
  receiptId: string;
  receiptNumber: string;
  items: InspectionItem[];
  onComplete: (data: {
    status: 'accepted' | 'partially_accepted' | 'rejected';
    qualityNotes?: string;
    itemUpdates: Array<{
      id: string;
      quantityAccepted: number;
      quantityRejected: number;
      condition?: ItemCondition;
      rejectionReason?: ReceiptRejectionReason;
      qualityNotes?: string;
    }>;
  }) => Promise<void>;
  isProcessing?: boolean;
}

// ============================================================================
// INSPECTION ITEM ROW
// ============================================================================

interface InspectionItemRowProps {
  item: InspectionItem;
  onChange: (updates: Partial<InspectionItem>) => void;
}

function InspectionItemRow({ item, onChange }: InspectionItemRowProps) {
  const handleAcceptAll = () => {
    onChange({
      quantityAccepted: item.quantityReceived,
      quantityRejected: 0,
      condition: 'new',
      rejectionReason: undefined,
    });
  };

  const handleRejectAll = () => {
    onChange({
      quantityAccepted: 0,
      quantityRejected: item.quantityReceived,
      condition: 'damaged',
      rejectionReason: 'quality_issue',
    });
  };

  const isFullyAccepted = item.quantityAccepted === item.quantityReceived;
  const isFullyRejected = item.quantityRejected === item.quantityReceived;
  const isPartial = !isFullyAccepted && !isFullyRejected && item.quantityReceived > 0;

  return (
    <div className="space-y-3 border-b pb-4 last:border-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item.productName}</p>
          {item.productSku && (
            <p className="text-muted-foreground text-sm">SKU: {item.productSku}</p>
          )}
          <p className="text-muted-foreground text-sm">Received: {item.quantityReceived} units</p>
        </div>
        <div className="flex items-center gap-2">
          {isFullyAccepted && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Accepted
            </Badge>
          )}
          {isFullyRejected && (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Rejected
            </Badge>
          )}
          {isPartial && (
            <Badge variant="secondary">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Partial
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isFullyAccepted ? 'default' : 'outline'}
          size="sm"
          onClick={handleAcceptAll}
        >
          <CheckCircle className="mr-1 h-4 w-4" />
          Accept All
        </Button>
        <Button
          type="button"
          variant={isFullyRejected ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleRejectAll}
        >
          <XCircle className="mr-1 h-4 w-4" />
          Reject All
        </Button>
      </div>

      {item.quantityRejected > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select
              value={item.condition || ''}
              onValueChange={(value) => onChange({ condition: value as ItemCondition })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {itemConditions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {conditionLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rejection Reason</Label>
            <Select
              value={item.rejectionReason || ''}
              onValueChange={(value) => onChange({ rejectionReason: value as ReceiptRejectionReason })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {receiptRejectionReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {receiptRejectionReasonLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Quality notes for this item..."
          value={item.qualityNotes || ''}
          onChange={(e) => onChange({ qualityNotes: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function QualityInspection({
  receiptId,
  receiptNumber,
  items: initialItems,
  onComplete,
  isProcessing = false,
}: QualityInspectionProps) {
  // Prefix unused param
  void receiptId;

  const [items, setItems] = useState<InspectionItem[]>(initialItems);
  const [overallNotes, setOverallNotes] = useState('');

  const handleItemChange = (id: string, updates: Partial<InspectionItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleComplete = async () => {
    const totalAccepted = items.reduce((sum, i) => sum + i.quantityAccepted, 0);
    const totalRejected = items.reduce((sum, i) => sum + i.quantityRejected, 0);

    let status: 'accepted' | 'partially_accepted' | 'rejected';
    if (totalRejected === 0) {
      status = 'accepted';
    } else if (totalAccepted === 0) {
      status = 'rejected';
    } else {
      status = 'partially_accepted';
    }

    await onComplete({
      status,
      qualityNotes: overallNotes || undefined,
      itemUpdates: items.map((item) => ({
        id: item.id,
        quantityAccepted: item.quantityAccepted,
        quantityRejected: item.quantityRejected,
        condition: item.condition,
        rejectionReason: item.rejectionReason,
        qualityNotes: item.qualityNotes,
      })),
    });
  };

  // Calculate summary
  const totalReceived = items.reduce((sum, i) => sum + i.quantityReceived, 0);
  const totalAccepted = items.reduce((sum, i) => sum + i.quantityAccepted, 0);
  const totalRejected = items.reduce((sum, i) => sum + i.quantityRejected, 0);
  const pendingInspection = totalReceived - totalAccepted - totalRejected;

  const canComplete = pendingInspection === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Quality Inspection - {receiptNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{totalReceived}</p>
            <p className="text-muted-foreground text-xs">Received</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{totalAccepted}</p>
            <p className="text-muted-foreground text-xs">Accepted</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">{totalRejected}</p>
            <p className="text-muted-foreground text-xs">Rejected</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-600">{pendingInspection}</p>
            <p className="text-muted-foreground text-xs">Pending</p>
          </div>
        </div>

        <Separator />

        {/* Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <InspectionItemRow
              key={item.id}
              item={item}
              onChange={(updates) => handleItemChange(item.id, updates)}
            />
          ))}
        </div>

        <Separator />

        {/* Overall Notes */}
        <div className="space-y-2">
          <Label>Overall Inspection Notes</Label>
          <Textarea
            placeholder="Any overall notes about this inspection..."
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Complete Button */}
        <Button onClick={handleComplete} disabled={!canComplete || isProcessing} className="w-full">
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Complete Inspection
        </Button>

        {!canComplete && (
          <p className="text-muted-foreground text-center text-sm">
            Please inspect all {pendingInspection} pending items before completing.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { QualityInspection };
export type { QualityInspectionProps, InspectionItem };
