/** Store links that the admin can change and customers see in the store boxes. */
export const DEFAULT_STORE_LINKS: Record<string, string> = {
  aliexpress: "https://ar.aliexpress.com",
};

/**
 * Cleans an admin-entered store link. Adds https:// when missing and
 * returns null for anything that is not a safe https web address.
 */
export function normalizeStoreUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed) || trimmed.length > 2000) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
