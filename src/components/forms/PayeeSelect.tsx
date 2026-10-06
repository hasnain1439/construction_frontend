"use client";

import { useGetProjectWorkersQuery, useGetSubcontractsQuery } from "@/api/services/labor.api";
import { SegmentedControl } from "@/components/common/SegmentedControl";
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
  const workers = useGetProjectWorkersQuery({ projectId, active: true });
  const subs = useGetSubcontractsQuery({ projectId, active: true }, { skip: !allowSubcontractor });
  const options =
    value.payeeType === "WORKER"
      ? (workers.data ?? []).map((w) => ({ value: w.worker.id, label: w.worker.name, description: `${w.worker.type.replace(/_/g, " ").toLowerCase()} · ${formatPKR(w.dailyRatePaisa)}/day` }))
      : (subs.data ?? []).map((s) => ({ value: s.id, label: s.subcontractor.name, description: s.scope }));
  return (
    <div className="space-y-2">
      {allowSubcontractor ? (
        <SegmentedControl<PayeeType>
          ariaLabel="Paid to"
          size="sm"
          value={value.payeeType}
          onChange={(payeeType) => onChange({ payeeType, id: null })}
          options={[
            { value: "WORKER", label: "Worker" },
            { value: "SUBCONTRACTOR", label: "Sub-contractor" },
          ]}
        />
      ) : null}
      <Combobox
        ariaLabel={value.payeeType === "WORKER" ? "Worker" : "Sub-contract"}
        value={value.id}
        onChange={(id) => onChange({ ...value, id: (id as string | null) ?? null })}
        options={options}
        loading={workers.isLoading || subs.isLoading}
        placeholder={value.payeeType === "WORKER" ? "Choose a worker on this site" : "Choose a sub-contract"}
        emptyText={value.payeeType === "WORKER" ? "No workers on this site yet" : "No sub-contracts on this site"}
        invalid={invalid}
      />
    </div>
  );
}
