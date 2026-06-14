/** Common buyer shipping destinations (ISO 3166-1 alpha-2). */
export const SHIPPING_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "SG", label: "Singapore" },
  { code: "HK", label: "Hong Kong" },
  { code: "TW", label: "Taiwan" },
  { code: "KR", label: "South Korea" },
  { code: "NZ", label: "New Zealand" },
  { code: "IE", label: "Ireland" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "DK", label: "Denmark" },
  { code: "NO", label: "Norway" },
  { code: "FI", label: "Finland" },
  { code: "PT", label: "Portugal" },
  { code: "MX", label: "Mexico" },
  { code: "BR", label: "Brazil" },
  { code: "IN", label: "India" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "IL", label: "Israel" },
  { code: "JP", label: "Japan" },
] as const;

export type ShippingCountryCode = (typeof SHIPPING_COUNTRIES)[number]["code"];

const COUNTRY_CODES = new Set<string>(
  SHIPPING_COUNTRIES.map((c) => c.code),
);

export function isShippingCountryCode(code: string): code is ShippingCountryCode {
  return COUNTRY_CODES.has(code);
}

export function shippingCountryLabel(code: string | null | undefined): string {
  if (!code) return "Not set";
  const match = SHIPPING_COUNTRIES.find((c) => c.code === code);
  return match ? `${match.label} (${code})` : code;
}
