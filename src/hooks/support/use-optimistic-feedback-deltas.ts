import { useMemo, useState } from 'react';

interface FeedbackDelta {
  helpful: number;
  notHelpful: number;
}

type FeedbackDeltaMap = Record<string, FeedbackDelta>;

export function useOptimisticFeedbackDeltas() {
  const [deltas, setDeltas] = useState<FeedbackDeltaMap>({});

  const apply = (articleId: string, helpful: boolean) => {
    setDeltas((prev) => {
      const existing = prev[articleId] ?? { helpful: 0, notHelpful: 0 };
      return {
        ...prev,
        [articleId]: {
          helpful: existing.helpful + (helpful ? 1 : 0),
          notHelpful: existing.notHelpful + (helpful ? 0 : 1),
        },
      };
    });
  };

  const rollback = (articleId: string, helpful: boolean) => {
    setDeltas((prev) => {
      const existing = prev[articleId] ?? { helpful: 0, notHelpful: 0 };
      const next = { ...prev };
      const reverted = {
        helpful: existing.helpful - (helpful ? 1 : 0),
        notHelpful: existing.notHelpful - (helpful ? 0 : 1),
      };
      if (reverted.helpful === 0 && reverted.notHelpful === 0) {
        delete next[articleId];
      } else {
        next[articleId] = reverted;
      }
      return next;
    });
  };

  const clear = (articleId: string) => {
    setDeltas((prev) => {
      if (!prev[articleId]) return prev;
      const next = { ...prev };
      delete next[articleId];
      return next;
    });
  };

  const adjustCounts = useMemo(
    () =>
      <T extends { id: string; helpfulCount: number; notHelpfulCount: number }>(article: T): T => {
        const delta = deltas[article.id];
        if (!delta) return article;
        return {
          ...article,
          helpfulCount: Math.max(0, article.helpfulCount + delta.helpful),
          notHelpfulCount: Math.max(0, article.notHelpfulCount + delta.notHelpful),
        };
      },
    [deltas]
  );

  return {
    deltas,
    apply,
    rollback,
    clear,
    adjustCounts,
  };
}
