/**
 * Shared schema typing helpers.
 *
 * These aliases are used for JSON values that cross ServerFn boundaries.
 * TanStack Start expects object maps compatible with `{ [x: string]: {} }`.
 */
export type JsonObjectWire = Record<string, any>;
