"use client";

import type { ReactNode } from "react";
import { CardsSkeleton } from "./TableSkeleton";
import { ErrorState } from "./ErrorState";
import { SectionCard } from "./SectionCard";

/**
 * Loading / error / data for one RTK Query result. Pages render `children(data)` only
 * once data exists.
 */
export function QueryState<T>({
  query,
  skeleton,
  children,
}: {
  query: { data?: T; isLoading: boolean; error?: unknown; refetch?: () => unknown };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const { data, isLoading, error, refetch } = query;
  if (data !== undefined) return <>{children(data)}</>;
  if (isLoading || !error) return <>{skeleton ?? <CardsSkeleton count={2} height="h-48" />}</>;
  return (
    <SectionCard>
      <ErrorState error={error} onRetry={refetch ? () => void refetch() : undefined} />
    </SectionCard>
  );
}
