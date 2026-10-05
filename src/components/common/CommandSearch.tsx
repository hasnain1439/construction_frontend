"use client";

import { CornerDownLeft, History } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/common/StatusBadge";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { ADMIN_NAV, COMPANY_NAV, PROJECT_NAV, projectHref, type NavMode } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { useAppDispatch, useAppSelector, useMe } from "@/store/hooks";
import { setCommandOpen } from "@/store/slices/uiSlice";

const RECENT_KEY = "cw.recentPages";

interface Entry {
  href: string;
  label: string;
  group: string;
  available: boolean;
  keywords: string[];
}

function readRecent(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function pushRecent(href: string) {
  try {
    const next = [href, ...readRecent().filter((h) => h !== href)].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — recents are a convenience only.
  }
}

/** Ctrl+K "Search menu…" — every page the user may open, plus recent pages. */
export function CommandSearch({ mode }: { mode: NavMode }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useMe();
  const open = useAppSelector((state) => state.ui.commandOpen);
  const params = useParams<{ projectId?: string }>();

  const setOpen = useCallback((value: boolean) => dispatch(setCommandOpen(value)), [dispatch]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Re-read recents each time the palette opens (they live in localStorage).
  const recent = useMemo(() => (open ? readRecent() : []), [open]);

  const entries = useMemo<Entry[]>(() => {
    if (mode === "admin") {
      return ADMIN_NAV.map((item) => ({
        href: item.href,
        label: pickLabel(item.label, language),
        group: t("shell.platformConsole"),
        available: item.available,
        keywords: item.keywords ?? [],
      }));
    }
    const list: Entry[] = [];
    if (mode === "project" && params.projectId) {
      for (const section of PROJECT_NAV) {
        if (!canAccess(me, section.access)) continue;
        for (const item of section.items) {
          if (!canAccess(me, item.access)) continue;
          list.push({
            href: projectHref(params.projectId, item.href),
            label: pickLabel(item.label, language),
            group: pickLabel(section.label, language),
            available: item.available,
            keywords: item.keywords ?? [],
          });
        }
      }
    }
    for (const section of COMPANY_NAV) {
      for (const item of section.items) {
        if (!canAccess(me, item.access)) continue;
        list.push({
          href: item.href,
          label: pickLabel(item.label, language),
          group: pickLabel(section.label, language),
          available: item.available,
          keywords: item.keywords ?? [],
        });
      }
    }
    return list;
  }, [mode, me, language, params.projectId, t]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) map.set(entry.group, [...(map.get(entry.group) ?? []), entry]);
    return [...map.entries()];
  }, [entries]);

  const recentEntries = recent
    .map((href) => entries.find((e) => e.href === href))
    .filter((e): e is Entry => Boolean(e));

  const go = (href: string) => {
    pushRecent(href);
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t("shell.searchMenu")} description={t("shell.searchMenu")}>
      <CommandInput placeholder={t("shell.searchMenu")} />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
        {recentEntries.length ? (
          <>
            <CommandGroup heading="Recent">
              {recentEntries.map((entry) => (
                <CommandItem key={`recent-${entry.href}`} value={`recent ${entry.label} ${entry.group}`} onSelect={() => go(entry.href)}>
                  <History className="text-muted-foreground" aria-hidden />
                  <span>{entry.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{entry.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}
        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((entry) => (
              <CommandItem
                key={entry.href}
                value={`${entry.label} ${entry.group} ${entry.keywords.join(" ")}`}
                onSelect={() => go(entry.href)}
              >
                <CornerDownLeft className="text-muted-foreground" aria-hidden />
                <span>{entry.label}</span>
                {!entry.available ? <StatusBadge tone="neutral" label="Soon" className="ml-auto h-5" /> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
