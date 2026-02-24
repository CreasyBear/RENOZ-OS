/**
 * Purchase Order Creation Wizard
 *
 * 3-step wizard for creating purchase orders:
 * 1. Select Supplier
 * 2. Add Line Items
 * 3. Review & Submit
 *
 * @see _Initiation/_prd/sprints/sprint-01-route-cleanup.prd.json (SPRINT-01-005)
 * @see _Initiation/_prd/2-domains/suppliers/wireframes/po-detail.wireframe.md
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Building2,
  Package,
  FileText,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerControl } from "@/components/shared";

import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks";
import { useOrgFormat } from "@/hooks/use-org-format";

// Supplier type from listSuppliers (matches actual server function return)
export interface SupplierItem {
  id: string;
  supplierCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "suspended" | "inactive" | "blacklisted";
  supplierType: "service" | "manufacturer" | "distributor" | "retailer" | "raw_materials" | null;
  primaryContactName: string | null;
  overallRating: number | null;
  leadTimeDays: number | null;
  lastOrderDate: Date | null;
  totalPurchaseOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

// Product type from listProducts
export interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  basePrice: number | null;
  costPrice: number | null;
  status: string;
  isActive: boolean;
  [key: string]: unknown;
}

// ============================================================================
// TYPES
// ============================================================================

export interface POCreationWizardProps {
  /** Available suppliers for selection */
  suppliers: SupplierItem[];
  /** Available products for line items */
  products: ProductItem[];
  /** Optional supplier preselection intent from route/search */
  initialSupplierId?: string | null;
  /** Loading state for submission */
  isSubmitting: boolean;
  /** Callback when PO is submitted */
  onSubmit: (data: PurchaseOrderFormData) => Promise<void>;
  /** Callback when wizard is cancelled */
  onCancel: () => void;
}

export interface PurchaseOrderFormData {
  supplierId: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  items: PurchaseOrderItemFormData[];
}

export interface PurchaseOrderItemFormData {
  productId?: string;
  productName: string;
  productSku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

function getLineItemValidationError(items: PurchaseOrderItemFormData[]): string | null {
  if (items.length === 0) return "Please add at least one item";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = i + 1;

    if (!item.productName?.trim()) {
      return `Line item #${row} is missing a product name`;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return `Line item #${row} must have a quantity greater than 0`;
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return `Line item #${row} has an invalid unit price`;
    }
  }

  return null;
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

interface Step {
  id: number;
  title: string;
  description: string;
  icon: typeof Building2;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "Select Supplier",
    description: "Choose a supplier for this order",
    icon: Building2,
  },
  {
    id: 2,
    title: "Add Line Items",
    description: "Add products and quantities",
    icon: Package,
  },
  {
    id: 3,
    title: "Review & Submit",
    description: "Review and confirm order details",
    icon: FileText,
  },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full border-2
                    ${isActive ? "border-primary bg-primary text-primary-foreground" : ""}
                    ${isCompleted ? "border-primary bg-primary text-primary-foreground" : ""}
                    ${!isActive && !isCompleted ? "border-muted-foreground/30 text-muted-foreground" : ""}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium ${
                      isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-4 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 1: SUPPLIER SELECTION
// ============================================================================

interface Step1SupplierSelectionProps {
  suppliers: SupplierItem[];
  selectedSupplierId: string | null;
  onSelect: (supplierId: string) => void;
}

function Step1SupplierSelection({
  suppliers,
  selectedSupplierId,
  onSelect,
}: Step1SupplierSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.supplierCode?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search suppliers by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-4 space-y-3">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No suppliers found</p>
            </div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                onClick={() => onSelect(supplier.id)}
                className={`
                  w-full text-left p-4 rounded-lg border transition-colors
                  ${
                    selectedSupplierId === supplier.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    {supplier.supplierCode && (
                      <p className="text-sm text-muted-foreground">
                        Code: {supplier.supplierCode}
                      </p>
                    )}
                    {supplier.email && (
                      <p className="text-sm text-muted-foreground">
                        {supplier.email}
                      </p>
                    )}
                  </div>
                  {selectedSupplierId === supplier.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {selectedSupplierId && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            Supplier selected. Click &quot;Next&quot; to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// STEP 2: LINE ITEMS
// ============================================================================

interface Step2LineItemsProps {
  items: PurchaseOrderItemFormData[];
  products: ProductItem[];
  onAddItem: () => void;
  onUpdateItem: (index: number, item: PurchaseOrderItemFormData) => void;
  onRemoveItem: (index: number) => void;
}

function Step2LineItems({
  items,
  products,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: Step2LineItemsProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Order Line Items</h3>
          <p className="text-sm text-muted-foreground">
            Add products to your purchase order
          </p>
        </div>
        <Button onClick={onAddItem} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No items added</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add products to your purchase order
            </p>
            <Button onClick={onAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <LineItemCard
              key={index}
              index={index}
              item={item}
              products={products}
              onUpdate={(updatedItem) => onUpdateItem(index, updatedItem)}
              onRemove={() => onRemoveItem(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LINE ITEM CARD
// ============================================================================

interface LineItemCardProps {
  index: number;
  item: PurchaseOrderItemFormData;
  products: ProductItem[];
  onUpdate: (item: PurchaseOrderItemFormData) => void;
  onRemove: () => void;
}

function LineItemCard({ index, item, products, onUpdate, onRemove }: LineItemCardProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(!item.productId);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleSelectProduct = (product: ProductItem) => {
    onUpdate({
      ...item,
      productId: product.id,
      productName: product.name,
      productSku: product.sku ?? undefined,
      unitPrice: product.costPrice || product.basePrice || 0,
    });
    setShowProductSearch(false);
  };

  const lineTotal = item.quantity * item.unitPrice;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Item #{index + 1}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showProductSearch ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full text-left p-3 rounded hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{product.name}</p>
                    {product.sku && (
                      <p className="text-sm text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatCurrencyDisplay(product.costPrice || product.basePrice || 0)}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
            <Button
              variant="ghost"
              onClick={() => {
                onUpdate({ ...item, productName: "Custom Item" });
                setShowProductSearch(false);
              }}
            >
              Add custom item without product
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.productSku && (
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.productSku}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProductSearch(true)}
              >
                Change
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdate({
                      ...item,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={(e) =>
                    onUpdate({
                      ...item,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Additional details about this item..."
                value={item.description || ""}
                onChange={(e) => onUpdate({ ...item, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Line Total</span>
              <span className="font-semibold">{formatCurrencyDisplay(lineTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// STEP 3: REVIEW & SUBMIT
// ============================================================================

interface Step3ReviewProps {
  formData: PurchaseOrderFormData;
  suppliers: SupplierItem[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

function Step3Review({ formData, suppliers, onSubmit, isSubmitting }: Step3ReviewProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });
  const supplier = suppliers.find((s) => s.id === formData.supplierId);

  const totals = useMemo(() => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxRate = 0.1; // 10% GST
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [formData.items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription>Review your purchase order before submitting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supplier Info */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Supplier
            </h4>
            <p className="font-medium">{supplier?.name || "Unknown Supplier"}</p>
            {supplier?.email && (
              <p className="text-sm text-muted-foreground">{supplier.email}</p>
            )}
          </div>

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Expected Delivery
              </h4>
              <p>
                {formData.expectedDeliveryDate
                  ? new Date(formData.expectedDeliveryDate).toLocaleDateString(
                      "en-AU"
                    )
                  : "Not specified"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Payment Terms
              </h4>
              <p>{formData.paymentTerms || "Not specified"}</p>
            </div>
          </div>

          {formData.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Notes
                </h4>
                <p className="text-sm">{formData.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items ({formData.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <p className="font-medium">{item.productName}</p>
                    {item.productSku && (
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.productSku}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyDisplay(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyDisplay(item.quantity * item.unitPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyDisplay(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST (10%)</span>
              <span>{formatCurrencyDisplay(totals.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrencyDisplay(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Purchase Order...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Create Purchase Order
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export function POCreationWizard({
  suppliers,
  products,
  initialSupplierId = null,
  isSubmitting,
  onSubmit,
  onCancel,
}: POCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplierId: initialSupplierId ?? "",
    items: [],
  });

  useEffect(() => {
    if (!initialSupplierId || formData.supplierId) return;
    globalThis.queueMicrotask(() =>
      setFormData((prev) => ({ ...prev, supplierId: initialSupplierId }))
    );
  }, [initialSupplierId, formData.supplierId]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectSupplier = useCallback((supplierId: string) => {
    setFormData((prev) => ({ ...prev, supplierId }));
  }, []);

  const handleAddItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productName: "",
          quantity: 1,
          unitPrice: 0,
        },
      ],
    }));
  }, []);

  const handleUpdateItem = useCallback(
    (index: number, item: PurchaseOrderItemFormData) => {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((i, idx) => (idx === index ? item : i)),
      }));
    },
    []
  );

  const handleRemoveItem = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 1 && !formData.supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (currentStep === 2) {
      const lineItemError = getLineItemValidationError(formData.items);
      if (lineItemError) {
        toast.error(lineItemError);
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, [currentStep, formData]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    const lineItemError = getLineItemValidationError(formData.items);
    if (lineItemError) {
      toast.error(lineItemError);
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      // onSubmit handler owns user-facing error toasts
    }
  }, [formData, onSubmit]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator currentStep={currentStep} />

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <Step1SupplierSelection
              suppliers={suppliers}
              selectedSupplierId={formData.supplierId}
              onSelect={handleSelectSupplier}
            />
          )}

          {currentStep === 2 && (
            <>
              <Step2LineItems
                items={formData.items}
                products={products}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
              />

              {/* Order Details Form */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <DatePickerControl
                      label="Expected Delivery Date"
                      value={formData.expectedDeliveryDate || ""}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          expectedDeliveryDate: value,
                        }))
                      }
                    />
                    <div className="space-y-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={formData.paymentTerms || ""}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            paymentTerms: value,
                          }))
                        }
                      >
                        <SelectTrigger id="paymentTerms">
                          <SelectValue placeholder="Select terms..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 7">Net 7</SelectItem>
                          <SelectItem value="Net 14">Net 14</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Due on receipt">
                            Due on receipt
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes for the supplier..."
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {currentStep === 3 && (
            <Step3Review
              formData={formData}
              suppliers={suppliers}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 3 && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handleBack}
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </>
            )}
          </Button>
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default POCreationWizard;
