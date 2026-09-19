/*
 * Naira, formatted for reading.
 *
 * Amounts travel from the API as decimal strings and are only ever turned into
 * a number here, at the moment of display. Nothing in this app does arithmetic
 * on money -- the server does that, in decimals -- so a float can never creep
 * into a total.
 */
export function naira(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;

  if (!Number.isFinite(value)) return "₦0";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
