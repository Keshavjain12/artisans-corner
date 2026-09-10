import { Minus, Plus } from 'lucide-react';
import { MAX_QTY_PER_LINE } from '../utils/constants.js';

export function QuantityStepper({ value, max = MAX_QTY_PER_LINE, onChange, label = 'Quantity' }) {
  const ceiling = Math.min(max || MAX_QTY_PER_LINE, MAX_QTY_PER_LINE);

  return (
    <div className="inline-flex items-center rounded-xl border border-sand bg-white">
      <button
        type="button"
        className="p-2.5 text-ink-muted transition-colors hover:text-clay-700 disabled:opacity-40"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        className="w-12 border-0 bg-transparent p-0 text-center text-sm font-medium text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={1}
        max={ceiling}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <button
        type="button"
        className="p-2.5 text-ink-muted transition-colors hover:text-clay-700 disabled:opacity-40"
        onClick={() => onChange(value + 1)}
        disabled={value >= ceiling}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default QuantityStepper;
