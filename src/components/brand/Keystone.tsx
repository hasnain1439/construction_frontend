import { cn } from "@/lib/cn";

/**
 * Keystone brand: the mark and the "Keystone" wordmark.
 *
 * The three marks below are the owner's master SVGs (src/assets/brand/*.svg, copies of brand/ —
 * tests/unit/components/Keystone.test.tsx checks they still match) inlined so they follow the
 * theme without a network request. Never redraw them here: change the SVG files and copy the
 * paths. The brand name is never translated; the wordmark stays Latin (dir="ltr") in Urdu.
 */
export const BRAND_NAME = "Keystone";

type MarkVariant = "light" | "dark" | "small";

/** Height ÷ width of each mark's viewBox. */
const RATIO: Record<MarkVariant, number> = { light: 1, dark: 1, small: 56 / 48 };

function MarkSvg({
  variant,
  height,
  className,
}: {
  variant: MarkVariant;
  height: number;
  className?: string;
}) {
  const width = Math.round((height / RATIO[variant]) * 100) / 100;
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    width,
    height,
    className,
    "aria-hidden": true,
    focusable: false,
  } as const;
  if (variant === "small") {
    return (
      <svg {...common} viewBox="8 2 48 56">
        <path d="M12 56V30a20 20 0 0 1 40 0v26H40V31a8 8 0 0 0-16 0v25z" fill="#201F1E" />
        <path
          d="M26.2 4.5h11.6l-2.3 13.5h-7z"
          fill="#FFCF68"
          stroke="#201F1E"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const dark = variant === "dark";
  return (
    <svg {...common} viewBox="0 0 64 64">
      <path d="M12 54V30a20 20 0 0 1 40 0v24H41V31a9 9 0 0 0-18 0v23z" fill={dark ? "#B5A18B" : "#201F1E"} />
      <path
        d="M26.2 4.5h11.6l-2.3 13.5h-7z"
        fill="#FFCF68"
        stroke="#201F1E"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <rect x="9" y="56" width="46" height="3.2" rx="1.6" fill={dark ? "#E4E0E0" : "#B5A18B"} />
    </svg>
  );
}

export interface KeystoneMarkProps {
  /** Height in px. At 32 px or less the light mark is the small one (no base bar). */
  size?: number;
  /**
   * "auto" (default): light mark, and the dark-variant mark in dark mode.
   * "dark": always the dark variant (for charcoal surfaces).
   */
  tone?: "auto" | "dark";
  className?: string;
  /** Accessible name; omit when the wordmark sits next to it. */
  label?: string;
}

export function KeystoneMark({ size = 32, tone = "auto", className, label }: KeystoneMarkProps) {
  const lightVariant: MarkVariant = size <= 32 ? "small" : "light";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-brand-mark=""
    >
      {tone === "dark" ? (
        <MarkSvg variant="dark" height={size} />
      ) : (
        <>
          <MarkSvg variant={lightVariant} height={size} className="dark:hidden" />
          <MarkSvg variant="dark" height={size} className="hidden dark:block" />
        </>
      )}
    </span>
  );
}

/** "Keystone" in Cabin 700, −0.5px tracking. Always Latin and left-to-right. */
export function KeystoneWordmark({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      lang="en"
      translate="no"
      className={cn(
        "font-[family-name:var(--font-cabin)] leading-none font-bold tracking-[-0.5px]",
        className,
      )}
    >
      {BRAND_NAME}
    </span>
  );
}

/** Mark + wordmark. The lockup itself never mirrors (dir="ltr"); the row around it does in Urdu. */
export function KeystoneLogo({
  size = 32,
  tone = "auto",
  className,
  wordmarkClassName,
}: {
  size?: number;
  tone?: "auto" | "dark";
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2", className)} data-brand-logo="">
      <KeystoneMark size={size} tone={tone} />
      <KeystoneWordmark className={wordmarkClassName} />
    </span>
  );
}
