import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove body padding (tables that run edge to edge). */
  flush?: boolean;
  id?: string;
}

/** White card with a 16px semibold title — the building block of every page. */
export function SectionCard({ title, description, actions, children, className, flush, id }: SectionCardProps) {
  return (
    <section id={id} className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            {title ? <h2 className="text-base font-semibold leading-6">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </section>
  );
}
