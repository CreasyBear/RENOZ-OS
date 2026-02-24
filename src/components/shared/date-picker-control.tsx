/**
 * DatePickerControl Component
 *
 * Standalone date picker for non-form contexts.
 * Uses string (YYYY-MM-DD) for value/onChange.
 * Uses format() from date-fns for local date (avoids toISOString timezone bugs).
 *
 * @example
 * ```tsx
 * const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
 * <DatePickerControl
 *   value={dateFrom}
 *   onChange={setDateFrom}
 *   label="From Date"
 * />
 * ```
 */
import { format } from "date-fns";
import { DatePicker } from "~/components/ui/date-picker";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

export interface DatePickerControlProps {
  /** Value in YYYY-MM-DD format */
  value: string;
  /** Called with YYYY-MM-DD string when date changes */
  onChange: (value: string) => void;
  /** Optional label */
  label?: string;
  /** Placeholder when no date selected */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Minimum selectable date */
  fromDate?: Date;
  /** Maximum selectable date */
  toDate?: Date;
  /** Additional class names */
  className?: string;
}

function parseDate(value: string): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export function DatePickerControl({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  disabled,
  fromDate,
  toDate,
  className,
}: DatePickerControlProps) {
  const dateValue = parseDate(value);

  const handleDateChange = (date: Date | undefined) => {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <DatePicker
        date={dateValue}
        onDateChange={handleDateChange}
        placeholder={placeholder}
        disabled={disabled}
        fromDate={fromDate}
        toDate={toDate}
      />
    </div>
  );
}
