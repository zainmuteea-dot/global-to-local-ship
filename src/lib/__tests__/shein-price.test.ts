// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as calculatorRoute } from "../../routes/api/public/shein-price";
import { Route as priceRoute } from "../../routes/api/shein-price";

type Handler = (input: { request: Request }) => Promise<Response>;
const calculate = (calculatorRoute.options.server?.handlers as { POST: Handler }).POST;
const getPrice = (priceRoute.options.server?.handlers as { GET: Handler }).GET;

async function post(body: unknown) {
  return calculate({
    request: new Request("https://example.com/api/public/shein-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("SHEIN price calculator", () => {
  it("applies the default 10 percent commission", async () => {
    const response = await post({ originalPrice: 100 });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ finalPrice: 110, commissionPercent: 10 });
  });
  it("preserves explicit zero commission", async () => {
    const response = await post({ originalPrice: 100, commissionPercent: 0 });
    expect((await response.json()).data.finalPrice).toBe(100);
  });
  it("converts the price before commission and shipping", async () => {
    const response = await post({ originalPrice: 100, exchangeRate: 2, shippingCost: 5 });
    expect((await response.json()).data.finalPrice).toBe(225);
  });
  it.each([
    {},
    null,
    { originalPrice: -1 },
    { originalPrice: 100, commissionPercent: null },
    { originalPrice: 100, exchangeRate: 0 },
    { originalPrice: 100, shippingCost: -2 },
    { originalPrice: 100, currency: "invalid" },
  ])("rejects invalid input %j", async (body) => {
    expect((await post(body)).status).toBe(400);
  });
});

const html =
  '<script type="application/ld+json">{"@type":"Product","name":"Test product","offers":{"price":10,"priceCurrency":"USD"}}</script>';
const request = () => ({
  request: new Request(
    "https://example.com/api/shein-price?url=https%3A%2F%2Fwww.shein.com%2Fproduct-p-123.html&currency=SAR",
  ),
});

describe("SHEIN currency conversion", () => {
  it("returns the converted amount with the target currency", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(html))
        .mockResolvedValueOnce(Response.json({ rates: { SAR: 3.75 } })),
    );
    expect(await (await getPrice(request())).json()).toMatchObject({
      price: 37.5,
      currency: "SAR",
    });
  });
  it("keeps both the original amount and currency if conversion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(html))
        .mockResolvedValueOnce(new Response("unavailable", { status: 503 })),
    );
    expect(await (await getPrice(request())).json()).toMatchObject({ price: 10, currency: "USD" });
  });
  it("rejects URLs outside SHEIN without fetching them", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await getPrice({
      request: new Request("https://example.com/api/shein-price?url=https://example.org/"),
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
