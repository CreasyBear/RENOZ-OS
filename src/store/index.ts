/**
 * Store Index - Centralized State Management
 *
 * Single entry point for all Zustand stores in the application.
 * Follows Midday's organized store pattern.
 */

// UI State Store
export * from './ui';

// Domain-specific stores can be added here
// export * from './pricing'
// export * from './suppliers'
// export * from './orders'

// Re-export Zustand for convenience
export { create } from 'zustand';
export { persist, createJSONStorage } from 'zustand/middleware';
