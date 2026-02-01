'use client';

import { CalendarIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Minimum selectable date */
  fromDate?: Date;
  /** Maximum selectable date */
  toDate?: Date;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  fromDate,
  toDate,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? date.toLocaleDateString() : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          fromDate={fromDate}
          toDate={toDate}
        />
      </PopoverContent>
    </Popover>
  );
}
