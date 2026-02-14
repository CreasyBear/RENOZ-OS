/**
 * Persisted State Hook
 *
 * useState with automatic localStorage persistence.
 * Used for offline queue data that needs to survive page refreshes.
 */
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook for state that persists to localStorage.
 *
 * @param key - localStorage key
 * @param initialValue - default value if nothing in storage
 * @returns [value, setValue] tuple like useState
 *
 * @example
 * ```tsx
 * const [items, setItems] = usePersistedState<Item[]>('my-items', []);
 * ```
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize from localStorage or use initial value
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch (error) {
      logger.warn(`Failed to read ${key} from localStorage`, { error });
    }
    return initialValue;
  });

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.warn(`Failed to write ${key} to localStorage`, { error });
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Hook for managing an offline action queue with persistence.
 *
 * @param key - localStorage key for the queue
 * @returns queue state and operations
 */
export function useOfflineQueue<T extends { id?: string }>(key: string) {
  const [queue, setQueue] = usePersistedState<T[]>(key, []);
  const [isSyncing, setIsSyncing] = useState(false);

  const addToQueue = useCallback(
    (item: T) => {
      const itemWithId = {
        ...item,
        id: item.id ?? crypto.randomUUID(),
      };
      setQueue((prev) => [...prev, itemWithId]);
      return itemWithId;
    },
    [setQueue]
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
    },
    [setQueue]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, [setQueue]);

  const syncQueue = useCallback(
    async (syncFn: (item: T) => Promise<void>) => {
      if (queue.length === 0) return { success: 0, failed: 0 };

      setIsSyncing(true);
      let successCount = 0;
      const failedItems: T[] = [];

      for (const item of queue) {
        try {
          await syncFn(item);
          successCount++;
        } catch (error) {
          console.error('Failed to sync item:', error);
          failedItems.push(item);
        }
      }

      setQueue(failedItems);
      setIsSyncing(false);

      return { success: successCount, failed: failedItems.length };
    },
    [queue, setQueue]
  );

  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    syncQueue,
    isSyncing,
    queueLength: queue.length,
  };
}

export default usePersistedState;
