/**
 * DateTimePicker Component
 *
 * Combined date and time picker using Calendar + time input.
 * Supports keyboard navigation and ARIA accessibility.
 *
 * @see DOM-COMMS-002c
 */

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = "Select date and time",
  className,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeValue, setTimeValue] = useState(value ? formatTime(value) : "09:00");

  const handleDateSelect = useCallback(
    (selectedDate: Date | undefined) => {
      if (!selectedDate) {
        onChange(undefined);
        return;
      }

      const time = parseTimeString(timeValue);
      if (time) {
        selectedDate.setHours(time.hours, time.minutes, 0, 0);
      }

      onChange(selectedDate);
    },
    [onChange, timeValue]
  );

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTimeValue = e.target.value;
      setTimeValue(newTimeValue);

      if (value) {
        const time = parseTimeString(newTimeValue);
        if (time) {
          const newDate = new Date(value);
          newDate.setHours(time.hours, time.minutes, 0, 0);
          onChange(newDate);
        }
      }
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    []
  );

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal sm:w-[240px]",
              !value && "text-muted-foreground"
            )}
            aria-label={ariaLabel || "Select date"}
            aria-describedby={ariaDescribedBy}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-label="Date picker"
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Label htmlFor={`${id}-time`} className="sr-only">
          Time
        </Label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${id}-time`}
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            className="w-[120px] pl-9"
            aria-label="Select time"
          />
        </div>
      </div>
    </div>
  );
}
