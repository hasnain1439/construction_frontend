import { Building2, CalendarCheck, CircleCheck, HardHat, Wallet } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import building from "@/assets/login-building.jpg";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const POINTS = [
  { icon: HardHat, text: "Projects, rooms and contracts in one place" },
  { icon: Wallet, text: "Money in PKR with lakh / crore — paisa-exact" },
  { icon: CalendarCheck, text: "Your team on site with the Munshi app" },
];

/** Split layout for public screens: product pitch on the left, the form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-charcoal p-10 text-white lg:flex">
        {/* Building photo (Unsplash licence), slowly drifting; next/image serves it as AVIF/WebP at the panel's size. */}
        <Image
          src={building}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 48vw, 1px"
          placeholder="blur"
          className="-z-20 animate-ken-burns object-cover will-change-transform motion-reduce:animate-none"
        />
        {/* Charcoal wash so the text stays readable, with a touch of sun at the bottom. */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-charcoal/85 via-charcoal/45 to-charcoal/90"
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <Building2 className="size-6" aria-hidden />
          </span>
          <span className="text-lg font-semibold">Construction Platform</span>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl leading-tight font-semibold">Run every site from one screen.</h2>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-base text-white/90">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/80">
          <CircleCheck className="size-4" aria-hidden />
          14-day free trial · 1 project · no card needed
        </p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-96 rounded-full bg-sun/15 blur-3xl" aria-hidden />
      </aside>
      <main className="flex flex-col">
        <div className="flex items-center justify-end gap-2 p-4">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">{children}</div>
      </main>
    </div>
  );
}

/** White card holding a public form. */
export function AuthCard({
  title,
  description,
  children,
  footer,
  icon,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        {icon}
        <h1 className="text-page-title font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-card">{children}</div>
      {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
