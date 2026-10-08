"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Debounce before `onChange` fires (ms). */
  debounceMs?: number;
  className?: string;
  "aria-label"?: string;
}

/** Search box with a magnifier, clear button and debounced change. */
export function SearchInput({ value, onChange, placeholder, debounceMs = 300, className, ...rest }: SearchInputProps) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const onChangeRef = useRef(onChange);

  // Follow external resets (e.g. "Clear filters") — adjust state during render.
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChangeRef.current(draft), debounceMs);
    return () => clearTimeout(timer);
  }, [draft, value, debounceMs]);

  return (
    <div className={cn("relative min-w-48 flex-1", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder ?? t("common.searchPlaceholder")}
        aria-label={rest["aria-label"] ?? placeholder ?? t("common.search")}
        className="rounded-full border-transparent bg-muted pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("common.clear")}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
