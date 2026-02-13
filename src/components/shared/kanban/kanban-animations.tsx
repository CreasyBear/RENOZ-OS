/* eslint-disable react-refresh/only-export-components -- Component exports components + animation configs */
/**
 * Kanban Animations
 *
 * Framer Motion animation wrappers for smooth, polished kanban interactions.
 * Includes spring animations for cards and collapse animations for columns.
 *
 * @see docs/design-system/KANBAN-STANDARDS.md
 */

import { memo, type ReactNode } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

// ============================================================================
// ANIMATION CONFIGS
// ============================================================================

/** Spring config for card movements */
export const cardSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 1,
};

/** Spring config for column movements */
export const columnSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

/** Quick transition for micro-interactions */
export const quickTransition = {
  duration: 0.15,
  ease: "easeOut" as const,
};

/** Standard transition */
export const standardTransition = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

// ============================================================================
// CARD ANIMATION WRAPPER
// ============================================================================

export interface AnimatedCardProps {
  children: ReactNode;
  /** Unique key for AnimatePresence */
  layoutId?: string;
  /** Is card currently being dragged */
  isDragging?: boolean;
  /** Is card keyboard focused */
  isFocused?: boolean;
  /** Is card selected */
  isSelected?: boolean;
  /** Disable animations (for reduced motion) */
  reducedMotion?: boolean;
  className?: string;
}

const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: quickTransition,
  },
  dragging: {
    scale: 1.02,
    rotate: 2,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    zIndex: 50,
  },
  focused: {
    boxShadow: "0 0 0 2px hsl(var(--primary))",
  },
};

export const AnimatedCard = memo(function AnimatedCard({
  children,
  layoutId,
  isDragging,
  isFocused,
  isSelected: _isSelected,
  reducedMotion = false,
  className,
}: AnimatedCardProps) {
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      layout
      layoutId={layoutId}
      variants={cardVariants}
      initial="initial"
      animate={isDragging ? "dragging" : isFocused ? "focused" : "animate"}
      exit="exit"
      transition={cardSpring}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// ============================================================================
// CARD LIST ANIMATION
// ============================================================================

export interface AnimatedCardListProps {
  children: ReactNode;
  /** Disable animations (for reduced motion) */
  reducedMotion?: boolean;
}

export const AnimatedCardList = memo(function AnimatedCardList({
  children,
  reducedMotion = false,
}: AnimatedCardListProps) {
  if (reducedMotion) {
    return <>{children}</>;
  }

  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>;
});

// ============================================================================
// COLUMN COLLAPSE ANIMATION
// ============================================================================

export interface AnimatedCollapseProps {
  children: ReactNode;
  isOpen: boolean;
  /** Disable animations (for reduced motion) */
  reducedMotion?: boolean;
}

export const AnimatedCollapse = memo(function AnimatedCollapse({
  children,
  isOpen,
  reducedMotion = false,
}: AnimatedCollapseProps) {
  if (reducedMotion) {
    return isOpen ? <>{children}</> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={standardTransition}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// COLUMN REORDER ANIMATION
// ============================================================================

export interface AnimatedColumnProps {
  children: ReactNode;
  layoutId: string;
  /** Disable animations (for reduced motion) */
  reducedMotion?: boolean;
  className?: string;
}

export const AnimatedColumn = memo(function AnimatedColumn({
  children,
  layoutId,
  reducedMotion = false,
  className,
}: AnimatedColumnProps) {
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div layout layoutId={layoutId} transition={columnSpring} className={className}>
      {children}
    </motion.div>
  );
});

// ============================================================================
// SUCCESS PULSE ANIMATION (for completed items)
// ============================================================================

export interface SuccessPulseProps {
  show: boolean;
  children: ReactNode;
}

export const SuccessPulse = memo(function SuccessPulse({
  show,
  children,
}: SuccessPulseProps) {
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 bg-green-500/30 rounded-lg pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// DROP INDICATOR ANIMATION
// ============================================================================

export interface AnimatedDropIndicatorProps {
  show: boolean;
}

export const AnimatedDropIndicator = memo(function AnimatedDropIndicator({
  show,
}: AnimatedDropIndicatorProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          transition={quickTransition}
          className="h-[100px] border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 flex items-center justify-center"
          style={{ originY: 0.5 }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs text-primary/60 font-medium"
          >
            Drop here
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// STAGGER CHILDREN (for initial load)
// ============================================================================

export interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export const StaggerContainer = memo(function StaggerContainer({
  children,
}: StaggerContainerProps) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
});

export const StaggerItem = memo(function StaggerItem({
  children,
}: {
  children: ReactNode;
}) {
  return <motion.div variants={staggerItem}>{children}</motion.div>;
});
