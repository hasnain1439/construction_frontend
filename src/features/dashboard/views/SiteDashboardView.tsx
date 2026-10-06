"use client";

import { CalendarCheck, CheckCircle2, ClipboardList, HandCoins, HardHat, ListTodo, PackageOpen, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetSiteDashboardQuery } from "@/api/services/dashboard.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import type { SiteDashboard } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyText } from "@/components/common/MoneyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopupRequestSlideOver } from "@/features/cashbook/components/CashSlideOvers";
import { formatDate, formatRelative } from "@/lib/dates";
import { useAppDispatch, useAppSelector, useMe } from "@/store/hooks";
import { setCurrentProject } from "@/store/slices/projectSlice";

const lines = (items: SiteDashboard["incoming"][number]["items"]) => items.map((i) => `${i.material.name} ${i.quantity} ${i.material.unit}`).join(" · ");

/**
 * The munshi's landing page (also open to PM / owner): today's hazri, material on the way,
 * own cash, to-dos and recent entries for one site — big buttons, phone-first, no rates.
 */
export function SiteDashboardView() {
  const me = useMe();
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.project.currentProjectId);
  const projects = useGetProjectsQuery({ limit: 100 });
  const sites = (projects.data?.items ?? []).filter((p) => p.status === "ACTIVE" || p.status === "CLOSEOUT");
  const projectId = sites.some((p) => p.id === current) ? current! : sites[0]?.id;
  const query = useGetSiteDashboardQuery(projectId ?? "", { skip: !projectId, refetchOnMountOrArgChange: true });
  const [topupOpen, setTopupOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Site dashboard"
        description={me ? `Assalam-o-Alaikum, ${me.user.name.split(" ")[0]}.` : undefined}
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          sites.length > 1 ? (
            <Select value={projectId} onValueChange={(id) => dispatch(setCurrentProject(id))}>
              <SelectTrigger className="min-w-56 rounded-full" aria-label="Site">
                <SelectValue placeholder="Choose site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />
      {!projects.isLoading && !sites.length ? (
        <SectionCard>
          <EmptyState icon={HardHat} title="No site yet" description="The office adds you to a project — it shows up here." />
        </SectionCard>
      ) : (
        <QueryState query={query}>
          {(d) => {
            const base = `/projects/${d.project.id}`;
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{d.project.name}</span> · {d.project.code} · {formatDate(d.date)}
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionCard title={<span className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary" aria-hidden />Today’s hazri</span>}>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-kpi font-semibold text-primary tabular">
                          {d.hazriToday.full + d.hazriToday.half}
                          <span className="text-base font-normal text-muted-foreground"> / {d.hazriToday.assigned} present</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Mistri {d.hazriToday.present.mistri} · Mazdoor {d.hazriToday.present.mazdoor} · Other {d.hazriToday.present.other}
                          {d.hazriToday.unmarked ? ` · ${d.hazriToday.unmarked} not marked` : ""}
                        </p>
                      </div>
                      <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href={`${base}/labor/hazri`}>
                          <ClipboardList data-icon="inline-start" />
                          {d.hazriToday.marked ? "Update hazri" : "Mark hazri"}
                        </Link>
                      </Button>
                    </div>
                  </SectionCard>

                  <SectionCard title={<span className="flex items-center gap-2"><Wallet className="size-4 text-primary" aria-hidden />My cash</span>}>
                    {d.myCash ? (
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-kpi font-semibold text-primary tabular">
                            <MoneyText paisa={d.myCash.balancePaisa} />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {d.myCash.pendingAckPaisa !== "0" ? <>Not received yet <MoneyText paisa={d.myCash.pendingAckPaisa} /> · </> : null}
                            {d.myCash.openTopup ? <>Top-up asked <MoneyText paisa={d.myCash.openTopup.amountPaisa} /> {formatRelative(d.myCash.openTopup.requestedAt)}</> : "In hand"}
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          <Button asChild size="lg" variant="outline">
                            <Link href={`${base}/cash-book/kharcha`}>Add kharcha</Link>
                          </Button>
                          {!d.myCash.openTopup ? (
                            <Button size="lg" onClick={() => setTopupOpen(true)}>
                              <HandCoins data-icon="inline-start" />
                              Request top-up
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">You hold no site cash — the office sends a float first.</p>
                    )}
                  </SectionCard>
                </div>

                <SectionCard title={<span className="flex items-center gap-2"><Truck className="size-4 text-primary" aria-hidden />Material on the way</span>}>
                  {d.incoming.length ? (
                    <ul className="space-y-2" aria-label="Incoming material">
                      {d.incoming.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                          <PackageOpen className="size-5 shrink-0 text-primary" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {i.number} <span className="font-normal text-muted-foreground">from {i.from}{i.vehicleNo ? ` · ${i.vehicleNo}` : ""}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">{lines(i.items)}</p>
                          </div>
                          <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href={i.actionUrl}>Receive</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing on the way.</p>
                  )}
                </SectionCard>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionCard title={<span className="flex items-center gap-2"><ListTodo className="size-4 text-primary" aria-hidden />To do</span>}>
                    {d.todo.length ? (
                      <ul className="space-y-2" aria-label="To do">
                        {d.todo.map((t) => (
                          <li key={`${t.type}:${t.actionUrl}`}>
                            <Link href={t.actionUrl} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted">
                              {t.label}
                              <span aria-hidden>→</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="size-4" aria-hidden />
                        All done for today.
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard title="Recent entries">
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Material used</p>
                        {d.recent.usage.length ? (
                          <ul className="space-y-1">
                            {d.recent.usage.map((u) => (
                              <li key={u.id}>
                                <span className="text-muted-foreground">{formatDate(u.date)}</span> — {lines(u.items)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">No usage logged yet.</p>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">My kharcha</p>
                        {d.recent.myKharcha.length ? (
                          <ul className="space-y-1">
                            {d.recent.myKharcha.map((k) => (
                              <li key={k.id} className="flex justify-between gap-2">
                                <span className="truncate">
                                  <span className="text-muted-foreground">{formatDate(k.date)}</span> — {k.description}
                                  {k.status === "PENDING_APPROVAL" ? <span className="text-warning"> (waiting approval)</span> : null}
                                </span>
                                <MoneyText paisa={k.amountPaisa} />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">No kharcha yet.</p>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </div>
              </div>
            );
          }}
        </QueryState>
      )}
      {topupOpen ? <TopupRequestSlideOver open onOpenChange={setTopupOpen} /> : null}
    </>
  );
}
