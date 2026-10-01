// api/shein-price.ts
export const config = { runtime: "edge" };

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
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function fetchHtml(url: string): Promise<string> {
  const { signal, done } = withTimeout(12000);
  try {
    const res = await fetch(url, { headers: UA_HEADERS, signal, redirect: "follow" });
    if (!res.ok) throw new Error(`upstream-${res.status}`);
    return await res.text();
  } finally {
    done();
  }
}

function extract(html: string): SheinResult | null {
  // 1) JSON-LD
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html))) {
    try {
      const raw = JSON.parse(m[1] || "{}");
      const items = Array.isArray(raw)? raw : [raw];
      for (const it of items) {
        const graph = it["@graph"]? it["@graph"] : [it];
        for (const g of (Array.isArray(graph)? graph : [graph])) {
          const type = g["@type"];
          if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
            const offers = g.offers || {};
            const o = Array.isArray(offers)? offers[0] : offers;
            const p = Number(o?.price?? o?.lowPrice);
            if (!Number.isNaN(p) && p > 0) {
              return { price: p, currency: String(o?.priceCurrency || "USD"), title: g.name? String(g.name) : undefined };
            }
          }
        }
      }
    } catch { /* continue */ }
  }

  // 2) window.__PRELOADED_STATE__ / goods detail
  const stateRe = /(?:__PRELOADED_STATE__|window\.__goods_detail__|\"detailPrice\"|\"salePrice\")([\s\S]{0,4000})/;
  const sm = stateRe.exec(html);
  if (sm) {
    const priceRe = /"(?:salePrice|retailPrice|detailPrice|price)"\s*:\s*"?([\d.]+)"?/;
    const pm = priceRe.exec((sm[0] || "") + html.slice(0, 20000));
    const curRe = /"currency"\s*:\s*"([A-Z]{3})"/;
    const cm = curRe.exec(html.slice(0, 50000));
    if (pm) {
      const p = Number(pm[1] || "0");
      if (!Number.isNaN(p) && p > 0)
        return { price: p, currency: cm?.[1] || "USD" };
    }
  }

  // 3) meta tags
  const metaPrice = /<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([\d.]+)["']/i.exec(html);
  const metaCur = /<meta[^>]*property=["'](?:product:price:currency|og:price:currency)["'][^>]*content=["']([A-Z]{3})["']/i.exec(html);
  if (metaPrice) {
    const p = Number(metaPrice[1] || "0");
    if (!Number.isNaN(p) && p > 0)
      return { price: p, currency: metaCur?.[1] || "USD" };
  }

  return null;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = url.searchParams.get("url") || "";
  const currency = (url.searchParams.get("currency") || "USD").toUpperCase();

  if (!/^https?:\/\/([a-z0-9-]+\.)?shein\.com\//i.test(target)) {
    return Response.json({ error: "invalid-url" }, { status: 400 });
  }

  try {
    const html = await fetchHtml(target);
    const found = extract(html);
    if (!found) return Response.json({ error: "notfound" }, { status: 404 });

    let price = found.price;
    if (currency!== found.currency) {
      try {
        const { signal, done } = withTimeout(8000);
        const fx = await fetch(
          `https://open.er-api.com/v6/latest/${found.currency}`,
          { signal }
        );
        const data = await fx.json();
        done();
        const rate = data?.rates?.[currency];
        if (rate) price = Math.round(price * Number(rate) * 100) / 100;
      } catch { /* keep original */ }
    }

    return Response.json({
      price,
      currency: found.currency === currency? currency : found.currency,
      title: found.title,
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("abort")) return Response.json({ error: "timeout" }, { status: 504 });
    if (msg.startsWith("upstream-")) return Response.json({ error: "upstream" }, { status: 502 });
    return Response.json({ error: "server" }, { status: 500 });
  }
}
