/**
 * Mobile Inventory Actions Component
 *
 * Touch-optimized inventory operations for warehouse handheld devices.
 *
 * Accessibility:
 * - Touch targets minimum 44px
 * - Input font-size minimum 16px (prevents iOS zoom)
 * - Uses touch-action: manipulation
 * - Camera permission error state for barcode scanner
 * - Offline status indicator with sync action
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */
import { memo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Barcode,
  Camera,
  CameraOff,
  MapPin,
  Plus,
  Minus,
  Check,
  X,
  RefreshCw,
  WifiOff,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

export interface ScannedItem {
  barcode: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  locationCode?: string;
  quantity?: number;
}

export interface OfflineAction {
  id: string;
  type: "receive" | "adjust" | "count" | "transfer";
  data: Record<string, unknown>;
  createdAt: Date;
  synced: boolean;
}

type MobileQuickActionTo =
  | "/mobile/receiving"
  | "/mobile/picking"
  | "/mobile/counting"
  | "/inventory"
  | "/settings"
  | "/mobile";

interface MobileActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "destructive";
  disabled?: boolean;
  loading?: boolean;
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
}

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingActions: number;
  onSync: () => void;
  isSyncing?: boolean;
}

interface MobileInventoryCardProps {
  item: ScannedItem;
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

// ============================================================================
// STYLES
// ============================================================================

const MOBILE_STYLES = {
  // Touch targets minimum 44px
  touchTarget: "min-h-[44px] min-w-[44px]",
  // Inputs 16px+ to prevent iOS zoom
  input: "text-base leading-6",
  // Touch manipulation
  touch: "touch-action-manipulation select-none",
  // Large tap areas
  button: "h-14 px-6 text-lg font-medium",
  // Card spacing
  card: "p-4",
} as const;

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Mobile-optimized action button.
 */
export const MobileActionButton = memo(function MobileActionButton({
  icon,
  label,
  description,
  onClick,
  variant = "default",
  disabled,
  loading,
}: MobileActionButtonProps) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    success: "bg-green-600 text-white hover:bg-green-700",
    warning: "bg-orange-600 text-white hover:bg-orange-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-4 w-full p-4 rounded-lg transition-colors",
        "touch-action-manipulation select-none",
        MOBILE_STYLES.touchTarget,
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex-shrink-0">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <span className="[&>svg]:h-8 [&>svg]:w-8">{icon}</span>
        )}
      </div>
      <div className="flex-1 text-left">
        <div className="text-lg font-semibold">{label}</div>
        {description && (
          <div className="text-sm opacity-80">{description}</div>
        )}
      </div>
      <ArrowRight className="h-6 w-6 opacity-60" />
    </button>
  );
});

/**
 * Barcode scanner input with camera fallback.
 */
export const BarcodeScanner = memo(function BarcodeScanner({
  onScan,
  placeholder = "Scan barcode or enter manually",
  autoFocus = true,
  id = "barcode-scanner-input",
}: BarcodeScannerProps) {
  const [value, setValue] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        onScan(value.trim());
        setValue("");
      }
    },
    [value, onScan]
  );

  const handleCameraClick = useCallback(() => {
    // Placeholder for camera scanning
    // In production, this would use a camera library
    setCameraError(true);
    setIsScanning(false);
  }, []);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={id} className="sr-only">
            {placeholder}
          </label>
          <Barcode
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={id}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "pl-10 pr-4",
              MOBILE_STYLES.input,
              MOBILE_STYLES.touchTarget,
              "touch-action-manipulation"
            )}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCameraClick}
          disabled={isScanning}
          className={cn(MOBILE_STYLES.touchTarget, "aspect-square")}
          aria-label="Scan with camera"
        >
          {isScanning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : cameraError ? (
            <CameraOff className="h-5 w-5 text-destructive" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </Button>
      </form>

      {cameraError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
        >
          <CameraOff className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm">
            Camera access denied. Please enable camera permissions or enter the barcode manually.
          </span>
        </div>
      )}
    </div>
  );
});

/**
 * Touch-optimized quantity input with +/- buttons.
 */
export const QuantityInput = memo(function QuantityInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  disabled,
  id,
}: QuantityInputProps) {
  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  }, [value, min, step, onChange]);

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  }, [value, max, step, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10);
      if (!isNaN(newValue)) {
        onChange(Math.max(min, Math.min(max, newValue)));
      }
    },
    [min, max, onChange]
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(MOBILE_STYLES.touchTarget, "h-14 w-14")}
        aria-label="Decrease quantity"
      >
        <Minus className="h-6 w-6" />
      </Button>

      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        min={min}
        max={max}
        id={id}
        aria-label="Quantity"
        className={cn(
          "w-24 text-center tabular-nums font-bold",
          MOBILE_STYLES.input,
          MOBILE_STYLES.touchTarget,
          "h-14 text-xl"
        )}
        inputMode="numeric"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(MOBILE_STYLES.touchTarget, "h-14 w-14")}
        aria-label="Increase quantity"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
});

/**
 * Offline status indicator with sync button.
 */
export const OfflineIndicator = memo(function OfflineIndicator({
  isOnline,
  pendingActions,
  onSync,
  isSyncing,
}: OfflineIndicatorProps) {
  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        isOnline ? "bg-orange-100" : "bg-red-100"
      )}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <RefreshCw
            className={cn(
              "h-5 w-5 text-orange-600",
              isSyncing && "animate-spin"
            )}
          />
        ) : (
          <WifiOff className="h-5 w-5 text-red-600" />
        )}
        <div>
          <div className={cn("font-medium", isOnline ? "text-orange-800" : "text-red-800")}>
            {isOnline ? "Sync pending" : "Offline mode"}
          </div>
          {pendingActions > 0 && (
            <div className="text-sm opacity-80">
              {pendingActions} action{pendingActions !== 1 ? "s" : ""} waiting
            </div>
          )}
        </div>
      </div>

      {isOnline && pendingActions > 0 && (
        <Button
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className={MOBILE_STYLES.touchTarget}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync Now
        </Button>
      )}
    </div>
  );
});

/**
 * Mobile-optimized inventory item card.
 */
export const MobileInventoryCard = memo(function MobileInventoryCard({
  item,
  onConfirm,
  onCancel,
  children,
}: MobileInventoryCardProps) {
  return (
    <Card className={MOBILE_STYLES.touch}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{item.productName ?? "Unknown Product"}</CardTitle>
            {item.productSku && (
              <Badge variant="outline" className="mt-1 font-mono">
                {item.productSku}
              </Badge>
            )}
          </div>
          {item.locationCode && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.locationCode}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.barcode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Barcode className="h-4 w-4" />
            <span className="font-mono">{item.barcode}</span>
          </div>
        )}

        {children}

        {(onConfirm || onCancel) && (
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className={cn("flex-1", MOBILE_STYLES.button)}
              >
                <X className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            )}
            {onConfirm && (
              <Button
                onClick={onConfirm}
                className={cn("flex-1", MOBILE_STYLES.button)}
              >
                <Check className="h-5 w-5 mr-2" />
                Confirm
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Quick action grid for mobile home.
 */
export const MobileQuickActions = memo(function MobileQuickActions({
  actions,
}: {
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    href: MobileQuickActionTo;
    badge?: number;
  }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, i) => (
        <Link
          key={i}
          to={action.href}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-xl",
            "bg-muted/50 hover:bg-muted transition-colors",
            "touch-action-manipulation select-none",
            MOBILE_STYLES.touchTarget
          )}
        >
          <div className="relative">
            <span className="[&>svg]:h-10 [&>svg]:w-10 text-primary">
              {action.icon}
            </span>
            {action.badge !== undefined && action.badge > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {action.badge > 99 ? "99+" : action.badge}
              </span>
            )}
          </div>
          <span className="font-medium text-center">{action.label}</span>
        </Link>
      ))}
    </div>
  );
});

/**
 * Mobile page header with back navigation.
 */
export const MobilePageHeader = memo(function MobilePageHeader({
  title,
  subtitle,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-10">
      {onBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className={MOBILE_STYLES.touchTarget}
          aria-label="Go back"
        >
          <ArrowRight className="h-5 w-5 rotate-180" aria-hidden="true" />
        </Button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
});

export default {
  MobileActionButton,
  BarcodeScanner,
  QuantityInput,
  OfflineIndicator,
  MobileInventoryCard,
  MobileQuickActions,
  MobilePageHeader,
};
