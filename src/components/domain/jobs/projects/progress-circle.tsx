/**
 * ProgressCircle Component
 *
 * SVG circular progress indicator for project cards and headers.
 * Based on reference patterns from project-management-reference.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ProgressCircleProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Circle size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Color for progress ring (hex or CSS color) */
  color?: string;
  /** Optional label inside circle */
  showLabel?: boolean;
  /** Optional className for styling */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProgressCircle({
  progress,
  size = 40,
  strokeWidth = 3,
  color = '#10b981', // emerald-500
  showLabel = false,
  className,
}: ProgressCircleProps) {
  // Force integer geometry to avoid sub-pixel aliasing
  const s = Math.round(size);
  const r = Math.floor((s - strokeWidth) / 2);
  const cx = s / 2;
  const cy = s / 2;

  const circumference = 2 * Math.PI * r;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const dashOffset = circumference * (1 - clampedProgress / 100);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: s, height: s }}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />

        {/* Progress ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>

      {/* Optional label */}
      {showLabel && (
        <span className="absolute text-[10px] font-medium tabular-nums">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// VARIANTS
// ============================================================================

interface StatusProgressCircleProps extends Omit<ProgressCircleProps, 'color'> {
  status: 'quoting' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
}

export function StatusProgressCircle({
  status,
  progress,
  ...props
}: StatusProgressCircleProps) {
  const statusColors: Record<typeof status, string> = {
    quoting: '#6b7280',      // gray-500
    approved: '#3b82f6',     // blue-500
    in_progress: '#14b8a6',  // teal-500
    completed: '#22c55e',    // green-500
    cancelled: '#ef4444',    // red-500
    on_hold: '#f97316',      // orange-500
  };

  return (
    <ProgressCircle
      progress={progress}
      color={statusColors[status]}
      {...props}
    />
  );
}
