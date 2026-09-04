/**
 * All marketplace money maths lives here so commission, order totals and the
 * Stripe amount can never drift apart. Amounts are stored in major units
 * (dollars) rounded to 2 decimals; Stripe is charged in minor units (cents).
 */

export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const toMinorUnits = (amount) => Math.round(round2(amount) * 100);

export const fromMinorUnits = (amount) => round2(Number(amount) / 100);

/**
 * Splits a line subtotal into platform commission and vendor payout.
 * The payout absorbs the rounding remainder so fee + payout === subtotal.
 */
export function splitCommission(subtotal, commissionRate) {
  const gross = round2(subtotal);
  const platformFee = round2(gross * commissionRate);
  const vendorEarnings = round2(gross - platformFee);
  return { platformFee, vendorEarnings };
}

export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value);
}
