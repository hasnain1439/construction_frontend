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
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate, formatRelative } from "@/lib/dates";
import { useAppDispatch, useAppSelector, useMe } from "@/store/hooks";
import { setCurrentProject } from "@/store/slices/projectSlice";

const lines = (items: SiteDashboard["incoming"][number]["items"]) => items.map((i) => `${i.material.name} ${i.quantity} ${i.material.unit}`).join(" · ");

/**
 * The munshi's landing page (also open to PM / owner): today's hazri, material on the way,
 * own cash, to-dos and recent entries for one site — big buttons, phone-first, no rates.
 */
export function SiteDashboardView() {
  const t = useT();
  const te = useEnumT();
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
        title={t("dashboard.siteDashboard")}
        description={me ? t("dashboard.greeting", { name: me.user.name.split(" ")[0] }) : undefined}
        breadcrumbs={[{ label: t("dashboard.title") }]}
        actions={
          sites.length > 1 ? (
            <Select value={projectId} onValueChange={(id) => dispatch(setCurrentProject(id))}>
              <SelectTrigger className="min-w-56 rounded-full" aria-label={t("common.site")}>
                <SelectValue placeholder={t("dashboard.chooseSite")} />
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
          <EmptyState icon={HardHat} title={t("dashboard.noSiteYet")} description={t("dashboard.noSiteDesc")} />
        </SectionCard>
      ) : (
        <QueryState query={query}>
          {(d) => {
            const base = `/projects/${d.project.id}`;
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{d.project.name}</span> · <bdi>{d.project.code}</bdi> · <bdi>{formatDate(d.date)}</bdi>
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionCard title={<span className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary" aria-hidden />{t("dashboard.todaysAttendance")}</span>}>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-kpi font-semibold text-primary tabular">
                          {d.hazriToday.full + d.hazriToday.half}
                          <span className="text-base font-normal text-muted-foreground"> / {d.hazriToday.assigned} {t("dashboard.present")}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {te("workerType", "MISTRI")} {d.hazriToday.present.mistri} · {te("workerType", "MAZDOOR")} {d.hazriToday.present.mazdoor} · {t("common.other")} {d.hazriToday.present.other}
                          {d.hazriToday.unmarked ? ` · ${t("dashboard.notMarked", { n: d.hazriToday.unmarked })}` : ""}
                        </p>
                      </div>
                      <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href={`${base}/labor/hazri`}>
                          <ClipboardList data-icon="inline-start" />
                          {d.hazriToday.marked ? t("dashboard.updateAttendance") : t("dashboard.markAttendance")}
                        </Link>
                      </Button>
                    </div>
                  </SectionCard>

                  <SectionCard title={<span className="flex items-center gap-2"><Wallet className="size-4 text-primary" aria-hidden />{t("dashboard.myCash")}</span>}>
                    {d.myCash ? (
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-kpi font-semibold text-primary tabular">
                            <MoneyText paisa={d.myCash.balancePaisa} />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {d.myCash.pendingAckPaisa !== "0" ? <>{t("dashboard.notReceivedYet")} <MoneyText paisa={d.myCash.pendingAckPaisa} /> · </> : null}
                            {d.myCash.openTopup ? <>{t("dashboard.topupAsked")} <MoneyText paisa={d.myCash.openTopup.amountPaisa} /> {formatRelative(d.myCash.openTopup.requestedAt)}</> : t("dashboard.inHand")}
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          <Button asChild size="lg" variant="outline">
                            <Link href={`${base}/cash-book/kharcha`}>{t("dashboard.addExpense")}</Link>
                          </Button>
                          {!d.myCash.openTopup ? (
                            <Button size="lg" onClick={() => setTopupOpen(true)}>
                              <HandCoins data-icon="inline-start" />
                              {t("dashboard.requestTopup")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("dashboard.noSiteCash")}</p>
                    )}
                  </SectionCard>
                </div>

                <SectionCard title={<span className="flex items-center gap-2"><Truck className="size-4 text-primary" aria-hidden />{t("dashboard.materialOnTheWay")}</span>}>
                  {d.incoming.length ? (
                    <ul className="space-y-2" aria-label={t("dashboard.incomingMaterial")}>
                      {d.incoming.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                          <PackageOpen className="size-5 shrink-0 text-primary" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {i.number} <span className="font-normal text-muted-foreground">{t("dashboard.fromPlace", { from: i.from })}{i.vehicleNo ? ` · ${i.vehicleNo}` : ""}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">{lines(i.items)}</p>
                          </div>
                          <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href={i.actionUrl}>{t("dashboard.receive")}</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("dashboard.nothingOnTheWay")}</p>
                  )}
                </SectionCard>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionCard title={<span className="flex items-center gap-2"><ListTodo className="size-4 text-primary" aria-hidden />{t("dashboard.toDo")}</span>}>
                    {d.todo.length ? (
                      <ul className="space-y-2" aria-label={t("dashboard.toDo")}>
                        {d.todo.map((todo) => (
                          <li key={`${todo.type}:${todo.actionUrl}`}>
                            <Link href={todo.actionUrl} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted">
                              {todo.label}
                              <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="size-4" aria-hidden />
                        {t("dashboard.allDoneToday")}
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard title={t("dashboard.recentEntries")}>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("dashboard.materialUsed")}</p>
                        {d.recent.usage.length ? (
                          <ul className="space-y-1">
                            {d.recent.usage.map((u) => (
                              <li key={u.id}>
                                <span className="text-muted-foreground">{formatDate(u.date)}</span> — {lines(u.items)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">{t("dashboard.noUsageYet")}</p>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("dashboard.myExpenses")}</p>
                        {d.recent.myKharcha.length ? (
                          <ul className="space-y-1">
                            {d.recent.myKharcha.map((k) => (
                              <li key={k.id} className="flex justify-between gap-2">
                                <span className="truncate">
                                  <span className="text-muted-foreground">{formatDate(k.date)}</span> — {k.description}
                                  {k.status === "PENDING_APPROVAL" ? <span className="text-warning"> {t("dashboard.waitingApproval")}</span> : null}
                                </span>
                                <MoneyText paisa={k.amountPaisa} />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">{t("dashboard.noExpensesYet")}</p>
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
