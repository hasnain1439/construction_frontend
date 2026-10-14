"use client";

import { Building2, Check, ChevronsUpDown, FolderKanban, LogOut, MapPin, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import type { TenantRow } from "@/api/types/admin";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { REGION_LABEL } from "@/lib/options";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

function CompanyAvatar({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold",
        size === "md" ? "size-12 rounded-xl text-base" : "size-8 rounded-lg text-xs",
        name ? "bg-sand text-charcoal" : "bg-muted text-muted-foreground",
      )}
    >
      {name ? initials(name) : <Building2 className={size === "md" ? "size-5" : "size-4"} />}
    </span>
  );
}

const projectsText = (t: TenantRow) => {
  const { used, limit } = t.usage.activeProjects;
  return limit == null ? `${used} active projects` : `${used}/${limit} active projects`;
};

/**
 * The super admin's company switcher: the open company as a card (initials, status, plan,
 * owner, region, usage) and a searchable list of every company. Exit leaves the company.
 */
export function CompanyPicker({
  companies,
  loading,
  selected,
  projectName,
  onChoose,
  onExit,
}: {
  companies: TenantRow[];
  loading: boolean;
  selected: TenantRow | undefined;
  projectName?: string;
  onChoose: (tenantId: string) => void;
  onExit: () => void;
}) {
  const [open, setOpen] = useState(false);

  const switcher = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selected ? "outline" : "default"}
          role="combobox"
          aria-expanded={open}
          aria-label="Company"
          className="justify-between gap-2 sm:min-w-52"
        >
          <span className="truncate">{selected ? "Switch company" : "Choose a company"}</span>
          <ChevronsUpDown className="size-4 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search by company, owner or phone…" />
          <CommandList className="max-h-80">
            <CommandEmpty>{loading ? "Loading companies…" : "No company matches."}</CommandEmpty>
            <CommandGroup heading={`${companies.length} companies`}>
              {companies.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.name} ${t.owner?.name ?? ""} ${t.owner?.phone ?? ""} ${t.slug}`}
                  onSelect={() => {
                    onChoose(t.id);
                    setOpen(false);
                  }}
                  className="gap-3 py-2"
                >
                  <CompanyAvatar name={t.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[t.owner?.name, REGION_LABEL[t.region], t.plan?.name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <StatusBadge domain="tenant" value={t.tenantStatus} />
                  <Check className={cn("size-4 shrink-0", selected?.id === t.id ? "opacity-100" : "opacity-0")} aria-hidden />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <section aria-label="Company" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {loading && !selected ? <Skeleton className="size-12 rounded-xl" /> : <CompanyAvatar name={selected?.name} />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {selected ? "Viewing company" : "Company data"}
            </p>
            {selected ? (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="truncate text-lg font-semibold">{selected.name}</h2>
                  <StatusBadge domain="tenant" value={selected.tenantStatus} />
                  {selected.plan ? (
                    <span className="rounded-full bg-sun/30 px-2 py-0.5 text-xs font-medium text-foreground">{selected.plan.name}</span>
                  ) : null}
                  {projectName ? <span className="truncate text-sm text-muted-foreground">/ {projectName}</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {selected.owner ? (
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" aria-hidden />
                      {selected.owner.name}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {REGION_LABEL[selected.region] ?? selected.region}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FolderKanban className="size-3.5" aria-hidden />
                    {projectsText(selected)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Choose a company to open</h2>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading companies…" : `${companies.length} companies — search by name, owner or phone.`}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {switcher}
          {selected ? (
            <Button variant="ghost" onClick={onExit} title="Exit this company" aria-label="Exit this company">
              <LogOut data-icon="inline-start" />
              Exit
            </Button>
          ) : null}
        </div>
      </div>
      {selected ? (
        <p className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-chart-1" aria-hidden />
          Full access — you can view, add, edit and delete as the owner would. Every change is logged in the company&apos;s audit log.
        </p>
      ) : null}
    </section>
  );
}
