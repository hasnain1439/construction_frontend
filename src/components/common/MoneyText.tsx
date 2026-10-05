import { cn } from "@/lib/cn";
import { formatPKR, formatPKRShort, type PaisaInput } from "@/lib/money";
import { HiddenForRole } from "./HiddenForRole";

/**
 * Renders paisa as rupees. `undefined` means the API omitted the field for this role →
 * "Hidden for your role"; `null` means there is no value yet → "—".
 */
export function MoneyText({
  paisa,
  short,
  className,
}: {
  paisa: PaisaInput | undefined;
  short?: boolean;
  className?: string;
}) {
  if (paisa === undefined) return <HiddenForRole compact={short} />;
  const text = short ? formatPKRShort(paisa) : formatPKR(paisa);
  return (
    <span className={cn("tabular whitespace-nowrap", className)} title={short ? formatPKR(paisa) : undefined}>
      {text}
    </span>
  );
}
