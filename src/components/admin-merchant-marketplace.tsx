/* =========================================================
   admin-merchant-marketplace.tsx — إدارة المتاجر والسوق
   مكوّن متكامل ومستقل 100%:
   - التنسيقات مدمجة بالكامل (لا يحتاج لملف CSS خارجي)
   - متوافق مع جداول merchant_stores / merchant_products / merchant_orders
   - متوافق تماماً مع noUncheckedIndexedAccess الصارم
   ========================================================= */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode, ChangeEvent } from "react";

/* ---------- الأنواع ---------- */
type TabKey = "stores" | "products" | "orders";
type OrderStatus = "new" | "done" | "cancel";

interface Store {
  id: string;
  name: string;
  phone: string;
  products: number;
  ownerId: string;
  ownerName: string;
  commission: number;
  active: boolean;
  color: string;
}

interface ProductReview {
  id: string;
  storeId: string;
  storeName: string;
  storeColor: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  qty: number;
  submittedAt: string;
}

interface OrderItem {
  id: string;
  code: string;
  storeId: string;
  storeName: string;
  storeColor: string;
  customer: string;
  phone: string;
  product: string;
  amount: number;
  status: OrderStatus;
  date: string;
}

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
}

/* ---------- الثوابت ---------- */
const DEFAULT_COLOR = "#0B3A66";
const PALETTE = [
  "#0B3A66", "#0E4577", "#F58220", "#F0A81E",
  "#1E9E63", "#D64545", "#7C3AED", "#0891B2",
  "#2563EB", "#4F46E5", "#059669", "#DC2626",
];

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  new: { label: "طلب جديد", cls: "new" },
  done: { label: "مكتمل", cls: "done" },
  cancel: { label: "ملغي", cls: "cancel" },
};

function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ar-YE")} ر.ي`;
  }
}

function initial(str: string): string {
  return (str || "م").trim().charAt(0);
}

/* ---------- الأيقونات المضمّنة (SVG) ---------- */
function S({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={`ic ${className || ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IcoStore = () => <S d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7M4 7v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M2 7h20M10 12h4" />;
const IcoBox = () => <S d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12" />;
const IcoCart = () => <S d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />;
const IcoPlus = () => <S d="M12 5v14M5 12h14" />;
const IcoSearch = () => <S d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />;
const IcoCheck = () => <S d="M20 6 9 17l-5-5" />;
const IcoX = () => <S d="M18 6 6 18M6 6l12 12" />;
const IcoPhone = () => <S d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />;
const IcoPercent = () => <S d="M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />;
const IcoUser = () => <S d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />;
const IcoTag = () => <S d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2ZM7 7h.01" />;
const IcoClock = () => <S d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 5v5l3.5 2" />;
const IcoKey = () => <S d="m15.5 8.5 2 2M13.5 10.5l2 2M21 2l-9.6 9.6a5.5 5.5 0 1 0 2.1 2.1L21 6V2Z" />;

/* ---------- التنسيقات المدمجة ---------- */
const EMBEDDED_STYLES = `
.dash{--navy:#0B3A66;--navy-2:#0E4577;--orange:#F58220;--gold:#F0A81E;--green:#1E9E63;--red:#D64545;--ink:#14213A;--ink-2:#5B6880;--line:#E6EAF1;--bg:#F4F6FA;--card:#fff;
 font-family:"Tajawal",system-ui,sans-serif;color:var(--ink);background:var(--bg);min-height:100vh;direction:rtl;text-align:right}
.dash *{box-sizing:border-box}
.dash button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
.dash input{font:inherit;color:inherit}
.ic{flex-shrink:0}
.main{min-width:0;width:100%}
.topbar{display:flex;align-items:center;gap:16px;padding:14px 28px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.crumb{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--ink-2)}.crumb b{color:var(--ink)}
.search{flex:1;max-width:420px;display:flex;align-items:center;gap:8px;background:var(--bg);border-radius:12px;padding:8px 12px;color:var(--ink-2);margin-inline-start:auto}
.search input{border:0;background:none;outline:none;flex:1}
.search kbd{font-size:11px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:1px 6px}
.tb-actions{display:flex;align-items:center;gap:12px}
.icon-btn{position:relative;width:40px;height:40px;border-radius:12px;background:var(--bg);display:grid;place-items:center}
.ping{position:absolute;top:9px;left:10px;width:8px;height:8px;border-radius:50%;background:var(--orange);border:2px solid #fff}
.me{display:flex;align-items:center;gap:8px;font-size:13px}.me small{display:block;color:var(--ink-2)}
.av{width:36px;height:36px;border-radius:50%;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:700;flex-shrink:0}
.cta,.btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--orange)!important;color:#fff!important;padding:10px 16px;border-radius:12px;font-weight:700;box-shadow:0 6px 16px -6px var(--orange)}
.wrap{padding:24px 28px;display:flex;flex-direction:column;gap:20px}
.admin-hero{background:linear-gradient(135deg,var(--navy),var(--navy-2));color:#fff;border-radius:22px;padding:28px;position:relative;overflow:hidden}
.admin-hero:after{content:"";position:absolute;left:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:var(--orange);opacity:.18}
.ah-top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;position:relative;z-index:1}
.admin-hero h1{margin:10px 0 6px;font-size:28px}.admin-hero p{margin:0;opacity:.75}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;background:#ffffff1a;padding:4px 12px;border-radius:99px}
.live{width:8px;height:8px;border-radius:50%;background:#3EE08F;box-shadow:0 0 0 4px #3ee08f33}
.ah-kpis{display:flex;gap:12px;flex-wrap:wrap}
.kpi{background:#ffffff14;border:1px solid #ffffff1f;border-radius:16px;padding:14px 18px;min-width:140px}
.kpi b{font-size:22px;display:flex;gap:4px;align-items:baseline}.kpi i{font-style:normal;font-size:12px;opacity:.7}
.kpi span{font-size:12px;opacity:.7}.kpi.gold b{color:#FFC531}.kpi.green b{color:#3EE08F}
.tabs-bar{display:flex;gap:6px;background:#fff;padding:6px;border-radius:16px;border:1px solid var(--line);width:fit-content;flex-wrap:wrap}
.tab-btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;font-weight:700;font-size:14px;color:var(--ink-2)}
.tab-btn.on{background:var(--navy);color:#fff}
.cnt{font-size:11px;background:#0000000f;padding:1px 8px;border-radius:99px}.tab-btn.on .cnt{background:#ffffff2e}.cnt.warn{background:var(--orange);color:#fff}
.admin-grid{display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start}
.col{display:flex;flex-direction:column;gap:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden}
.card.sticky{position:sticky;top:90px}
.card-h{display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid var(--line)}
.card-h h2{margin:0;font-size:16px}.card-h p{margin:2px 0 0;font-size:12px;color:var(--ink-2)}
.sq{width:40px;height:40px;border-radius:12px;background:#0B3A6612;color:var(--navy);display:grid;place-items:center}
.end{margin-inline-start:auto}
.card-b{padding:18px 20px}
.tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap}
.tag.dot:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.tag.done{background:#1E9E631a;color:var(--green)}.tag.cancel{background:#D645451a;color:var(--red)}
.tag.new{background:#F582201f;color:var(--orange)}.tag.review{background:#F0A81E22;color:#B07800}
.stores{display:flex;flex-direction:column;gap:10px}
.st{border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:.2s}.st.on{border-color:var(--navy);box-shadow:0 10px 30px -18px var(--navy)}
.st-h{display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer}
.lg{width:44px;height:44px;border-radius:12px;color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px}
.meta{flex:1;min-width:0}.meta b{display:block}.meta small{color:var(--ink-2);direction:ltr;display:inline-block}
.mid{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--ink-2)}
.chev{transition:.2s;color:var(--ink-2)}.st.on .chev{transform:rotate(-90deg)}
.st-b{display:none;padding:14px;border-top:1px dashed var(--line);background:#FAFBFD}.st.on .st-b{display:block}
.st-badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.point{display:inline-flex;align-items:center;gap:6px;font-size:12px;background:#fff;border:1px solid var(--line);padding:4px 10px;border-radius:99px;color:var(--ink-2)}
.point .ic{width:14px;height:14px}.point.green{color:var(--green)}
.st-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.fld{display:flex;flex-direction:column;gap:6px}
.fld label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--ink-2)}.fld label .ic{width:14px;height:14px}
.inp{width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 12px;background:#fff;outline:none}
.inp:focus{border-color:var(--navy);box-shadow:0 0 0 3px #0B3A661a}
.mini-stat{border:1px solid var(--line);border-radius:10px;padding:6px 12px;background:#fff}.mini-stat b{display:block;font-size:14px}.mini-stat small{font-size:11px;color:var(--ink-2)}
.switch{display:flex;align-items:center;gap:8px;cursor:pointer;padding:9px 0;font-size:13px}
.track{width:38px;height:22px;border-radius:99px;background:#C8CFDB;position:relative;transition:.2s}
.track:after{content:"";position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s}
.switch.on .track{background:var(--green)}.switch.on .track:after{right:19px}
.st-id{grid-column:1/-1;display:flex;align-items:center;gap:8px;background:#fff;border:1px dashed var(--line);border-radius:10px;padding:8px 12px;font-size:12px}
.st-id code{flex:1;direction:ltr;text-align:left;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis}
.st-id button{display:flex;align-items:center;gap:4px;color:var(--navy);font-weight:700}.st-id .ic{width:14px;height:14px}
.st-foot{display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap}
.st-note{margin-inline-start:auto;font-size:12px;color:var(--ink-2)}
.btn-sm{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;font-size:13px;font-weight:700}
.btn-sm .ic{width:15px;height:15px}
.btn-sm.primary{background:var(--navy)!important;color:#fff!important}.btn-sm.ghost{border:1px solid var(--line)!important;background:#fff!important}
.btn-sm.danger{color:var(--red)!important;background:#D6454512!important}
.stepline{display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:12px}
.step{display:flex;align-items:center;gap:6px;color:var(--ink-2);font-weight:700}
.step .n{width:22px;height:22px;border-radius:50%;background:var(--bg);display:grid;place-items:center;font-size:11px}
.step.on{color:var(--navy)}.step.on .n{background:var(--navy);color:#fff}.step.done .n{background:var(--green);color:#fff}
.stepline .bar{flex:1;height:2px;background:var(--line)}.stepline .bar.on{background:var(--green)}
.search-box{position:relative}.search-box>.ic{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--ink-2);width:18px}
.search-box .inp{padding-right:38px}
.empty-search{display:flex;align-items:center;gap:8px;justify-content:center;color:var(--ink-2);font-size:13px;padding:18px;border:1px dashed var(--line);border-radius:12px;margin-top:12px}
.results{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.res{display:flex!important;align-items:center;gap:10px;padding:10px!important;border:1px solid var(--line)!important;border-radius:12px;width:100%}
.res b{display:block;font-size:14px}.res small{color:var(--ink-2);font-size:12px}
.res .go{margin-inline-start:auto;color:var(--ink-2)}.res.picked{border-color:var(--green)!important;background:#1E9E630d!important}
.picked-card{display:flex;align-items:center;gap:10px;margin-top:12px;padding:12px;border-radius:12px;background:#1E9E6312}
.picked-card .av{background:var(--green)}.picked-card small{display:block;color:var(--ink-2)}.picked-card .tag{margin-inline-start:auto}
.form{display:grid;gap:12px;margin-top:16px}.form-foot{margin-top:16px}
.rev-list{display:flex;flex-direction:column;gap:12px}
.rev{display:flex;gap:14px;border:1px solid var(--line);border-radius:16px;padding:12px}
.rev .img{width:84px;height:84px;border-radius:14px;color:#fff;display:grid;place-items:center;font-size:28px;font-weight:800;flex-shrink:0}
.rev .body{flex:1;display:flex;flex-direction:column;gap:6px}
.sub{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-2);flex-wrap:wrap}.sub span{display:inline-flex;align-items:center;gap:4px}
.sub .dot{width:4px;height:4px;border-radius:50%;background:currentColor}
.price{display:flex;align-items:center;gap:8px}.price b{color:var(--orange)}.price s{color:var(--ink-2);font-size:12px}
.acts{display:flex;gap:8px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:99px;font-weight:700;font-size:13px}
.pill.ok{background:var(--green)!important;color:#fff!important}.pill.no{background:#D6454514!important;color:var(--red)!important}
.bars{display:flex;flex-direction:column;gap:14px}
.lab{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
.bar-track{height:8px;border-radius:99px;background:var(--bg);overflow:hidden}.bar-fill{height:100%;border-radius:99px;transition:width .4s}
.sum-total{display:flex;justify-content:space-between;align-items:center;padding:14px;border-radius:12px;background:var(--bg);margin-top:12px}.sum-total b{font-size:18px;color:var(--navy)}
.sum-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed var(--line);font-size:14px}
.preview-note{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--ink-2);margin:14px 0 0}
.filters{display:flex;gap:8px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:99px;border:1px solid var(--line)!important;font-size:13px;font-weight:700}
.chip.on{background:var(--navy)!important;color:#fff!important;border-color:var(--navy)!important}.chip.on .cnt{background:#ffffff2e}
.adm-orders{border-top:1px solid var(--line)}
.ao-head,.ao-row{display:grid;grid-template-columns:2fr 1.6fr 1.2fr 1fr 1.4fr;gap:12px;align-items:center;padding:12px 20px}
.ao-head{font-size:12px;color:var(--ink-2);font-weight:700;background:#FAFBFD}
.ao-row{border-top:1px solid var(--line);font-size:14px}.ao-row:hover{background:#FAFBFD}
.o-cust{display:flex;align-items:center;gap:10px;min-width:0}.o-cust small{display:block;color:var(--ink-2);font-size:12px;direction:ltr;text-align:right}
.o-prod{display:flex;flex-direction:column;min-width:0}.ao-id{font-size:11px;color:var(--ink-2)}
.o-amt{font-weight:800}.o-amt small{font-weight:400;color:var(--ink-2)}
.o-state{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.o-act{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--green)!important}
.toast{position:fixed;bottom:24px;left:50%;transform:translate(-50%,120px);background:var(--ink);color:#fff;padding:12px 18px;border-radius:14px;display:flex;align-items:center;gap:8px;font-weight:700;transition:.3s;z-index:50}
.toast.on{transform:translate(-50%,0)}.toast .ic{color:#3EE08F}
@media (max-width:1100px){.admin-grid{grid-template-columns:1fr}.card.sticky{position:static}.st-row{grid-template-columns:1fr 1fr}}
@media (max-width:820px){.dash{grid-template-columns:1fr}.wrap{padding:16px}.topbar{padding:12px 16px}
 .ao-head{display:none}.ao-row{grid-template-columns:1fr 1fr}.st-row{grid-template-columns:1fr}.mid{display:none}}

/* مظهر إدارة التجار الجديد - تنسيقات فقط دون تغيير الوظائف */
.dash{--navy:#0B3A66;--navy-2:#124A78;--orange:#F58220;--gold:#FFC531;--green:#10A879;--ink:#193451;--ink-2:#7A91AA;--line:#DCE6F2;--bg:#F3F6FA;--card:#fff}
.wrap{padding:18px 28px 32px;gap:16px}
.admin-hero{border-radius:22px;padding:22px 26px;background:linear-gradient(120deg,#0B3A66,#124A78);box-shadow:0 12px 28px #0b3a6618}
.admin-hero:after{width:260px;height:260px;left:3%;top:-105px;border:1px dashed #ffffff35;background:transparent;opacity:1}
.ah-top{align-items:center}
.admin-hero h1{font-size:28px;font-weight:800}
.admin-hero p{font-size:13px}
.ah-kpis{gap:10px}
.kpi{min-width:110px;padding:10px 14px;border-radius:14px;background:#ffffff18}
.kpi b{font-size:20px}
.tabs-bar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;gap:6px;padding:6px;border-radius:15px;box-shadow:0 2px 5px #0b3a660d}
.tab-btn{justify-content:center;padding:12px 14px;border-radius:11px}
.tab-btn.on{background:var(--navy);box-shadow:0 5px 14px #0b3a6625}
.admin-grid{grid-template-columns:minmax(0,1.4fr) minmax(340px,1fr);gap:16px}
.col{gap:16px}
.card{border-color:var(--line);border-radius:18px;box-shadow:0 2px 5px #0b3a6609}
.card-h{padding:16px 18px}
.card-h h2{font-size:16px;font-weight:800}
.card-h p{font-size:12px;color:var(--ink-2)}
.sq{width:36px;height:36px;border-radius:11px;background:#edf4fb}
.card-b{padding:16px 18px}
.stores{gap:10px}
.st{border-radius:15px;border-color:#dce6f2}
.st.on{border-color:#b8d3ee;box-shadow:0 3px 10px #0b3a6610}
.st-h{min-height:66px;padding:12px 14px}
.lg{width:38px;height:38px;border-radius:11px}
.st-b{padding:13px;background:#fff}
.st-badges{justify-content:flex-start}
.point{background:#f5f8fc;border:0;font-size:11px}
.st-row{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.fld label{color:#506987}
.inp{border-color:#dce6f2;border-radius:11px;padding:10px 12px}
.inp:focus{border-color:#82b6e5;box-shadow:0 0 0 3px #0b3a6612}
.st-id{background:#f5f8fc;border-color:#e3ebf4}
.btn-sm.primary{background:var(--navy)!important;border-radius:10px}
.btn-sm.ghost{border-radius:10px}
.cta,.btn-primary{border-radius:11px;background:#7895ad!important;box-shadow:none}
.search-box .inp{border-radius:12px}
.results .res{background:#fff}
@media(max-width:900px){.admin-grid{grid-template-columns:1fr}.card.sticky{position:static}}
@media(max-width:600px){.wrap{padding:14px}.admin-hero{padding:18px}.tabs-bar{grid-template-columns:1fr}.tab-btn{justify-content:flex-start}.ah-kpis{width:100%}.kpi{flex:1;min-width:90px}.st-row{grid-template-columns:1fr}}
`;

/* ---------- المكوّن الرئيسي ---------- */
export function AdminMerchantMarketplace() {
  const [tab, setTab] = useState<TabKey>("stores");
  const [stores, setStores] = useState<Store[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // البحث عن عميل لإنشاء متجر
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [picked, setPicked] = useState<CustomerResult | null>(null);

  // حقول متجر جديد
  const [newStoreName, setNewStoreName] = useState("");
  const [newStorePhone, setNewStorePhone] = useState("");
  const [newStoreCommission, setNewStoreCommission] = useState(10);
  const [newStoreColor, setNewStoreColor] = useState<string>(PALETTE[0] ?? DEFAULT_COLOR);
  const [creating, setCreating] = useState(false);

  // إشعار عائم
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const fireToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  }, []);

  // فلتر الطلبات
  const [orderFilter, setOrderFilter] = useState<"all" | OrderStatus>("all");

  /* ---------- جلب البيانات من Lovable Cloud ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = supabase as any;

      // 1) جلب المتاجر (دعم اسم الجدول merchant_stores أو stores)
      let sRes = await db
        .from("merchant_stores")
        .select("id, name, phone, owner_id, commission_rate, is_active, color, created_at")
        .order("created_at", { ascending: false });

      let isMerchantPrefix = true;
      if (sRes.error) {
        isMerchantPrefix = false;
        sRes = await db
          .from("stores")
          .select("id, name, phone, owner_id, commission, active, color, created_at, owner:profiles(full_name)")
          .order("created_at", { ascending: false });
      }

      const rawStores = sRes.data || [];

      // 2) جلب أسماء الملاك من profiles
      const ownerIds = Array.from(new Set(rawStores.map((s: any) => s.owner_id).filter(Boolean)));
      let profileMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profs } = await db
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        if (profs) {
          profileMap = Object.fromEntries(profs.map((p: any) => [p.id, p.full_name || "عميل"]));
        }
      }

      // 3) عد المنتجات لكل متجر
      const prodTable = isMerchantPrefix ? "merchant_products" : "products";
      const { data: prodCounts } = await db
        .from(prodTable)
        .select("store_id");
      const countMap: Record<string, number> = {};
      if (prodCounts) {
        prodCounts.forEach((p: any) => {
          if (p.store_id) countMap[p.store_id] = (countMap[p.store_id] || 0) + 1;
        });
      }

      const mappedStores: Store[] = rawStores.map((s: any) => {
        const comm = s.commission !== undefined
          ? Number(s.commission)
          : Math.round(Number(s.commission_rate || 0.1) * 100);
        return {
          id: s.id,
          name: s.name,
          phone: s.phone || "",
          products: countMap[s.id] || 0,
          ownerId: s.owner_id,
          ownerName: s.owner?.full_name || profileMap[s.owner_id] || "مالك المتجر",
          commission: comm,
          active: s.active !== undefined ? Boolean(s.active) : Boolean(s.is_active),
          color: s.color || DEFAULT_COLOR,
        };
      });
      setStores(mappedStores);

      const firstStore = mappedStores[0];
      if (firstStore && !expandedId) {
        setExpandedId(firstStore.id);
      }

      // 4) جلب المنتجات قيد المراجعة
      const { data: rawProds } = await db
        .from(prodTable)
        .select("id, store_id, name, category, price, old_price, qty, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const storeMap = Object.fromEntries(mappedStores.map((st) => [st.id, st]));

      const mappedProds: ProductReview[] = (rawProds || []).map((p: any) => {
        const st = storeMap[p.store_id];
        return {
          id: p.id,
          storeId: p.store_id,
          storeName: st?.name || "متجر",
          storeColor: st?.color || DEFAULT_COLOR,
          name: p.name,
          category: p.category || "عام",
          price: Number(p.price || 0),
          oldPrice: p.old_price ? Number(p.old_price) : undefined,
          qty: Number(p.qty || 1),
          submittedAt: p.created_at ? new Date(p.created_at).toLocaleDateString("ar-YE") : "الآن",
        };
      });
      setReviews(mappedProds);

      // 5) جلب الطلبات
      const orderTable = isMerchantPrefix ? "merchant_orders" : "orders";
      const { data: rawOrders } = await db
        .from(orderTable)
        .select("id, code, store_id, customer_name, customer_phone, product_name, amount, total_amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const mappedOrders: OrderItem[] = (rawOrders || []).map((o: any) => {
        const st = storeMap[o.store_id];
        let stCode: OrderStatus = "new";
        if (o.status === "completed" || o.status === "done" || o.status === "confirmed") stCode = "done";
        else if (o.status === "cancelled" || o.status === "cancel") stCode = "cancel";

        return {
          id: o.id,
          code: o.code || o.id.slice(0, 8),
          storeId: o.store_id,
          storeName: st?.name || "المتجر",
          storeColor: st?.color || DEFAULT_COLOR,
          customer: o.customer_name || "عميل",
          phone: o.customer_phone || "",
          product: o.product_name || "منتج",
          amount: Number(o.amount || o.total_amount || 0),
          status: stCode,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString("ar-YE") : "اليوم",
        };
      });
      setOrders(mappedOrders);
    } catch (err: any) {
      fireToast("تعذر جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [expandedId, fireToast]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- بحث العملاء ---------- */
  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const db = supabase as any;
      const { data } = await db
        .from("profiles")
        .select("id, full_name, phone")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6);

      setResults(
        (data || []).map((p: any) => ({
          id: p.id,
          name: p.full_name || "بدون اسم",
          phone: p.phone || "بدون هاتف",
        }))
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  /* ---------- إنشاء متجر جديد ---------- */
  const createStore = async () => {
    if (!picked) {
      fireToast("اختر عميلاً أولاً");
      return;
    }
    if (!newStoreName.trim()) {
      fireToast("اكتب اسم المتجر");
      return;
    }
    setCreating(true);
    try {
      const db = supabase as any;
      const commRate = Number(newStoreCommission) / 100;

      // محاولة الإدراج في merchant_stores
      let res = await db.from("merchant_stores").insert({
        owner_id: picked.id,
        name: newStoreName.trim(),
        phone: newStorePhone.trim() || picked.phone,
        commission_rate: commRate,
        color: newStoreColor,
        is_active: true,
      });

      if (res.error) {
        // تراجع إلى جدول stores إن كان مستخدماً
        res = await db.from("stores").insert({
          owner_id: picked.id,
          name: newStoreName.trim(),
          phone: newStorePhone.trim() || picked.phone,
          commission: Number(newStoreCommission),
          color: newStoreColor,
          active: true,
        });
      }

      if (res.error) throw res.error;

      fireToast(`تم إنشاء متجر «${newStoreName.trim()}»`);
      setPicked(null);
      setNewStoreName("");
      setNewStorePhone("");
      setQuery("");
      setResults([]);
      await load();
    } catch (err: any) {
      fireToast(err?.message || "فشل إنشاء المتجر");
    } finally {
      setCreating(false);
    }
  };

  /* ---------- تعديل المتجر ---------- */
  const updateStore = async (id: string, updates: Partial<Store>) => {
    try {
      const db = supabase as any;
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.commission !== undefined) {
        payload.commission = updates.commission;
        payload.commission_rate = updates.commission / 100;
      }
      if (updates.active !== undefined) {
        payload.active = updates.active;
        payload.is_active = updates.active;
      }

      let res = await db.from("merchant_stores").update(payload).eq("id", id);
      if (res.error) {
        res = await db.from("stores").update(payload).eq("id", id);
      }
      if (res.error) throw res.error;

      setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      fireToast("تم حفظ التعديلات");
    } catch (err: any) {
      fireToast("فشل الحفظ");
    }
  };

  /* ---------- حذف متجر ---------- */
  const deleteStore = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف متجر «${name}»؟`)) return;
    try {
      const db = supabase as any;
      let res = await db.from("merchant_stores").delete().eq("id", id);
      if (res.error) {
        res = await db.from("stores").delete().eq("id", id);
      }
      if (res.error) throw res.error;

      setStores((prev) => prev.filter((s) => s.id !== id));
      fireToast(`تم حذف «${name}»`);
    } catch (err: any) {
      fireToast("فشل حذف المتجر");
    }
  };

  /* ---------- مراجعة المنتجات ---------- */
  const reviewProduct = async (id: string, accept: boolean, name: string) => {
    try {
      const db = supabase as any;
      const newStatus = accept ? "approved" : "rejected";
      let res = await db.from("merchant_products").update({ status: newStatus }).eq("id", id);
      if (res.error) {
        res = await db.from("products").update({ status: newStatus }).eq("id", id);
      }
      if (res.error) throw res.error;

      setReviews((prev) => prev.filter((r) => r.id !== id));
      fireToast(accept ? `تم اعتماد «${name}»` : `تم رفض «${name}»`);
    } catch (err: any) {
      fireToast("فشل التحديث");
    }
  };

  /* ---------- تأكيد طلب ---------- */
  const confirmOrder = async (id: string, code: string) => {
    try {
      const db = supabase as any;
      let res = await db.from("merchant_orders").update({ status: "confirmed" }).eq("id", id);
      if (res.error) {
        res = await db.from("orders").update({ status: "done" }).eq("id", id);
      }
      if (res.error) throw res.error;

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "done" } : o)));
      fireToast(`تم تأكيد الطلب #${code}`);
    } catch (err: any) {
      fireToast("فشل تأكيد الطلب");
    }
  };

  /* ---------- الإحصائيات المحسوبة ---------- */
  const totalVolume = useMemo(
    () => orders.filter((o) => o.status === "done").reduce((acc, o) => acc + o.amount, 0),
    [orders]
  );

  const totalCommission = useMemo(() => {
    return orders
      .filter((o) => o.status === "done")
      .reduce((acc, o) => {
        const st = stores.find((s) => s.id === o.storeId);
        const rate = (st?.commission || 10) / 100;
        return acc + o.amount * rate;
      }, 0);
  }, [orders, stores]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  return (
    <div className="dash">
      <style dangerouslySetInnerHTML={{ __html: EMBEDDED_STYLES }} />

      <main className="main">
        {/* شريط علوي */}
        <header className="topbar">
          <div className="crumb">
            <span>لوحة الإدارة</span>
            <span>/</span>
            <b>السوق والوسطاء</b>
          </div>

          <div className="search">
            <IcoSearch />
            <input type="text" placeholder="بحث عام..." readOnly />
            <kbd>⌘K</kbd>
          </div>

          <div className="tb-actions">
            <button className="icon-btn" title="الإشعارات" type="button">
              <span className="ping" />
              <IcoClock />
            </button>
            <div className="me">
              <div className="av">م</div>
              <div>
                <b>مدير النظام</b>
                <small>صلاحية عليا</small>
              </div>
            </div>
          </div>
        </header>

        <div className="wrap">
          {/* هيدر الصفحة والـ KPIs */}
          <section className="admin-hero">
            <div className="ah-top">
              <div>
                <span className="eyebrow">
                  <span className="live" /> نظام إدارة السوق المركزي
                </span>
                <h1>إدارة المتاجر واعتماد المنتجات</h1>
                <p>إدارة التجار المعتمدين، تحويل العملاء إلى بائعين، مراجعة المنتجات وقبولها في السوق.</p>
              </div>

              <div className="ah-kpis">
                <div className="kpi">
                  <b>{stores.length}</b>
                  <span>المتاجر النشطة</span>
                </div>
                <div className="kpi gold">
                  <b>{reviews.length}</b>
                  <span>بانتظار المراجعة</span>
                </div>
                <div className="kpi green">
                  <b>{formatMoney(totalCommission)}</b>
                  <span>أرباح العمولات</span>
                </div>
              </div>
            </div>
          </section>

          {/* أزرار التبويبات */}
          <div className="tabs-bar">
            <button
              className={`tab-btn ${tab === "stores" ? "on" : ""}`}
              onClick={() => setTab("stores")}
              type="button"
            >
              <IcoStore />
              <span>المتاجر والوسطاء</span>
              <span className="cnt">{stores.length}</span>
            </button>

            <button
              className={`tab-btn ${tab === "products" ? "on" : ""}`}
              onClick={() => setTab("products")}
              type="button"
            >
              <IcoBox />
              <span>مراجعة المنتجات</span>
              <span className={`cnt ${reviews.length > 0 ? "warn" : ""}`}>{reviews.length}</span>
            </button>

            <button
              className={`tab-btn ${tab === "orders" ? "on" : ""}`}
              onClick={() => setTab("orders")}
              type="button"
            >
              <IcoCart />
              <span>طلبات السوق</span>
              <span className="cnt">{orders.length}</span>
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--ink-2)" }}>
              جاري مزامنة بيانات السوق...
            </div>
          ) : (
            <>
              {/* ===================== التبويب 1: المتاجر ===================== */}
              {tab === "stores" && (
                <div className="admin-grid">
                  {/* قائمة المتاجر */}
                  <div className="col">
                    <div className="card">
                      <div className="card-h">
                        <div className="sq"><IcoStore /></div>
                        <div>
                          <h2>قائمة المتاجر المعتمدة</h2>
                          <p>اضغط على المتجر لتعديل الهاتف أو العمولة أو تعطيل الحساب</p>
                        </div>
                      </div>

                      <div className="card-b">
                        {stores.length === 0 ? (
                          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-2)" }}>
                            لا يوجد متاجر مسجلة بعد. استخدم نموذج اليسار لإنشاء أول متجر.
                          </div>
                        ) : (
                          <div className="stores">
                            {stores.map((st) => {
                              const isOpen = expandedId === st.id;
                              return (
                                <div key={st.id} className={`st ${isOpen ? "on" : ""}`}>
                                  <div
                                    className="st-h"
                                    onClick={() => setExpandedId(isOpen ? null : st.id)}
                                  >
                                    <div className="lg" style={{ background: st.color }}>
                                      {initial(st.name)}
                                    </div>
                                    <div className="meta">
                                      <b>{st.name}</b>
                                      <small>{st.phone || "بدون هاتف"}</small>
                                    </div>
                                    <div className="mid">
                                      <IcoUser />
                                      <span>{st.ownerName}</span>
                                    </div>
                                    <span className={`tag ${st.active ? "done" : "cancel"}`}>
                                      {st.active ? "نشط" : "معطل"}
                                    </span>
                                    <span className="chev">◀</span>
                                  </div>

                                  <div className="st-b">
                                    <div className="st-badges">
                                      <span className="point green">
                                        <IcoBox /> {st.products} منتجات بالسوق
                                      </span>
                                      <span className="point">
                                        <IcoUser /> المالك: {st.ownerName}
                                      </span>
                                    </div>

                                    <div className="st-row">
                                      <div className="fld">
                                        <label><IcoPhone /> هاتف المتجر</label>
                                        <input
                                          className="inp"
                                          defaultValue={st.phone}
                                          onBlur={(e) => updateStore(st.id, { phone: e.target.value })}
                                        />
                                      </div>

                                      <div className="fld">
                                        <label><IcoPercent /> نسبة عمولة السوق (%)</label>
                                        <input
                                          className="inp"
                                          type="number"
                                          min={0}
                                          max={100}
                                          defaultValue={st.commission}
                                          onBlur={(e) =>
                                            updateStore(st.id, { commission: Number(e.target.value) || 0 })
                                          }
                                        />
                                      </div>

                                      <div className="fld">
                                        <label>حالة المتجر</label>
                                        <div
                                          className={`switch ${st.active ? "on" : ""}`}
                                          onClick={() => updateStore(st.id, { active: !st.active })}
                                        >
                                          <div className="track" />
                                          <span>{st.active ? "ظاهر بالسوق" : "مخفي وموقوف"}</span>
                                        </div>
                                      </div>

                                      <div className="st-id">
                                        <IcoKey />
                                        <code>معرف المتجر: {st.id}</code>
                                      </div>
                                    </div>

                                    <div className="st-foot">
                                      <button
                                        className="btn-sm danger"
                                        onClick={() => deleteStore(st.id, st.name)}
                                        type="button"
                                      >
                                        <IcoX /> حذف المتجر
                                      </button>
                                      <span className="st-note">
                                        التعديلات تُحفظ تلقائياً بمجرد الخروج من الحقل
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* نموذج ترقية عميل إلى تاجر */}
                  <div className="col">
                    <div className="card sticky">
                      <div className="card-h">
                        <div className="sq"><IcoPlus /></div>
                        <div>
                          <h2>ترقية عميل إلى تاجر</h2>
                          <p>ابحث عن العميل بالاسم أو الهاتف وأنشئ له متجره</p>
                        </div>
                      </div>

                      <div className="card-b">
                        <div className="search-box">
                          <IcoSearch />
                          <input
                            className="inp"
                            placeholder="ابحث بالاسم أو رقم الهاتف..."
                            value={query}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") runSearch();
                            }}
                          />
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn-sm ghost"
                            onClick={runSearch}
                            disabled={searching}
                            type="button"
                          >
                            {searching ? "جاري البحث..." : "بحث الآن"}
                          </button>
                        </div>

                        {results.length > 0 && !picked && (
                          <div className="results">
                            {results.map((r) => (
                              <button
                                key={r.id}
                                className="res"
                                onClick={() => {
                                  setPicked(r);
                                  setNewStoreName(`متجر ${r.name}`);
                                  setNewStorePhone(r.phone);
                                }}
                                type="button"
                              >
                                <div className="av">{initial(r.name)}</div>
                                <div>
                                  <b>{r.name}</b>
                                  <small>{r.phone}</small>
                                </div>
                                <span className="go">اختيار ◀</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {picked && (
                          <div className="picked-card">
                            <div className="av">{initial(picked.name)}</div>
                            <div>
                              <b>{picked.name}</b>
                              <small>{picked.phone}</small>
                            </div>
                            <span className="tag done">تم الاختيار</span>
                          </div>
                        )}

                        {picked && (
                          <div className="form">
                            <div className="fld">
                              <label>اسم المتجر بالسوق</label>
                              <input
                                className="inp"
                                value={newStoreName}
                                onChange={(e) => setNewStoreName(e.target.value)}
                              />
                            </div>

                            <div className="fld">
                              <label>هاتف المتجر والتواصل</label>
                              <input
                                className="inp"
                                value={newStorePhone}
                                onChange={(e) => setNewStorePhone(e.target.value)}
                              />
                            </div>

                            <div className="fld">
                              <label>نسبة العمولة الافتراضية (%)</label>
                              <input
                                className="inp"
                                type="number"
                                min={0}
                                max={100}
                                value={newStoreCommission}
                                onChange={(e) => setNewStoreCommission(Number(e.target.value) || 0)}
                              />
                            </div>

                            <div className="fld">
                              <label>لون الهوية للمتجر</label>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {PALETTE.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setNewStoreColor(c)}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 8,
                                      background: c,
                                      border: newStoreColor === c ? "3px solid #000" : "none",
                                      cursor: "pointer",
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="form-foot">
                              <button
                                className="cta"
                                style={{ width: "100%" }}
                                onClick={createStore}
                                disabled={creating}
                                type="button"
                              >
                                {creating ? "جاري الإنشاء..." : "اعتماد وترقية إلى تاجر"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===================== التبويب 2: مراجعة المنتجات ===================== */}
              {tab === "products" && (
                <div className="card">
                  <div className="card-h">
                    <div className="sq"><IcoBox /></div>
                    <div>
                      <h2>المنتجات المرسلة للمراجعة والاعتماد</h2>
                      <p>راجع تفاصيل المنتج واعتمد ظهوره في السوق أو ارفضه</p>
                    </div>
                  </div>

                  <div className="card-b">
                    {reviews.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 50, color: "var(--ink-2)" }}>
                        🎉 لا توجد منتجات معلقة للمراجعة حالياً، جميع المنتجات معتمدة!
                      </div>
                    ) : (
                      <div className="rev-list">
                        {reviews.map((r) => (
                          <div key={r.id} className="rev">
                            <div className="img" style={{ background: r.storeColor }}>
                              {initial(r.name)}
                            </div>
                            <div className="body">
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <b style={{ fontSize: 16 }}>{r.name}</b>
                                <span className="tag review">بانتظار الاعتماد</span>
                              </div>

                              <div className="sub">
                                <span><IcoStore /> {r.storeName}</span>
                                <span className="dot" />
                                <span><IcoTag /> {r.category}</span>
                                <span className="dot" />
                                <span><IcoBox /> الكمية: {r.qty}</span>
                                <span className="dot" />
                                <span><IcoClock /> {r.submittedAt}</span>
                              </div>

                              <div className="price">
                                <b>{formatMoney(r.price)}</b>
                                {r.oldPrice && <s>{formatMoney(r.oldPrice)}</s>}
                              </div>

                              <div className="acts">
                                <button
                                  className="pill ok"
                                  onClick={() => reviewProduct(r.id, true, r.name)}
                                  type="button"
                                >
                                  <IcoCheck /> اعتماد ونشر بالسوق
                                </button>
                                <button
                                  className="pill no"
                                  onClick={() => reviewProduct(r.id, false, r.name)}
                                  type="button"
                                >
                                  <IcoX /> رفض
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===================== التبويب 3: طلبات السوق ===================== */}
              {tab === "orders" && (
                <div className="card">
                  <div className="card-h">
                    <div className="sq"><IcoCart /></div>
                    <div>
                      <h2>طلبات الشراء والعمولات</h2>
                      <p>إجمالي المبيعات المؤكدة: {formatMoney(totalVolume)}</p>
                    </div>

                    <div className="filters end">
                      <button
                        className={`chip ${orderFilter === "all" ? "on" : ""}`}
                        onClick={() => setOrderFilter("all")}
                        type="button"
                      >
                        الكل
                      </button>
                      <button
                        className={`chip ${orderFilter === "new" ? "on" : ""}`}
                        onClick={() => setOrderFilter("new")}
                        type="button"
                      >
                        جديدة
                      </button>
                      <button
                        className={`chip ${orderFilter === "done" ? "on" : ""}`}
                        onClick={() => setOrderFilter("done")}
                        type="button"
                      >
                        مكتملة
                      </button>
                    </div>
                  </div>

                  <div className="adm-orders">
                    <div className="ao-head">
                      <div>العميل</div>
                      <div>المتجر والمنتج</div>
                      <div>المبلغ</div>
                      <div>الحالة</div>
                      <div>إجراء</div>
                    </div>

                    {filteredOrders.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 40, color: "var(--ink-2)" }}>
                        لا توجد طلبات تطابق هذا التصنيف
                      </div>
                    ) : (
                      filteredOrders.map((o) => {
                        const stStatus = STATUS[o.status];
                        return (
                          <div key={o.id} className="ao-row">
                            <div className="o-cust">
                              <div className="av" style={{ width: 32, height: 32, fontSize: 13 }}>
                                {initial(o.customer)}
                              </div>
                              <div>
                                <b>{o.customer}</b>
                                <small>{o.phone || "بدون هاتف"}</small>
                              </div>
                            </div>

                            <div className="o-prod">
                              <b>{o.product}</b>
                              <span className="ao-id">
                                متجر: {o.storeName} • #{o.code}
                              </span>
                            </div>

                            <div className="o-amt">{formatMoney(o.amount)}</div>

                            <div className="o-state">
                              <span className={`tag dot ${stStatus ? stStatus.cls : ""}`}>
                                {stStatus ? stStatus.label : o.status}
                              </span>
                            </div>

                            <div>
                              {o.status === "new" ? (
                                <button
                                  className="o-act"
                                  onClick={() => confirmOrder(o.id, o.code)}
                                  type="button"
                                >
                                  <IcoCheck /> تأكيد الطلب
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                                  {o.status === "done" ? "تم التحصيل" : "ملغي"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* تنبيه عائم (Toast) */}
      <div className={`toast ${toastMsg ? "on" : ""}`}>
        <IcoCheck />
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}
