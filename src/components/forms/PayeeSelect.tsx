"use client";

import { useGetProjectWorkersQuery, useGetSubcontractsQuery } from "@/api/services/labor.api";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { useT } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { Combobox } from "./ComboboxField";

export type PayeeType = "WORKER" | "SUBCONTRACTOR";
export interface PayeeValue {
  payeeType: PayeeType;
  /** workerId (WORKER) or assignmentId (SUBCONTRACTOR) */
  id: string | null;
}

/** Who gets the peshgi: a worker on the project or one of its sub-contracts. */
export function PayeeSelect({
  projectId,
  value,
  onChange,
  allowSubcontractor = true,
  invalid,
}: {
  projectId: string;
  value: PayeeValue;
  onChange: (value: PayeeValue) => void;
  allowSubcontractor?: boolean;
  invalid?: boolean;
}) {
  const t = useT();
  const workers = useGetProjectWorkersQuery({ projectId, active: true });
  const subs = useGetSubcontractsQuery({ projectId, active: true }, { skip: !allowSubcontractor });
  const options =
    value.payeeType === "WORKER"
      ? (workers.data ?? []).map((w) => ({ value: w.worker.id, label: w.worker.name, description: t("app.components.payee.workerDesc", { type: w.worker.type.replace(/_/g, " ").toLowerCase(), rate: formatPKR(w.dailyRatePaisa) }) }))
      : (subs.data ?? []).map((s) => ({ value: s.id, label: s.subcontractor.name, description: s.scope }));
  return (
    <div className="space-y-2">
      {allowSubcontractor ? (
        <SegmentedControl<PayeeType>
          ariaLabel={t("app.components.payee.paidTo")}
          size="sm"
          value={value.payeeType}
          onChange={(payeeType) => onChange({ payeeType, id: null })}
          options={[
            { value: "WORKER", label: t("field.worker") },
            { value: "SUBCONTRACTOR", label: t("field.subcontractor") },
          ]}
        />
      ) : null}
      <Combobox
        ariaLabel={value.payeeType === "WORKER" ? t("field.worker") : t("app.components.payee.subContract")}
        value={value.id}
        onChange={(id) => onChange({ ...value, id: (id as string | null) ?? null })}
        options={options}
        loading={workers.isLoading || subs.isLoading}
        placeholder={value.payeeType === "WORKER" ? t("app.components.payee.chooseWorker") : t("app.components.payee.chooseSub")}
        emptyText={value.payeeType === "WORKER" ? t("app.components.payee.noWorkers") : t("app.components.payee.noSubs")}
        invalid={invalid}
      />
    </div>
  );
}
