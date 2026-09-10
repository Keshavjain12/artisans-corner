export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'best-selling', label: 'Best selling' },
];

export const ORDER_STATUS_STEPS = ['processing', 'confirmed', 'shipped', 'delivered'];

export const STATUS_STYLES = {
  pending_payment: 'bg-amber-50 text-amber-700',
  processing: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-sky-50 text-sky-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-moss-100 text-moss-700',
  cancelled: 'bg-red-50 text-red-700',
  paid: 'bg-moss-100 text-moss-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-stone-100 text-stone-700',
  reversed: 'bg-stone-100 text-stone-700',
};

export const ANALYTICS_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

export const MAX_QTY_PER_LINE = 20;
