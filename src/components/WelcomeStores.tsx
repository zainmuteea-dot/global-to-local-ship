import { useState, type FormEvent } from "react";

type WelcomeStoresProps = {
  /** Optional parent handler. If omitted, the URL is sent to /new-order?url=... */
  onSubmitLink?: (url: string) => void;
};

const stores = ["TEMU", "Trendyol", "SHEIN", "Amazon", "AliExpress"];

export default function WelcomeStores({ onSubmitLink }: WelcomeStoresProps) {
  const [productUrl, setProductUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = productUrl.trim();
    if (!url) return;

    if (onSubmitLink) {
      onSubmitLink(url);
      return;
    }

    window.location.assign(`/new-order?url=${encodeURIComponent(url)}`);
  }

  return (
    <>
      <style>{`
        .wsm-welcome,
        .wsm-stores,
        .wsm-search,
        .wsm-welcome *,
        .wsm-stores *,
        .wsm-search * { box-sizing: border-box; }

        .wsm-welcome {
          padding: 48px 16px 8px;
          text-align: center;
          color: #fff;
          font-family: "Segoe UI", Tahoma, system-ui, sans-serif;
        }
        .wsm-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          color: #e0f2fe;
          font-size: 12px;
          font-weight: 700;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .wsm-badge-star { color: #ff7a00; }
        .wsm-welcome h1 {
          margin: 0;
          color: #fff;
          font-size: 40px;
          font-weight: 900;
          line-height: 1.15;
          text-shadow: 0 2px 12px rgba(0,0,0,.45);
        }
        .wsm-welcome p {
          max-width: 36rem;
          margin: 12px auto 0;
          color: rgba(255,255,255,.85);
          font-size: 15px;
          line-height: 1.7;
        }

        .wsm-stores {
          padding: 24px 16px 0;
          color: #fff;
          font-family: "Segoe UI", Tahoma, system-ui, sans-serif;
        }
        .wsm-stores-lead {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 0 16px;
          color: #bae6fd;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
        }
        .wsm-stores-bar {
          width: 32px;
          height: 2px;
          flex: 0 0 32px;
          border-radius: 9px;
          background: #fb923c;
        }
        .wsm-store-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          max-width: 750px;
          margin: 0 auto;
          padding: 4px 0 8px;
          direction: ltr;
        }
        .wsm-store-tile {
          position: relative;
          display: flex;
          height: 110px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1.5px solid rgba(255,255,255,.18);
          border-radius: 22px;
          background: rgba(255,255,255,.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 8px 32px rgba(0,0,0,.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: transform .3s, border-color .3s;
        }
        .wsm-store-tile:hover {
          transform: scale(1.05);
          border-color: #ff8a2a;
        }
        .wsm-store-name {
          position: relative;
          z-index: 2;
          color: #fff;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -.5px;
          text-shadow: 0 2px 12px rgba(0,0,0,.6);
        }
        .wsm-store-tile::after {
          position: absolute;
          top: 0;
          left: -20%;
          width: 80%;
          height: 100%;
          transform: rotate(15deg);
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,.25) 40%, transparent 60%);
          content: "";
          pointer-events: none;
        }
        .wsm-store-temu {
          border-color: #ff8a2a;
          background: rgba(255,122,0,.18);
          box-shadow: 0 0 30px rgba(255,122,0,.5), inset 0 0 20px rgba(255,122,0,.15);
          animation: wsm-orange-pulse 2s infinite;
        }
        @keyframes wsm-orange-pulse {
          0%, 100% { box-shadow: 0 0 22px rgba(255,122,0,.45), inset 0 0 20px rgba(255,122,0,.15); }
          50% { box-shadow: 0 0 40px rgba(255,122,0,.8), inset 0 0 24px rgba(255,122,0,.25); }
        }

        .wsm-search {
          max-width: 42rem;
          margin: 0 auto;
          padding: 12px 16px 0;
          color: #fff;
          font-family: "Segoe UI", Tahoma, system-ui, sans-serif;
        }
        .wsm-search-form {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          padding: 8px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 16px;
          background: rgba(255,255,255,.08);
          box-shadow: 0 10px 30px rgba(0,0,0,.25);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .wsm-search-icon {
          display: grid;
          flex: 0 0 24px;
          place-items: center;
          margin-right: 4px;
          color: #fff;
        }
        .wsm-search-input {
          min-width: 0;
          flex: 1;
          padding: 10px 4px;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
        }
        .wsm-search-input::placeholder { color: rgba(255,255,255,.7); }
        .wsm-search-input:focus-visible { box-shadow: inset 0 -1px #7dd3fc; }
        .wsm-search-button {
          flex: 0 0 auto;
          padding: 10px 16px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(to right, #ff7a00, #ff6a00);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: filter .2s, transform .2s;
        }
        .wsm-search-button:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .wsm-search-button:focus-visible,
        .wsm-store-tile:focus-visible { outline: 2px solid #7dd3fc; outline-offset: 3px; }

        @media (max-width: 760px) {
          .wsm-welcome h1 { font-size: 30px; }
          .wsm-store-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .wsm-store-tile { height: 88px; }
          .wsm-store-name { font-size: 16px; }
        }
        @media (max-width: 380px) {
          .wsm-stores-bar { width: 20px; flex-basis: 20px; }
          .wsm-store-grid { gap: 9px; }
          .wsm-store-name { font-size: 14px; }
          .wsm-search-button { padding-inline: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wsm-store-temu { animation: none; }
          .wsm-store-tile, .wsm-search-button { transition: none; }
        }
      `}</style>

      <section className="wsm-welcome" dir="rtl" aria-labelledby="wsm-welcome-title">
        <div className="wsm-badge">
          <span className="wsm-badge-star" aria-hidden="true">★</span>
          <span>خدمة التسوق الأولى في اليمن</span>
        </div>
        <h1 id="wsm-welcome-title">تسوق عالمياً، واستمتع محلياً</h1>
        <p>
          اطلب من أي متجر عالمي ونوصله لباب بيتك في جميع المحافظات بأقل تكلفة وأعلى موثوقية
        </p>
      </section>

      <section className="wsm-stores" dir="rtl" aria-label="المتاجر العالمية">
        <p className="wsm-stores-lead">
          <span className="wsm-stores-bar" aria-hidden="true" />
          <span>نستورد لك من أشهر المتاجر العالمية</span>
          <span className="wsm-stores-bar" aria-hidden="true" />
        </p>
        <div className="wsm-store-grid">
          {stores.map((store) => (
            <div
              key={store}
              className={`wsm-store-tile${store === "TEMU" ? " wsm-store-temu" : ""}`}
              aria-label={store}
            >
              <span className="wsm-store-name">{store}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wsm-search" dir="rtl" aria-label="طلب منتج من رابط">
        <form className="wsm-search-form" onSubmit={handleSubmit}>
          <span className="wsm-search-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="wsm-search-input"
            dir="ltr"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="الصق رابط المنتج هنا..."
            aria-label="رابط المنتج"
            value={productUrl}
            onChange={(event) => setProductUrl(event.target.value)}
            required
          />
          <button className="wsm-search-button" type="submit">اطلب الآن</button>
        </form>
      </section>
    </>
  );
}
