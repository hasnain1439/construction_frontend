import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0]?.slice(0, 2) ?? "?");
  return letters.toUpperCase();
}

/** Avatar (photo or initials) + name + optional second line. */
export function AvatarName({
  name,
  subtitle,
  photoUrl,
  size = "md",
  className,
}: {
  name: string;
  subtitle?: ReactNode;
  photoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Avatar className={size === "sm" ? "size-7" : "size-9"}>
        {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
        <AvatarFallback className="bg-sun-soft text-xs font-semibold text-foreground">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
