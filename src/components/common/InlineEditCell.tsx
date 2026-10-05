"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A table cell you click to edit. Enter / blur commits, Esc cancels. `dirty` highlights
 * an unsaved change (batch editing, e.g. Price List "Save changes").
 */
export function InlineEditCell({
  value,
  display,
  onCommit,
  ariaLabel,
  placeholder,
  inputMode = "text",
  prefix,
  dirty,
  disabled,
  validate,
  className,
  align = "left",
}: {
  value: string;
  display?: ReactNode;
  onCommit: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  prefix?: string;
  dirty?: boolean;
  disabled?: boolean;
  /** Return an error message to block the commit. */
  validate?: (value: string) => string | null;
  className?: string;
  align?: "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = () => {
    if (disabled) return;
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    const problem = validate?.(draft) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };

  if (editing) {
    return (
      <div className={cn("relative", className)}>
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        ) : null}
        <input
          ref={inputRef}
          value={draft}
          inputMode={inputMode}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error) || undefined}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
              setError(null);
            }
          }}
          className={cn(
            "h-8 w-full min-w-24 rounded-md border border-ring bg-card px-2 text-sm ring-3 ring-ring/30 outline-none",
            prefix && "pl-7",
            align === "right" && "text-right",
            error && "border-destructive ring-destructive/20",
          )}
        />
        {error ? <p className="absolute top-full left-0 z-10 mt-1 rounded bg-popover px-2 py-1 text-xs text-destructive shadow">{error}</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      aria-label={`${ariaLabel}: ${value || "empty"}. Click to edit`}
      className={cn(
        "group/cell flex h-8 w-full min-w-24 items-center gap-1.5 rounded-md border border-transparent px-2 text-sm transition-colors",
        !disabled && "hover:border-border hover:bg-muted/50",
        dirty && "border-amber/60 bg-amber-soft",
        align === "right" && "justify-end text-right",
        className,
      )}
    >
      <span className={cn("truncate", !value && "text-muted-foreground")}>{display ?? (value || placeholder || "—")}</span>
      {!disabled ? <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/cell:opacity-100" aria-hidden /> : null}
    </button>
  );
}
