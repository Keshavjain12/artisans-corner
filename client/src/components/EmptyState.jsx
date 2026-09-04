import cn from '../utils/cn.js';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-clay-200 bg-clay-50/40 px-6 py-14 text-center',
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-clay-500 shadow-card">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
