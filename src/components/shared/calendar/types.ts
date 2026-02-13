import type { ReactNode } from "react";

/**
 * Accessor functions for generic calendar items.
 * Domain provides these to map item shape to date/time strings.
 */
export interface CalendarItemAccessors<T> {
  getItemKey: (item: T) => string;
  getDate: (item: T) => string;
  getStartTime: (item: T) => string;
  getEndTime: (item: T) => string;
}

/**
 * Props for rendering a single calendar item in the week view.
 * Style includes top/height for absolute positioning.
 */
export interface CalendarItemStyle {
  top: string;
  height: string;
}

export type CalendarRenderItem<T> = (
  item: T,
  style: CalendarItemStyle
) => ReactNode;

/**
 * Props for the shared CalendarWeekView component.
 */
export interface CalendarWeekViewProps<T> extends CalendarItemAccessors<T> {
  items: T[];
  weekDays: Date[];
  renderItem: CalendarRenderItem<T>;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  /** Optional message when items are empty */
  emptyMessage?: ReactNode;
  /** Optional callback when user clicks an empty time slot (date, time HH:mm) */
  onEmptySlotClick?: (date: Date, time: string) => void;
  /** When true, each day column is a droppable zone (requires DndContext parent) */
  droppableDays?: boolean;
}

/**
 * Props for the CalendarDayColumn sub-component.
 */
export interface CalendarDayColumnProps<T> extends CalendarItemAccessors<T> {
  day: Date;
  dayIndex: number;
  items: T[];
  today: Date;
  isTodayInWeek: boolean;
  currentTime: Date;
  onScroll: (index: number) => (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef: (el: HTMLDivElement | null) => void;
  renderItem: CalendarRenderItem<T>;
  /** Optional callback when user clicks an empty time slot (date, time HH:mm) */
  onEmptySlotClick?: (date: Date, time: string) => void;
  /** Optional droppable ID for drag-and-drop (e.g. "day-2025-02-10") */
  droppableId?: string;
}
