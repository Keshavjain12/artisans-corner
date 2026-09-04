import cn from '../utils/cn.js';

export function StatCard({ label, value, hint, icon: Icon, tone = 'clay', className }) {
  const tones = {
    clay: 'bg-clay-50 text-clay-700',
    moss: 'bg-moss-100 text-moss-700',
    sand: 'bg-sand text-ink-muted',
  };

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
        {Icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', tones[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2.5 font-display text-2xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export default StatCard;
