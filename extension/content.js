// زر «أضف للسوق الشامل» داخل صفحات منتجات SHEIN وNoon وAmazon.
(() => {
  const DEFAULT_SITE = "https://global-to-local-ship.lovable.app";
  const BTN_ID = "alshamel-add-btn";
  const host = location.hostname;
  const store = /shein\./.test(host) ? "shein" : /noon\.com$/.test(host) ? "noon" : /amazon\./.test(host) ? "amazon" : null;
  if (!store) return;

  const isProductPage = () => {
    const p = location.pathname;
    if (store === "amazon") return /\/(dp|gp\/product|gp\/aw\/d)\//i.test(p);
    if (store === "noon") return /\/p\/?$|\/p\//i.test(p) || !!document.querySelector('[data-qa="pdp-name"]');
    if (store === "shein") return /-p-\d+/i.test(p) || !!document.querySelector(".product-intro__head-name");
    return false;
  };

  const text = (sel) => {
    const el = document.querySelector(sel);
    return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";
  };
  const meta = (name) => {
    const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`);
    return el ? (el.getAttribute("content") || "").trim() : "";
  };

  // بيانات المنتج المنظمة (JSON-LD) إن وجدت.
  const jsonLdProduct = () => {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(s.textContent || "null");
        const list = Array.isArray(data) ? data : data && data["@graph"] ? data["@graph"] : [data];
        for (const node of list) {
          const t = node && node["@type"];
          if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) return node;
        }
      } catch (_) { /* تجاهل */ }
    }
    return null;
  };

  const parsePrice = (raw) => {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/٫/g, ".");
    const m = s.replace(/,(?=\d{3}\b)/g, "").match(/\d+(?:[.,]\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0].replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const guessCurrency = (raw) => {
    const s = String(raw || "");
    if (/SAR|ر\.?\s?س|﷼|ريال/i.test(s)) return "SAR";
    if (/USD|US\$|\$/.test(s)) return "USD";
    if (/AED|د\.?\s?إ|درهم/i.test(s)) return "AED";
    if (/EGP|ج\.?\s?م/i.test(s)) return "EGP";
    if (/TRY|TL|₺/.test(s)) return "TRY";
    if (/GBP|£/.test(s)) return "GBP";
    if (/EUR|€/.test(s)) return "EUR";
    return "";
  };

  const currencyFromHost = () => {
    if (/amazon\.sa$/.test(host) || /noon\.com$/.test(host) && /saudi/.test(location.pathname)) return "SAR";
    if (/amazon\.com$/.test(host)) return "USD";
    if (/amazon\.ae$/.test(host) || /noon\.com$/.test(host) && /uae/.test(location.pathname)) return "AED";
    if (/amazon\.eg$/.test(host) || /noon\.com$/.test(host) && /egypt/.test(location.pathname)) return "EGP";
    return "";
  };

  const extract = () => {
    const ld = jsonLdProduct();
    const offer = ld && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
    let title = "", image = "", priceText = "", currency = "";

    if (store === "amazon") {
      title = text("#productTitle");
      const img = document.querySelector("#landingImage, #imgBlkFront, #main-image");
      image = img ? img.getAttribute("data-old-hires") || img.getAttribute("src") || "" : "";
      priceText =
        text("#corePriceDisplay_desktop_feature_div .a-price .a-offscreen") ||
        text("#corePrice_feature_div .a-price .a-offscreen") ||
        text("#apex_desktop .a-price .a-offscreen") ||
        text(".a-price .a-offscreen");
    } else if (store === "noon") {
      title = text('[data-qa="pdp-name"]') || text("h1");
      priceText = text('[data-qa="div-price-now"]') || text(".priceNow") || text('[class*="priceNow"]');
    } else if (store === "shein") {
      title = text(".product-intro__head-name") || text("h1");
      priceText =
        text(".product-intro__head-mainprice .from") ||
        text(".product-intro__head-mainprice .original") ||
        text(".product-intro__head-mainprice") ||
        text('[class*="productPrice"]');
      const img = document.querySelector(".crop-image-container img, .product-intro__main img");
      image = img ? img.getAttribute("src") || img.getAttribute("data-src") || "" : "";
    }

    title = title || (ld && ld.name) || meta("og:title") || document.title;
    if (!image) {
      const ldImg = ld && (Array.isArray(ld.image) ? ld.image[0] : ld.image);
      image = (typeof ldImg === "string" ? ldImg : ldImg && ldImg.url) || meta("og:image") || "";
    }
    if (image.startsWith("//")) image = "https:" + image;

    let price = parsePrice(priceText);
    currency = guessCurrency(priceText);
    if (price === null && offer) {
      price = parsePrice(offer.price || offer.lowPrice);
      currency = currency || offer.priceCurrency || "";
    }
    if (price === null) {
      price = parsePrice(meta("product:price:amount") || meta("og:price:amount") || meta("price"));
      currency = currency || meta("product:price:currency") || meta("og:price:currency") || meta("priceCurrency");
    }
    currency = currency || currencyFromHost();

    const canonical = document.querySelector('link[rel="canonical"]');
    let url = (canonical && canonical.href) || location.href;
    if (!url.startsWith("https://")) url = location.href;

    return { url, title: String(title).slice(0, 300), image, price, currency };
  };

  const getSite = () =>
    new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ siteUrl: DEFAULT_SITE }, (v) => resolve((v && v.siteUrl) || DEFAULT_SITE));
      } catch (_) {
        resolve(DEFAULT_SITE);
      }
    });

  const onClick = async (btn) => {
    const p = extract();
    const site = String(await getSite()).replace(/\/+$/, "");
    const q = new URLSearchParams({ add: "1", url: p.url, title: p.title, image: p.image || "" });
    if (p.price !== null) q.set("price", String(p.price));
    if (p.currency) q.set("currency", p.currency);
    window.open(`${site}/cart?${q.toString()}`, "_blank", "noopener");
    btn.dataset.state = "done";
    btn.querySelector(".alshamel-label").textContent = "تمت الإضافة ✓";
    setTimeout(() => {
      btn.dataset.state = "";
      btn.querySelector(".alshamel-label").textContent = "أضف للسوق الشامل";
    }, 3000);
  };

  const ensureButton = () => {
    const existing = document.getElementById(BTN_ID);
    if (!isProductPage()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.innerHTML = '<span class="alshamel-logo">ش</span><span class="alshamel-label">أضف للسوق الشامل</span>';
    btn.addEventListener("click", () => onClick(btn));
    document.body.appendChild(btn);
  };

  ensureButton();
  // متاجر مثل Noon وSHEIN تغيّر الصفحة بدون إعادة تحميل.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) lastUrl = location.href;
    ensureButton();
  }, 1200);
})();
