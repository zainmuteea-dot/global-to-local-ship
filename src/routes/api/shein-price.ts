import { createFileRoute } from "@tanstack/react-router";

interface SheinResult {
  price: number;
  currency: string;
  title?: string | undefined;
}

const UA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
};

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

async function fetchHtml(url: string): Promise<string> {
  const timeout = withTimeout(12_000);

  try {
    const response = await fetch(url, {
      headers: UA_HEADERS,
      signal: timeout.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`upstream-${response.status}`);
    }

    return await response.text();
  } finally {
    timeout.done();
  }
}

function extract(html: string): SheinResult | null {
  // 1) JSON-LD
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html))) {
    try {
      const raw = JSON.parse(match[1] || "{}");
      const items = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        const graph = item["@graph"] ? item["@graph"] : [item];
        const graphItems = Array.isArray(graph) ? graph : [graph];

        for (const graphItem of graphItems) {
          const type = graphItem["@type"];

          if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
            const offers = graphItem.offers || {};
            const offer = Array.isArray(offers) ? offers[0] : offers;
            const price = Number(offer?.price ?? offer?.lowPrice);

            if (!Number.isNaN(price) && price > 0) {
              return {
                price,
                currency: String(offer?.priceCurrency || "USD"),
                title: graphItem.name ? String(graphItem.name) : undefined,
              };
            }
          }
        }
      }
    } catch {
      // تابع البحث في بقية البيانات.
    }
  }

  // 2) بيانات السعر المضمّنة في الصفحة
  const stateRegex =
    /(?:__PRELOADED_STATE__|window\.__goods_detail__|"detailPrice"|"salePrice")([\s\S]{0,4000})/;
  const stateMatch = stateRegex.exec(html);

  if (stateMatch) {
    const priceRegex = /"(?:salePrice|retailPrice|detailPrice|price)"\s*:\s*"?([\d.]+)"?/;
    const priceMatch = priceRegex.exec((stateMatch[0] || "") + html.slice(0, 20_000));

    const currencyRegex = /"currency"\s*:\s*"([A-Z]{3})"/;
    const currencyMatch = currencyRegex.exec(html.slice(0, 50_000));

    if (priceMatch) {
      const price = Number(priceMatch[1] || "0");

      if (!Number.isNaN(price) && price > 0) {
        return {
          price,
          currency: currencyMatch?.[1] || "USD",
        };
      }
    }
  }

  // 3) وسوم السعر الوصفية
  const metaPrice =
    /<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([\d.]+)["']/i.exec(
      html,
    );
  const metaCurrency =
    /<meta[^>]*property=["'](?:product:price:currency|og:price:currency)["'][^>]*content=["']([A-Z]{3})["']/i.exec(
      html,
    );

  if (metaPrice) {
    const price = Number(metaPrice[1] || "0");

    if (!Number.isNaN(price) && price > 0) {
      return {
        price,
        currency: metaCurrency?.[1] || "USD",
      };
    }
  }

  return null;
}

export const Route = createFileRoute("/api/shein-price")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const target = requestUrl.searchParams.get("url") || "";
        const currency = (requestUrl.searchParams.get("currency") || "USD").toUpperCase();

        if (!/^https?:\/\/([a-z0-9-]+\.)?shein\.com\//i.test(target)) {
          return Response.json({ error: "invalid-url" }, { status: 400 });
        }

        try {
          const html = await fetchHtml(target);
          const found = extract(html);

          if (!found) {
            return Response.json({ error: "notfound" }, { status: 404 });
          }

          let price = found.price;
          let resultCurrency = found.currency;

          if (currency !== found.currency) {
            try {
              const timeout = withTimeout(8_000);

              try {
                const response = await fetch(
                  `https://open.er-api.com/v6/latest/${encodeURIComponent(found.currency)}`,
                  { signal: timeout.signal },
                );
                if (!response.ok) throw new Error("exchange-rate-unavailable");
                const data = await response.json();
                const rate = Number(data?.rates?.[currency]);
                if (Number.isFinite(rate) && rate > 0) {
                  price = Math.round(price * rate * 100) / 100;
                  resultCurrency = currency;
                }
              } finally {
                timeout.done();
              }
            } catch {
              // عند تعذر تحويل العملة، أعد السعر الأصلي كما كان.
            }
          }

          return Response.json({
            price,
            currency: resultCurrency,
            title: found.title,
          });
        } catch (error) {
          const message = String((error as { message?: string })?.message || "");

          if (message.includes("abort")) {
            return Response.json({ error: "timeout" }, { status: 504 });
          }

          if (message.startsWith("upstream-")) {
            return Response.json({ error: "upstream" }, { status: 502 });
          }

          return Response.json({ error: "server" }, { status: 500 });
        }
      },
    },
  },
});
