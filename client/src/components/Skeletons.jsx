export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white">
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-4 w-1/4 rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card space-y-3 p-5">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-7 w-32 rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="card divide-y divide-sand overflow-hidden">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, colIndex) => (
            <div key={colIndex} className="skeleton h-4 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LineSkeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton rounded ${className}`} />;
}
