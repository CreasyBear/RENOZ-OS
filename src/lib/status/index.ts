/**
 * Status Badge Exports
 *
 * Centralized exports for status colors, types, and utilities.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

// Colors
export {
  STATUS_COLORS,
  type SemanticColor,
  type SemanticColorDef,
  type ModeColors,
  getStatusColorClasses,
  getStatusHex,
  getStatusRgb,
  getStatusRgba,
} from './colors';

// Types
export type {
  StatusConfigItem,
  StatusConfig,
  TypeConfigItem,
  TypeConfig,
} from './types';
