"use client";

import { Gauge } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/useT";
import { isThekedar } from "@/lib/permissions";
import { useAppDispatch, useAppSelector, useMe } from "@/store/hooks";
import { hidePlanLimit } from "@/store/slices/uiSlice";

const RESOURCE_LABEL: Record<string, string> = {
  activeProjects: "active projects",
  officeUsers: "office users",
};

/** Opens automatically on any 402 PLAN_LIMIT_REACHED (see store/errorListener). */
export function PlanLimitDialog() {
  const t = useT();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useMe();
  const info = useAppSelector((state) => state.ui.planLimit);
  const close = () => dispatch(hidePlanLimit());
  const resource = info?.resource ? (RESOURCE_LABEL[info.resource] ?? info.resource) : null;

  return (
    <Dialog open={Boolean(info)} onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-xl bg-warning-soft text-warning">
            <Gauge className="size-6" aria-hidden />
          </span>
          <DialogTitle className="text-base font-semibold">{t("shell.planLimitTitle")}</DialogTitle>
          <DialogDescription>
            {resource && typeof info?.limit === "number"
              ? `Your plan allows ${info.limit} ${resource} and you are using ${info.used ?? info.limit}. `
              : ""}
            {t("shell.planLimitBody")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t("shell.notNow")}
          </Button>
          {isThekedar(me) ? (
            <Button
              onClick={() => {
                close();
                router.push("/settings/subscription");
              }}
            >
              {t("shell.upgradePlan")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
