export interface BulkActionFailure<TId extends string = string> {
  id: TId;
  label: string;
  message: string;
}

export interface BulkActionResult<TId extends string = string> {
  total: number;
  succeededIds: TId[];
  failed: BulkActionFailure<TId>[];
}

export async function executeBulkAction<TItem, TId extends string = string>(params: {
  items: TItem[];
  getId: (item: TItem) => TId;
  getLabel: (item: TItem) => string;
  run: (item: TItem) => Promise<unknown>;
}): Promise<BulkActionResult<TId>> {
  const results = await Promise.allSettled(params.items.map((item) => params.run(item)));
  const failed: BulkActionFailure<TId>[] = [];
  const succeededIds: TId[] = [];

  results.forEach((result, index) => {
    const item = params.items[index];
    const id = params.getId(item);

    if (result.status === "fulfilled") {
      succeededIds.push(id);
      return;
    }

    failed.push({
      id,
      label: params.getLabel(item),
      message: result.reason instanceof Error ? result.reason.message : "Unknown error",
    });
  });

  return {
    total: params.items.length,
    succeededIds,
    failed,
  };
}

export function summarizeBulkFailures(
  failures: BulkActionFailure[],
  maxItems = 3
): string {
  return failures
    .slice(0, maxItems)
    .map((failure) => `${failure.label}: ${failure.message}`)
    .join(" | ");
}
