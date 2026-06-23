import { env as workerEnv } from "cloudflare:workers";

type LivePriceItem = {
  id: string;
  name: string;
  unit: string;
  quantity?: number;
};

type LivePriceStore = {
  id: string;
  name: string;
};

type LivePriceRequest = {
  postalCode?: string;
  items?: LivePriceItem[];
  stores?: LivePriceStore[];
};

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

type KrogerTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type KrogerProductResponse = {
  data?: Array<{
    description?: string;
    brand?: string;
    upc?: string;
    items?: Array<{
      size?: string;
      price?: {
        regular?: number | string;
        promo?: number | string;
      };
    }>;
  }>;
};

const providerNames: Record<string, string> = {
  marianos: "Kroger Product API",
  jewel: "Jewel-Osco live provider",
  costco: "Costco live provider",
};

function getEnv(name: string) {
  const processValue =
    typeof process !== "undefined" ? process.env[name] : undefined;

  if (processValue) {
    return processValue;
  }

  const value = (workerEnv as unknown as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}

function encodeBasicAuth(clientId: string, clientSecret: string) {
  const input = `${clientId}:${clientSecret}`;

  if (typeof Buffer !== "undefined") {
    return Buffer.from(input).toString("base64");
  }

  return btoa(input);
}

function asPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function getKrogerToken() {
  const clientId = getEnv("KROGER_CLIENT_ID");
  const clientSecret = getEnv("KROGER_CLIENT_SECRET");
  const scope = getEnv("KROGER_SCOPE") ?? "product.compact";

  if (!clientId || !clientSecret) {
    return null;
  }

  const response = await fetch("https://api.kroger.com/v1/connect/oauth2/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Kroger rejected the configured client ID/secret (401). Check that the credential values are exact and the Kroger app is active for the Product API.",
      );
    }

    throw new Error(
      `Kroger token request failed with ${response.status} ${response.statusText}`.trim(),
    );
  }

  const payload = (await response.json()) as KrogerTokenResponse;

  if (!payload.access_token) {
    throw new Error("Kroger token response did not include an access token");
  }

  return payload.access_token;
}

async function fetchKrogerQuote(
  item: LivePriceItem,
  accessToken: string,
  locationId: string,
  fetchedAt: string,
): Promise<LiveQuote | null> {
  const url = new URL("https://api.kroger.com/v1/products");
  url.searchParams.set("filter.term", item.name);
  url.searchParams.set("filter.locationId", locationId);
  url.searchParams.set("filter.limit", "5");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Kroger product search failed with ${response.status}`);
  }

  const payload = (await response.json()) as KrogerProductResponse;

  for (const product of payload.data ?? []) {
    const pricedItem = product.items?.find((candidate) => {
      const regular = asPrice(candidate.price?.regular);
      const promo = asPrice(candidate.price?.promo);
      return regular !== null || promo !== null;
    });

    if (!pricedItem) {
      continue;
    }

    const regularPrice = asPrice(pricedItem.price?.regular);
    const promoPrice = asPrice(pricedItem.price?.promo);
    const hasPromo =
      promoPrice !== null &&
      (regularPrice === null || promoPrice < regularPrice);
    const price = hasPromo ? promoPrice : regularPrice;

    if (price === null) {
      continue;
    }

    return {
      itemId: item.id,
      storeId: "marianos",
      price,
      packageLabel: pricedItem.size ?? item.unit,
      regularPrice: regularPrice ?? undefined,
      promoPrice: promoPrice ?? undefined,
      dealType: hasPromo ? "sale" : "none",
      dealNote: hasPromo
        ? "Promo/sale price returned by Kroger for the configured Mariano's location."
        : "No promo price returned. Personalized digital coupons are not applied unless the provider returns them.",
      source: "live",
      sourceName: providerNames.marianos,
      fetchedAt,
      productName: product.description,
      confidence: "matched",
    };
  }

  return null;
}

function missingConfigStatus(checkedAt: string): SourceStatus {
  return {
    storeId: "marianos",
    status: "needs_config",
    sourceName: providerNames.marianos,
    message:
      "Add KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, and KROGER_LOCATION_ID to enable live Mariano's prices.",
    checkedAt,
  };
}

function providerNeededStatus(
  storeId: "jewel" | "costco",
  checkedAt: string,
): SourceStatus {
  const isCostco = storeId === "costco";

  return {
    storeId,
    status: "provider_needed",
    sourceName: providerNames[storeId],
    message: isCostco
      ? "Costco pricing is membership-dependent. A licensed data provider or approved account integration is needed before live member prices and warehouse coupons can be imported."
      : "Jewel-Osco sale and digital coupon prices need an approved Albertsons/Jewel data source before they can be imported.",
    checkedAt,
  };
}

export async function POST(request: Request) {
  const fetchedAt = new Date().toISOString();

  try {
    const payload = (await request.json()) as LivePriceRequest;
    const items = payload.items ?? [];
    const storeIds = new Set((payload.stores ?? []).map((store) => store.id));
    const sourceStatus: Record<string, SourceStatus> = {};
    const quotes: Record<string, Record<string, LiveQuote>> = {};

    if (storeIds.has("marianos")) {
      const locationId = getEnv("KROGER_LOCATION_ID");

      if (!locationId) {
        sourceStatus.marianos = missingConfigStatus(fetchedAt);
      } else {
        try {
          const token = await getKrogerToken();

          if (!token) {
            sourceStatus.marianos = missingConfigStatus(fetchedAt);
          } else {
            let matched = 0;

            for (const item of items) {
              const quote = await fetchKrogerQuote(
                item,
                token,
                locationId,
                fetchedAt,
              );

              if (quote) {
                quotes[item.id] = {
                  ...(quotes[item.id] ?? {}),
                  marianos: quote,
                };
                matched += 1;
              }
            }

            sourceStatus.marianos = {
              storeId: "marianos",
              status: "live",
              sourceName: providerNames.marianos,
              message:
                matched === items.length
                  ? "Live prices synced for every requested item."
                  : `Live prices synced for ${matched} of ${items.length} requested items.`,
              checkedAt: fetchedAt,
            };
          }
        } catch (error) {
          sourceStatus.marianos = {
            storeId: "marianos",
            status: "error",
            sourceName: providerNames.marianos,
            message:
              error instanceof Error
                ? error.message
                : "Unable to sync Kroger prices.",
            checkedAt: fetchedAt,
          };
        }
      }
    }

    if (storeIds.has("jewel")) {
      sourceStatus.jewel = providerNeededStatus("jewel", fetchedAt);
    }

    if (storeIds.has("costco")) {
      sourceStatus.costco = providerNeededStatus("costco", fetchedAt);
    }

    return Response.json({
      fetchedAt,
      quotes,
      sourceStatus,
      assumptions: [
        "Membership is assumed for stores that require it.",
        "Sales and coupons are noted when a connected provider returns them.",
        "Seed or manual prices remain in place when a live provider is unavailable.",
      ],
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to sync live prices.",
      },
      { status: 500 },
    );
  }
}
