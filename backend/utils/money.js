export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const toMinorUnits = (amount) => Math.round(round2(amount) * 100);

export const fromMinorUnits = (amount) => round2(Number(amount) / 100);

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
