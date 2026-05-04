export interface SerialManifestLineItem {
  description: string;
  sku?: string | null;
  quantity: number;
  serialNumbers?: string[];
}

export interface SerialManifestRow {
  serial: string;
  description: string;
}

export interface SerialManifestGroup {
  itemKey: string;
  title: string;
  meta: string;
  serials: string[];
}

export function buildSerialManifestRows(
  items: SerialManifestLineItem[]
): SerialManifestRow[] {
  return items.flatMap((item) =>
    (item.serialNumbers ?? []).map((serial) => ({
      serial,
      description: [item.description, item.sku ? `SKU ${item.sku}` : null, `Qty ${item.quantity}`]
        .filter(Boolean)
        .join(" · "),
    }))
  );
}

export function buildSerialManifestGroups(
  items: SerialManifestLineItem[]
): SerialManifestGroup[] {
  return items.flatMap((item, index) => {
    const serials = item.serialNumbers ?? [];
    if (serials.length === 0) {
      return [];
    }

    return [
      {
        itemKey: `${item.sku ?? item.description}-${index}`,
        title: item.description,
        meta: [item.sku ? `SKU ${item.sku}` : null, `Qty ${item.quantity}`]
          .filter(Boolean)
          .join(" · "),
        serials,
      },
    ];
  });
}
