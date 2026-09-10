import { Check, Clock, PackageCheck, Truck, XCircle } from 'lucide-react';
import { ORDER_STATUS_STEPS } from '../utils/constants.js';
import { formatDateTime } from '../utils/format.js';
import cn from '../utils/cn.js';

const ICONS = {
  processing: Clock,
  confirmed: Check,
  shipped: Truck,
  delivered: PackageCheck,
};

const LABELS = {
  processing: 'Processing',
  confirmed: 'Confirmed by the maker',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

/** Horizontal progress rail for an order, or a clear cancelled state. */
export function OrderTimeline({ status, history = [] }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3.5 text-sm text-red-700">
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          This order was cancelled
          {history.length > 0 && ` on ${formatDateTime(history[history.length - 1].at)}`}.
        </span>
      </div>
    );
  }

  const currentIndex = Math.max(0, ORDER_STATUS_STEPS.indexOf(status));

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {ORDER_STATUS_STEPS.map((step, index) => {
        const Icon = ICONS[step];
        const reached = index <= currentIndex;
        const entry = [...history].reverse().find((item) => item.status === step);

        return (
          <li key={step} className="flex flex-col items-center text-center">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                reached ? 'bg-clay-600 text-white' : 'bg-sand text-ink-soft'
              )}
              aria-current={index === currentIndex ? 'step' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span
              className={cn(
                'mt-2 text-xs leading-tight',
                reached ? 'font-medium text-ink' : 'text-ink-soft'
              )}
            >
              {LABELS[step]}
            </span>
            {entry && <span className="mt-0.5 text-[11px] text-ink-soft">{formatDateTime(entry.at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default OrderTimeline;
