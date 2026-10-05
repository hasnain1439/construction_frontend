import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shaped like a table. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading">
      <div className="flex gap-4 border-b px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b px-4 py-4 last:border-b-0">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 flex-[1.5]" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Loading placeholder for card grids / detail pages. */
export function CardsSkeleton({ count = 3, height = "h-28" }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`${height} rounded-xl`} />
      ))}
    </div>
  );
}
