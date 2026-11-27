export type PaymentMethodDefinition = {
  key: string;
  aliases: readonly string[];
};

function normalizePaymentMethodText(value: string): string {
  return value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createPaymentMethodNormalizer(
  methods: readonly PaymentMethodDefinition[],
): (raw: unknown) => string | null {
  const aliases = methods
    .flatMap((method, methodIndex) =>
      [method.key, ...method.aliases].map((alias) => ({
        key: method.key,
        alias: normalizePaymentMethodText(alias),
        methodIndex,
      })),
    )
    .filter((entry) => entry.alias.length > 0)
    .sort((a, b) => b.alias.length - a.alias.length || a.methodIndex - b.methodIndex);

  return (raw) => {
    if (typeof raw !== "string") return null;
    const value = normalizePaymentMethodText(raw);
    if (!value) return null;

    const exact = aliases.find((entry) => entry.alias === value);
    if (exact) return exact.key;

    const paddedValue = ` ${value} `;
    return (
      aliases.find((entry) => {
        const isLatinAlias = /^[a-z0-9 ]+$/i.test(entry.alias);
        return isLatinAlias
          ? paddedValue.includes(` ${entry.alias} `)
          : value.includes(entry.alias);
      })?.key ?? null
    );
  };
}

export function getPaymentMethodName(payment: Record<string, unknown>): string {
  for (const field of ["payment_method", "wallet", "method"]) {
    const value = payment[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
