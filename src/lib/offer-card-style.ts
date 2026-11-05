// ألوان وصورة بطاقات العروض: يختارها المشرف بحرية، ولكل قالب ألوان افتراضية.

export type OfferCardTheme = "exclusive" | "deals";

export type OfferCardColors = {
  bg_color: string;
  bg_color_2: string;
  text_color: string;
  accent_color: string;
};

export const THEME_COLORS: Record<OfferCardTheme, OfferCardColors> = {
  exclusive: { bg_color: "#17130F", bg_color_2: "#050505", text_color: "#D4AF37", accent_color: "#D4AF37" },
  deals: { bg_color: "#F8BBD0", bg_color_2: "#F5A6BF", text_color: "#7A2140", accent_color: "#FFFFFF" },
};

/** ألوان سريعة للاختيار بنقرة، والمشرف يقدر يختار أي لون آخر من منتقي الألوان. */
export const QUICK_SWATCHES = [
  "#0F4C81", "#0284C7", "#0A2540", "#F97316", "#EA580C", "#FB923C",
  "#16A34A", "#DC2626", "#7C3AED", "#DB2777", "#D4AF37", "#17130F",
  "#FFFFFF", "#F1F5F9", "#64748B", "#000000",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

/** يرجع اللون بصيغة #RRGGBB أو null إذا كان غير صالح. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (HEX.test(trimmed)) return trimmed.toUpperCase();
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(trimmed);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  return null;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** لون نص مقروء (أسود أو أبيض) فوق خلفية معيّنة، مثل نص الزر فوق لونه. */
export function readableTextOn(background: string): "#000000" | "#FFFFFF" {
  const hex = normalizeHex(background);
  if (!hex) return "#000000";
  return luminance(hex) > 0.4 ? "#000000" : "#FFFFFF";
}

/** يدمج ألوان البطاقة المحفوظة مع ألوان القالب لأي لون ناقص أو غير صالح. */
export function resolveCardColors(
  theme: OfferCardTheme,
  saved: Partial<Record<keyof OfferCardColors, string | null | undefined>>,
): OfferCardColors {
  const base = THEME_COLORS[theme];
  return {
    bg_color: normalizeHex(saved.bg_color) ?? base.bg_color,
    bg_color_2: normalizeHex(saved.bg_color_2) ?? base.bg_color_2,
    text_color: normalizeHex(saved.text_color) ?? base.text_color,
    accent_color: normalizeHex(saved.accent_color) ?? base.accent_color,
  };
}

/** رابط الصورة يجب أن يبدأ بـ https:// حتى لا تُعرض روابط غير آمنة. */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
