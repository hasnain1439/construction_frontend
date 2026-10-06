import type { AgeingAmount } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";

const BUCKET_COLOR: Record<string, string> = { "0-15": "var(--age-1)", "16-30": "var(--age-2)", "31-60": "var(--age-3)", "60+": "var(--age-4)" };
const bucketLabel = (b: string) => `${b} days`;

/**
 * Outstanding split by age (0–15 / 16–30 / 31–60 / 60+ days): one stacked bar, older =
 * darker (one hue), 2px gaps between parts, and the amounts written out underneath.
 */
export function AgeingBar({ ageing, compact, className }: { ageing: AgeingAmount[]; compact?: boolean; className?: string }) {
  const values = ageing.map((a) => ({ ...a, n: Number(toPaisaBigInt(a.amountPaisa) ?? BigInt(0)) }));
  const total = values.reduce((s, v) => s + v.n, 0);
  const summary = values.map((v) => `${bucketLabel(v.bucket)} ${formatPKR(v.amountPaisa)}`).join(", ");
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={total ? `Ageing: ${summary}` : "Nothing outstanding"}>
        {values
          .filter((v) => v.n > 0)
          .map((v) => (
            <span key={v.bucket} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(v.n / total) * 100}%`, background: BUCKET_COLOR[v.bucket] }} title={`${bucketLabel(v.bucket)}: ${formatPKR(v.amountPaisa)}`} />
          ))}
      </div>
      {!compact ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {values.map((v) => (
            <li key={v.bucket} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ background: BUCKET_COLOR[v.bucket] }} aria-hidden />
              {bucketLabel(v.bucket)}
              <span className="font-medium text-foreground tabular">{formatPKRShort(v.amountPaisa)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
