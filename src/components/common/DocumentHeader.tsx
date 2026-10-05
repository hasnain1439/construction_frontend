import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DocumentMeta {
  label: string;
  value: ReactNode;
}

/**
 * Top of a document page (purchase, gate pass, order, count): number, status, the party
 * (supplier / from → to), dates and other facts, plus actions. Locked documents say so.
 */
export function DocumentHeader({
  number,
  title,
  status,
  party,
  meta,
  actions,
  locked,
  className,
}: {
  number: string;
  /** e.g. "Purchase", "Gate pass" */
  title: string;
  status?: ReactNode;
  party?: ReactNode;
  meta?: DocumentMeta[];
  actions?: ReactNode;
  /** Saved documents can't be edited — fixes go through returns / corrections. */
  locked?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tabular">{number}</h2>
            {status}
            {locked ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Saved documents are locked. Use a return or a correction to fix them.">
                <Lock className="size-3.5" aria-hidden />
                Locked
              </span>
            ) : null}
          </div>
          {party ? <div className="text-sm text-muted-foreground">{party}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta?.length ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {meta.map((m) => (
            <div key={m.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{m.label}</dt>
              <dd className="truncate text-sm font-medium">{m.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
