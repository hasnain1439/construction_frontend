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

/** Soft rounded card with a 17px semibold title and controls on the right — the building block of every page. */
export function SectionCard({ title, description, actions, children, className, flush, id }: SectionCardProps) {
  return (
    <section id={id} className={cn("min-w-0 rounded-3xl border glass text-card-foreground shadow-card", className)}>
      {title || actions ? (
        <header className={cn("flex flex-wrap items-start justify-between gap-3 px-6 pt-5", flush ? "pb-4" : "pb-1")}>
          <div className="min-w-0 space-y-0.5">
            {title ? <h2 className="text-[17px] font-semibold leading-6">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? cn("overflow-hidden rounded-b-3xl", !(title || actions) && "rounded-t-3xl") : title || actions ? "px-6 pt-4 pb-6" : "p-6"}>{children}</div>
    </section>
  );
}
