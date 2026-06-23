"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";

type Store = {
  id: string;
  name: string;
  format: string;
  accent: string;
  tripCost: number;
  note: string;
};

type PriceQuote = {
  price: number;
  packSize: number;
  packageLabel: string;
  note?: string;
  source?: "seed" | "live" | "manual";
  sourceName?: string;
  fetchedAt?: string;
  regularPrice?: number;
  promoPrice?: number;
  dealType?: "sale" | "coupon" | "membership" | "none";
  dealNote?: string;
  productName?: string;
  confidence?: "matched" | "fallback";
};

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  step: number;
  prices: Record<string, PriceQuote | undefined>;
};

type LineChoice = {
  item: CatalogItem;
  quantity: number;
  store: Store;
  quote: PriceQuote;
  packages: number;
  unitsPurchased: number;
  cost: number;
};

type Tab = "split" | "single" | "prices";

type SourceStatus = {
  storeId: string;
  status: "live" | "not_synced" | "needs_config" | "provider_needed" | "error";
  sourceName: string;
  message: string;
  checkedAt: string;
};

type LiveQuote = {
  itemId: string;
  storeId: string;
  price: number;
  packageLabel?: string;
  regularPrice?: number;
  promoPrice?: number;
  dealType?: "sale" | "coupon" | "membership" | "none";
  dealNote?: string;
  source: "live";
  sourceName: string;
  fetchedAt: string;
  productName?: string;
  confidence: "matched" | "fallback";
};

type LivePriceResponse = {
  fetchedAt: string;
  quotes: Record<string, Record<string, LiveQuote>>;
  sourceStatus: Record<string, SourceStatus>;
  assumptions: string[];
  error?: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const storeColors = [
  "#13795b",
  "#b42318",
  "#1d4ed8",
  "#7c3aed",
  "#b45309",
  "#0f766e",
  "#be185d",
];

const defaultPostalCode = process.env.NEXT_PUBLIC_DEFAULT_POSTAL_CODE ?? "60647";

const seedStores: Store[] = [
  {
    id: "marianos",
    name: "Mariano's",
    format: "Neighborhood grocer",
    accent: "#13795b",
    tripCost: 0,
    note: "Good produce and quick fill-in trips",
  },
  {
    id: "jewel",
    name: "Jewel-Osco",
    format: "Weekly grocery run",
    accent: "#b42318",
    tripCost: 0,
    note: "Strong sale pricing on staples",
  },
  {
    id: "costco",
    name: "Costco",
    format: "Warehouse",
    accent: "#1d4ed8",
    tripCost: 0,
    note: "Bulk packs, membership assumed active",
  },
];

const seedCatalog: CatalogItem[] = [
  {
    id: "bananas",
    name: "Bananas",
    category: "Produce",
    unit: "lb",
    step: 1,
    prices: {
      marianos: { price: 0.69, packSize: 1, packageLabel: "per lb" },
      jewel: { price: 0.59, packSize: 1, packageLabel: "per lb" },
      costco: { price: 1.99, packSize: 3, packageLabel: "3 lb bunch" },
    },
  },
  {
    id: "milk",
    name: "Milk",
    category: "Dairy",
    unit: "gal",
    step: 1,
    prices: {
      marianos: { price: 3.89, packSize: 1, packageLabel: "1 gal" },
      jewel: { price: 3.49, packSize: 1, packageLabel: "1 gal" },
      costco: { price: 6.49, packSize: 2, packageLabel: "2 gal pack" },
    },
  },
  {
    id: "eggs",
    name: "Large eggs",
    category: "Dairy",
    unit: "dozen",
    step: 1,
    prices: {
      marianos: { price: 4.99, packSize: 1, packageLabel: "1 dozen" },
      jewel: { price: 3.99, packSize: 1, packageLabel: "1 dozen" },
      costco: { price: 7.29, packSize: 2, packageLabel: "2 dozen pack" },
    },
  },
  {
    id: "sourdough",
    name: "Sourdough bread",
    category: "Bakery",
    unit: "loaf",
    step: 1,
    prices: {
      marianos: { price: 4.99, packSize: 1, packageLabel: "1 loaf" },
      jewel: { price: 4.49, packSize: 1, packageLabel: "1 loaf" },
      costco: { price: 7.99, packSize: 2, packageLabel: "2 loaf pack" },
    },
  },
  {
    id: "chicken",
    name: "Chicken breast",
    category: "Meat",
    unit: "lb",
    step: 0.5,
    prices: {
      marianos: { price: 4.99, packSize: 1, packageLabel: "per lb" },
      jewel: { price: 3.99, packSize: 1, packageLabel: "per lb" },
      costco: { price: 23.99, packSize: 6.5, packageLabel: "6.5 lb pack" },
    },
  },
  {
    id: "ground-beef",
    name: "Ground beef",
    category: "Meat",
    unit: "lb",
    step: 0.5,
    prices: {
      marianos: { price: 5.99, packSize: 1, packageLabel: "per lb" },
      jewel: { price: 5.49, packSize: 1, packageLabel: "per lb" },
      costco: { price: 18.99, packSize: 4, packageLabel: "4 lb pack" },
    },
  },
  {
    id: "romaine",
    name: "Romaine hearts",
    category: "Produce",
    unit: "3-heart pack",
    step: 1,
    prices: {
      marianos: { price: 4.49, packSize: 1, packageLabel: "3 hearts" },
      jewel: { price: 3.99, packSize: 1, packageLabel: "3 hearts" },
      costco: { price: 5.99, packSize: 2, packageLabel: "6 hearts" },
    },
  },
  {
    id: "apples",
    name: "Honeycrisp apples",
    category: "Produce",
    unit: "lb",
    step: 1,
    prices: {
      marianos: { price: 2.99, packSize: 1, packageLabel: "per lb" },
      jewel: { price: 2.49, packSize: 1, packageLabel: "per lb" },
      costco: { price: 8.99, packSize: 4, packageLabel: "4 lb bag" },
    },
  },
  {
    id: "avocados",
    name: "Avocados",
    category: "Produce",
    unit: "each",
    step: 1,
    prices: {
      marianos: { price: 1.25, packSize: 1, packageLabel: "single" },
      jewel: { price: 0.99, packSize: 1, packageLabel: "single" },
      costco: { price: 5.99, packSize: 5, packageLabel: "5 count bag" },
    },
  },
  {
    id: "yogurt",
    name: "Greek yogurt",
    category: "Dairy",
    unit: "32 oz tub",
    step: 1,
    prices: {
      marianos: { price: 5.49, packSize: 1, packageLabel: "32 oz tub" },
      jewel: { price: 4.99, packSize: 1, packageLabel: "32 oz tub" },
      costco: { price: 8.99, packSize: 2, packageLabel: "2 tub pack" },
    },
  },
  {
    id: "rice",
    name: "Jasmine rice",
    category: "Pantry",
    unit: "lb",
    step: 1,
    prices: {
      marianos: { price: 3.99, packSize: 2, packageLabel: "2 lb bag" },
      jewel: { price: 3.49, packSize: 2, packageLabel: "2 lb bag" },
      costco: { price: 18.99, packSize: 25, packageLabel: "25 lb bag" },
    },
  },
  {
    id: "olive-oil",
    name: "Olive oil",
    category: "Pantry",
    unit: "liter",
    step: 1,
    prices: {
      marianos: { price: 11.99, packSize: 1, packageLabel: "1 liter" },
      jewel: { price: 10.99, packSize: 1, packageLabel: "1 liter" },
      costco: { price: 17.49, packSize: 2, packageLabel: "2 liter bottle" },
    },
  },
  {
    id: "cereal",
    name: "Cereal",
    category: "Pantry",
    unit: "box",
    step: 1,
    prices: {
      marianos: { price: 4.99, packSize: 1, packageLabel: "1 box" },
      jewel: { price: 3.99, packSize: 1, packageLabel: "1 box" },
      costco: { price: 7.89, packSize: 2, packageLabel: "2 box pack" },
    },
  },
  {
    id: "paper-towels",
    name: "Paper towels",
    category: "Household",
    unit: "roll",
    step: 1,
    prices: {
      marianos: { price: 2.35, packSize: 1, packageLabel: "single roll" },
      jewel: { price: 2.19, packSize: 1, packageLabel: "single roll" },
      costco: { price: 23.49, packSize: 12, packageLabel: "12 roll pack" },
    },
  },
];

const seedList: Record<string, number> = {
  bananas: 3,
  milk: 1,
  eggs: 1,
  chicken: 2,
  yogurt: 1,
  apples: 3,
  cereal: 2,
};

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `store-${Date.now()}`
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Not synced";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function quoteSourceLabel(quote?: PriceQuote) {
  if (!quote) {
    return "No price";
  }

  if (quote.source === "live") {
    return "Live";
  }

  if (quote.source === "manual") {
    return "Manual";
  }

  return "Estimate";
}

function quoteDealLabel(quote?: PriceQuote, storeId?: string) {
  if (!quote) {
    return null;
  }

  if (quote.dealType === "sale") {
    return "Sale";
  }

  if (quote.dealType === "coupon") {
    return "Coupon";
  }

  if (quote.dealType === "membership" || storeId === "costco") {
    return "Member";
  }

  return null;
}

function quoteNote(quote?: PriceQuote, store?: Store) {
  if (!quote) {
    return "No price entered yet.";
  }

  const pieces = [
    quote.sourceName ?? quoteSourceLabel(quote),
    quote.productName ? `Matched ${quote.productName}` : null,
    quote.fetchedAt ? `Synced ${formatDateTime(quote.fetchedAt)}` : null,
    quote.dealNote,
    store?.id === "costco" ? "Membership assumed." : null,
  ].filter(Boolean);

  return pieces.join(" ");
}

function PriceBadges({
  quote,
  store,
}: {
  quote?: PriceQuote;
  store?: Store;
}) {
  const source = quoteSourceLabel(quote);
  const deal = quoteDealLabel(quote, store?.id);

  return (
    <span className="price-badges" title={quoteNote(quote, store)}>
      <span className={`price-badge ${source.toLowerCase()}`}>{source}</span>
      {deal ? (
        <span className={`price-badge ${deal.toLowerCase()}`}>{deal}</span>
      ) : null}
    </span>
  );
}

function lineFor(
  item: CatalogItem,
  store: Store,
  quantity: number,
): LineChoice | null {
  const quote = item.prices[store.id];

  if (!quote || quote.price <= 0 || quote.packSize <= 0 || quantity <= 0) {
    return null;
  }

  const packages = Math.max(1, Math.ceil(quantity / quote.packSize - 1e-9));
  const unitsPurchased = packages * quote.packSize;

  return {
    item,
    quantity,
    store,
    quote,
    packages,
    unitsPurchased,
    cost: packages * quote.price,
  };
}

function pickBestLine(
  item: CatalogItem,
  stores: Store[],
  quantity: number,
): LineChoice | null {
  return stores.reduce<LineChoice | null>((best, store) => {
    const line = lineFor(item, store, quantity);

    if (!line) {
      return best;
    }

    return !best || line.cost < best.cost ? line : best;
  }, null);
}

function buildBestSplit(
  stores: Store[],
  items: CatalogItem[],
  shoppingList: Record<string, number>,
) {
  const pricedItems = items.filter((item) =>
    stores.some((store) => lineFor(item, store, shoppingList[item.id] ?? 0)),
  );
  const missingItems = items.filter(
    (item) =>
      !stores.some((store) => lineFor(item, store, shoppingList[item.id] ?? 0)),
  );

  if (pricedItems.length === 0 || stores.length === 0) {
    return {
      total: 0,
      subtotal: 0,
      tripCost: 0,
      usedStoreIds: new Set<string>(),
      groups: stores.map((store) => ({ store, lines: [] as LineChoice[] })),
      missingItems,
    };
  }

  let best:
    | {
        mask: number;
        subtotal: number;
        tripCost: number;
        total: number;
      }
    | null = null;

  const maxMasks = stores.length <= 12 ? 1 << stores.length : 0;

  if (maxMasks > 0) {
    for (let mask = 1; mask < maxMasks; mask += 1) {
      const subset = stores.filter((_, index) => mask & (1 << index));
      const tripCost = subset.reduce((sum, store) => sum + store.tripCost, 0);
      let subtotal = 0;
      let possible = true;

      for (const item of pricedItems) {
        const line = pickBestLine(item, subset, shoppingList[item.id] ?? 0);

        if (!line) {
          possible = false;
          break;
        }

        subtotal += line.cost;
      }

      if (possible) {
        const total = subtotal + tripCost;

        if (!best || total < best.total) {
          best = { mask, subtotal, tripCost, total };
        }
      }
    }
  }

  const chosenStores =
    best && maxMasks > 0
      ? stores.filter((_, index) => best && best.mask & (1 << index))
      : stores;
  const groups = stores.map((store) => ({
    store,
    lines: [] as LineChoice[],
  }));
  let subtotal = 0;

  for (const item of pricedItems) {
    const line = pickBestLine(item, chosenStores, shoppingList[item.id] ?? 0);

    if (line) {
      groups.find((group) => group.store.id === line.store.id)?.lines.push(line);
      subtotal += line.cost;
    }
  }

  const usedStoreIds = new Set(
    groups.filter((group) => group.lines.length > 0).map((group) => group.store.id),
  );
  const tripCost = stores
    .filter((store) => usedStoreIds.has(store.id))
    .reduce((sum, store) => sum + store.tripCost, 0);

  return {
    total: subtotal + tripCost,
    subtotal,
    tripCost,
    usedStoreIds,
    groups,
    missingItems,
  };
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>(seedStores);
  const [catalog, setCatalog] = useState<CatalogItem[]>(seedCatalog);
  const [shoppingList, setShoppingList] =
    useState<Record<string, number>>(seedList);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("split");
  const [storeName, setStoreName] = useState("");
  const [storeTripCost, setStoreTripCost] = useState("0");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemUnit, setCustomItemUnit] = useState("each");
  const [customItemCategory, setCustomItemCategory] = useState("Custom");
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [syncMessage, setSyncMessage] = useState(
    "Seed prices are active until a live source is configured.",
  );
  const [lastSync, setLastSync] = useState<string | undefined>();
  const [sourceStatus, setSourceStatus] = useState<Record<string, SourceStatus>>(
    {},
  );

  const selectedItems = useMemo(
    () =>
      catalog.filter((item) => {
        const quantity = shoppingList[item.id] ?? 0;
        return quantity > 0;
      }),
    [catalog, shoppingList],
  );

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return catalog;
    }

    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized),
    );
  }, [catalog, query]);

  const storeTotals = useMemo(
    () =>
      stores
        .map((store) => {
          const lines = selectedItems
            .map((item) => lineFor(item, store, shoppingList[item.id] ?? 0))
            .filter((line): line is LineChoice => Boolean(line));
          const subtotal = lines.reduce((sum, line) => sum + line.cost, 0);
          const missingCount = selectedItems.length - lines.length;

          return {
            store,
            lines,
            subtotal,
            missingCount,
            total: subtotal + store.tripCost,
          };
        })
        .sort((a, b) => {
          if (a.missingCount !== b.missingCount) {
            return a.missingCount - b.missingCount;
          }

          return a.total - b.total;
        }),
    [selectedItems, shoppingList, stores],
  );

  const singleStoreWinner = storeTotals.find((total) => total.missingCount === 0);
  const bestSplit = useMemo(
    () => buildBestSplit(stores, selectedItems, shoppingList),
    [stores, selectedItems, shoppingList],
  );

  const totalUnits = selectedItems.reduce(
    (sum, item) => sum + (shoppingList[item.id] ?? 0),
    0,
  );
  const storeSourceSummaries = stores.map((store) => {
    const status = sourceStatus[store.id];

    if (status) {
      return status;
    }

    if (store.id === "marianos") {
      return {
        storeId: store.id,
        status: "not_synced" as const,
        sourceName: "Kroger Product API",
        message: "Kroger credentials are checked when you click Sync.",
        checkedAt: lastSync ?? "",
      };
    }

    if (store.id === "costco") {
      return {
        storeId: store.id,
        status: "provider_needed" as const,
        sourceName: "Costco live provider",
        message: "Membership assumed; live member prices need an approved provider.",
        checkedAt: lastSync ?? "",
      };
    }

    if (store.id === "jewel") {
      return {
        storeId: store.id,
        status: "provider_needed" as const,
        sourceName: "Jewel-Osco live provider",
        message: "Sales and digital coupons need an approved data source.",
        checkedAt: lastSync ?? "",
      };
    }

    return {
      storeId: store.id,
      status: "provider_needed" as const,
      sourceName: "Custom provider",
      message: "Add a provider adapter before live prices can sync.",
      checkedAt: lastSync ?? "",
    };
  });

  function updateQuantity(item: CatalogItem, nextQuantity: number) {
    setShoppingList((current) => {
      const normalized = Math.max(0, Number(nextQuantity.toFixed(2)));
      const next = { ...current };

      if (normalized <= 0) {
        delete next[item.id];
      } else {
        next[item.id] = normalized;
      }

      return next;
    });
  }

  async function syncLivePrices() {
    setSyncState("loading");
    setSyncMessage("Checking live providers...");

    try {
      const response = await fetch("/api/live-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postalCode,
          stores: stores.map((store) => ({
            id: store.id,
            name: store.name,
          })),
          items: catalog.map((item) => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
            quantity: shoppingList[item.id] ?? item.step,
          })),
        }),
      });
      const payload = (await response.json()) as LivePriceResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Live price sync failed.");
      }

      setSourceStatus(payload.sourceStatus);
      setLastSync(payload.fetchedAt);
      setCatalog((current) =>
        current.map((item) => {
          const liveQuotes = payload.quotes[item.id];

          if (!liveQuotes) {
            return item;
          }

          const nextPrices = { ...item.prices };

          for (const [storeId, liveQuote] of Object.entries(liveQuotes)) {
            const existing = nextPrices[storeId];

            nextPrices[storeId] = {
              ...existing,
              price: liveQuote.price,
              packSize: existing?.packSize ?? 1,
              packageLabel:
                liveQuote.packageLabel ?? existing?.packageLabel ?? item.unit,
              regularPrice: liveQuote.regularPrice,
              promoPrice: liveQuote.promoPrice,
              dealType: liveQuote.dealType ?? "none",
              dealNote: liveQuote.dealNote,
              source: "live",
              sourceName: liveQuote.sourceName,
              fetchedAt: liveQuote.fetchedAt,
              productName: liveQuote.productName,
              confidence: liveQuote.confidence,
              note: liveQuote.dealNote,
            };
          }

          return {
            ...item,
            prices: nextPrices,
          };
        }),
      );

      const liveCount = Object.values(payload.quotes).reduce(
        (sum, storeQuotes) => sum + Object.keys(storeQuotes).length,
        0,
      );

      setSyncState("success");
      setSyncMessage(
        liveCount > 0
          ? `Applied ${liveCount} live quote${liveCount === 1 ? "" : "s"}.`
          : "No live quotes applied. Provider statuses are listed below.",
      );
    } catch (error) {
      setSyncState("error");
      setSyncMessage(
        error instanceof Error ? error.message : "Unable to sync live prices.",
      );
    }
  }

  function addItem(item: CatalogItem) {
    setShoppingList((current) => ({
      ...current,
      [item.id]: current[item.id] ?? item.step,
    }));
  }

  function addStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = storeName.trim();

    if (!name) {
      return;
    }

    const baseId = slugify(name);
    const id = stores.some((store) => store.id === baseId)
      ? `${baseId}-${stores.length + 1}`
      : baseId;
    const accent = storeColors[stores.length % storeColors.length];

    setStores((current) => [
      ...current,
      {
        id,
        name,
        format: "Custom store",
        accent,
        tripCost: Math.max(0, Number(storeTripCost) || 0),
        note: "Add prices in the price book",
      },
    ]);
    setStoreName("");
    setStoreTripCost("0");
  }

  function addCustomItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = customItemName.trim();

    if (!name) {
      return;
    }

    const baseId = slugify(name);
    const id = catalog.some((item) => item.id === baseId)
      ? `${baseId}-${catalog.length + 1}`
      : baseId;

    const item: CatalogItem = {
      id,
      name,
      category: customItemCategory.trim() || "Custom",
      unit: customItemUnit.trim() || "each",
      step: 1,
      prices: {},
    };

    setCatalog((current) => [...current, item]);
    setShoppingList((current) => ({ ...current, [id]: 1 }));
    setCustomItemName("");
  }

  function updateStoreTripCost(storeId: string, value: string) {
    const tripCost = Math.max(0, Number(value) || 0);

    setStores((current) =>
      current.map((store) =>
        store.id === storeId ? { ...store, tripCost } : store,
      ),
    );
  }

  function updateQuote(
    itemId: string,
    storeId: string,
    key: keyof PriceQuote,
    value: string,
  ) {
    setCatalog((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const existing = item.prices[storeId] ?? {
          price: 0,
          packSize: 1,
          packageLabel: "single",
        };
        const nextQuote: PriceQuote = {
          ...existing,
          [key]:
            key === "price" || key === "packSize"
              ? Math.max(0, Number(value) || 0)
              : value,
          source: "manual",
          sourceName: "Manual override",
          fetchedAt: undefined,
          dealType: "none",
          dealNote: "Edited in the price book.",
        };

        return {
          ...item,
          prices: {
            ...item.prices,
            [storeId]: nextQuote,
          },
        };
      }),
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Image
          src="/grocery-counter.svg"
          alt=""
          aria-hidden="true"
          className="header-art"
          fill
          priority
          sizes="100vw"
        />
        <div className="header-content">
          <p className="eyebrow">Grocery price planner</p>
          <h1>Build the list. Let the stores compete.</h1>
          <div className="header-metrics" aria-label="Current list summary">
            <span>
              <strong>{selectedItems.length}</strong>
              items
            </span>
            <span>
              <strong>{formatNumber(totalUnits)}</strong>
              units
            </span>
            <span>
              <strong>{currency.format(bestSplit.total)}</strong>
              split total
            </span>
          </div>
        </div>
      </header>

      <section className="live-panel" aria-label="Live pricing">
        <div className="live-panel-top">
          <div>
            <p className="eyebrow">Live pricing</p>
            <h2>Prices, sales, coupons</h2>
          </div>
          <div className="live-controls">
            <label className="zip-input">
              <span>ZIP</span>
              <input
                aria-label="Pricing ZIP code"
                value={postalCode}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) => setPostalCode(event.target.value)}
              />
            </label>
            <button
              className="text-button live-sync-button"
              type="button"
              disabled={syncState === "loading"}
              onClick={syncLivePrices}
            >
              {syncState === "loading" ? "Syncing" : "Sync"}
            </button>
          </div>
        </div>
        <div className="live-status-row">
          <span className={`sync-message ${syncState}`}>{syncMessage}</span>
          <span>Last sync: {formatDateTime(lastSync)}</span>
        </div>
        <div className="provider-grid">
          {storeSourceSummaries.map((status) => {
            const store = stores.find((candidate) => candidate.id === status.storeId);

            return (
              <article className="provider-card" key={status.storeId}>
                <div>
                  <strong>{store?.name ?? status.storeId}</strong>
                  <span>{status.sourceName}</span>
                </div>
                <span className={`provider-status ${status.status}`}>
                  {status.status.split("_").join(" ")}
                </span>
                <p>{status.message}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="store-strip" aria-label="Store totals">
        {storeTotals.map(({ store, total, missingCount, subtotal }) => {
          const isWinner = singleStoreWinner?.store.id === store.id;

          return (
            <article
              className={`store-card ${isWinner ? "winner" : ""}`}
              key={store.id}
              style={{ borderTopColor: store.accent }}
            >
              <div>
                <div className="card-title-row">
                  <h2>{store.name}</h2>
                  {isWinner ? <span className="winner-pill">Best one</span> : null}
                </div>
                <p>{store.format}</p>
              </div>
              <div className="store-total">
                <strong>{currency.format(total)}</strong>
                <span>
                  {missingCount === 0
                    ? `${currency.format(subtotal)} items`
                    : `${missingCount} missing`}
                </span>
              </div>
              <label className="trip-input">
                <span>Trip cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={store.tripCost}
                  onChange={(event) =>
                    updateStoreTripCost(store.id, event.target.value)
                  }
                />
              </label>
              <small>{store.note}</small>
            </article>
          );
        })}
      </section>

      <div className="planner-grid">
        <section className="tool-panel list-panel" aria-labelledby="list-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Shopping list</p>
              <h2 id="list-heading">Items</h2>
            </div>
            <span className="count-pill">{selectedItems.length}</span>
          </div>

          <div className="search-row">
            <input
              aria-label="Search catalog"
              type="search"
              placeholder="Search groceries"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="catalog-list" aria-label="Catalog">
            {filteredCatalog.map((item) => {
              const bestLine = pickBestLine(
                item,
                stores,
                shoppingList[item.id] ?? item.step,
              );
              const isSelected = (shoppingList[item.id] ?? 0) > 0;

              return (
                <article className="catalog-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.category}
                      {bestLine
                        ? `, best at ${bestLine.store.name}`
                        : ", no price yet"}
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    title={isSelected ? "Already on list" : "Add item"}
                    aria-label={isSelected ? "Already on list" : `Add ${item.name}`}
                    disabled={isSelected}
                    onClick={() => addItem(item)}
                  >
                    +
                  </button>
                </article>
              );
            })}
          </div>

          <form className="inline-form custom-item-form" onSubmit={addCustomItem}>
            <input
              aria-label="Custom item name"
              placeholder="Custom item"
              value={customItemName}
              onChange={(event) => setCustomItemName(event.target.value)}
            />
            <input
              aria-label="Custom item unit"
              placeholder="Unit"
              value={customItemUnit}
              onChange={(event) => setCustomItemUnit(event.target.value)}
            />
            <input
              aria-label="Custom item category"
              placeholder="Category"
              value={customItemCategory}
              onChange={(event) => setCustomItemCategory(event.target.value)}
            />
            <button type="submit" title="Add custom item" aria-label="Add custom item">
              +
            </button>
          </form>
        </section>

        <section
          className="tool-panel selected-panel"
          aria-labelledby="selected-heading"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Current run</p>
              <h2 id="selected-heading">Quantities</h2>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => setShoppingList({})}
            >
              Clear
            </button>
          </div>

          <div className="selected-list">
            {selectedItems.length === 0 ? (
              <p className="empty-state">Add groceries to compare totals.</p>
            ) : null}

            {selectedItems.map((item) => {
              const quantity = shoppingList[item.id] ?? 0;
              const bestLine = pickBestLine(item, stores, quantity);

              return (
                <article className="selected-row" key={item.id}>
                  <div className="selected-copy">
                    <strong>{item.name}</strong>
                    <span>
                      {bestLine
                        ? `${bestLine.store.name}, ${currency.format(bestLine.cost)}`
                        : "No active price"}
                    </span>
                    {bestLine ? (
                      <PriceBadges quote={bestLine.quote} store={bestLine.store} />
                    ) : null}
                  </div>
                  <div className="quantity-control">
                    <button
                      type="button"
                      title="Decrease"
                      aria-label={`Decrease ${item.name}`}
                      onClick={() => updateQuantity(item, quantity - item.step)}
                    >
                      -
                    </button>
                    <input
                      aria-label={`${item.name} quantity`}
                      type="number"
                      min="0"
                      step={item.step}
                      value={quantity}
                      onChange={(event) =>
                        updateQuantity(item, Number(event.target.value) || 0)
                      }
                    />
                    <button
                      type="button"
                      title="Increase"
                      aria-label={`Increase ${item.name}`}
                      onClick={() => updateQuantity(item, quantity + item.step)}
                    >
                      +
                    </button>
                  </div>
                  <span className="unit-label">{item.unit}</span>
                  <button
                    className="icon-button danger"
                    type="button"
                    title="Remove"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => updateQuantity(item, 0)}
                  >
                    x
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="tool-panel results-panel"
          aria-labelledby="results-heading"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Optimizer</p>
              <h2 id="results-heading">Best value</h2>
            </div>
            <div className="segmented" role="tablist" aria-label="Optimizer views">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "split"}
                className={activeTab === "split" ? "active" : ""}
                onClick={() => setActiveTab("split")}
              >
                Split
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "single"}
                className={activeTab === "single" ? "active" : ""}
                onClick={() => setActiveTab("single")}
              >
                One store
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "prices"}
                className={activeTab === "prices" ? "active" : ""}
                onClick={() => setActiveTab("prices")}
              >
                Prices
              </button>
            </div>
          </div>

          {activeTab === "split" ? (
            <div className="tab-body">
              <div className="result-summary">
                <div>
                  <span>Best split total</span>
                  <strong>{currency.format(bestSplit.total)}</strong>
                </div>
                <div>
                  <span>Stores used</span>
                  <strong>{bestSplit.usedStoreIds.size}</strong>
                </div>
                <div>
                  <span>Trip costs</span>
                  <strong>{currency.format(bestSplit.tripCost)}</strong>
                </div>
              </div>

              <div className="store-groups">
                {bestSplit.groups
                  .filter((group) => group.lines.length > 0)
                  .map((group) => (
                    <article className="group-card" key={group.store.id}>
                      <div className="group-heading">
                        <h3 style={{ color: group.store.accent }}>
                          {group.store.name}
                        </h3>
                        <span>
                          {currency.format(
                            group.lines.reduce((sum, line) => sum + line.cost, 0) +
                              group.store.tripCost,
                          )}
                        </span>
                      </div>
                      <ul>
                        {group.lines.map((line) => (
                          <li key={line.item.id}>
                            <div>
                              <strong>{line.item.name}</strong>
                              <span>
                                Need {formatNumber(line.quantity)} {line.item.unit}
                              </span>
                            </div>
                            <div>
                              <span>{line.packages} x {line.quote.packageLabel}</span>
                              <PriceBadges quote={line.quote} store={line.store} />
                              <strong>{currency.format(line.cost)}</strong>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
              </div>

              {bestSplit.missingItems.length > 0 ? (
                <div className="missing-box">
                  <strong>Missing prices</strong>
                  <span>
                    {bestSplit.missingItems.map((item) => item.name).join(", ")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "single" ? (
            <div className="tab-body">
              <div className="result-summary single-winner">
                <div>
                  <span>Best one-store run</span>
                  <strong>
                    {singleStoreWinner
                      ? singleStoreWinner.store.name
                      : "No complete store"}
                  </strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>
                    {singleStoreWinner
                      ? currency.format(singleStoreWinner.total)
                      : currency.format(0)}
                  </strong>
                </div>
              </div>

              <div className="ranked-list">
                {storeTotals.map((total, index) => (
                  <article className="rank-row" key={total.store.id}>
                    <span className="rank-number">{index + 1}</span>
                    <div>
                      <strong>{total.store.name}</strong>
                      <span>
                        {total.missingCount === 0
                          ? "Complete list"
                          : `${total.missingCount} unavailable`}
                      </span>
                    </div>
                    <strong>{currency.format(total.total)}</strong>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "prices" ? (
            <div className="tab-body">
              <form className="inline-form store-form" onSubmit={addStore}>
                <input
                  aria-label="Store name"
                  placeholder="New store"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                />
                <input
                  aria-label="Trip cost"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Trip cost"
                  value={storeTripCost}
                  onChange={(event) => setStoreTripCost(event.target.value)}
                />
                <button type="submit" title="Add store" aria-label="Add store">
                  +
                </button>
              </form>

              <div className="price-table-wrap">
                <table className="price-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      {stores.map((store) => (
                        <th key={store.id}>{store.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((item) => (
                      <tr key={item.id}>
                        <th>
                          <strong>{item.name}</strong>
                          <span>{item.unit}</span>
                        </th>
                        {stores.map((store) => {
                          const quote = item.prices[store.id];

                          return (
                            <td key={store.id}>
                              <label>
                                <span>Price</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={quote?.price ?? ""}
                                  onChange={(event) =>
                                    updateQuote(
                                      item.id,
                                      store.id,
                                      "price",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label>
                                <span>Pack</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={quote?.packSize ?? ""}
                                  onChange={(event) =>
                                    updateQuote(
                                      item.id,
                                      store.id,
                                      "packSize",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <input
                                aria-label={`${store.name} package label for ${item.name}`}
                                placeholder="Label"
                                value={quote?.packageLabel ?? ""}
                                onChange={(event) =>
                                  updateQuote(
                                    item.id,
                                    store.id,
                                    "packageLabel",
                                    event.target.value,
                                  )
                                }
                              />
                              <PriceBadges quote={quote} store={store} />
                              {quote?.regularPrice &&
                              quote.promoPrice &&
                              quote.promoPrice < quote.regularPrice ? (
                                <small className="regular-price">
                                  Regular {currency.format(quote.regularPrice)}
                                </small>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
