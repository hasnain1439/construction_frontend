"use client";

import { Power, PowerOff } from "lucide-react";
import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import type { RowAction } from "@/components/common/RowActions";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

/** Activate (instant) / Deactivate (with confirm) for suppliers, workers and sub-contractors. */
export function ActiveToggle({
  name,
  isActive,
  onToggle,
  loading,
  consequence,
  size = "sm",
  labels,
}: {
  name: string;
  isActive: boolean;
  onToggle: (active: boolean) => Promise<unknown>;
  loading?: boolean;
  consequence: string;
  size?: "sm" | "default";
  /** Button / dialog texts; the shared Activate / Deactivate texts by default. */
  labels?: { activate: string; deactivate: string; title: string };
}) {
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const text = labels ?? { activate: t("action.activate"), deactivate: t("action.deactivate"), title: t("masterData.common.deactivateTitle", { name }) };
  return (
    <>
      {isActive ? (
        <Button
          variant="ghost"
          size={size}
          className="text-danger"
          onClick={(e) => {
            e.stopPropagation();
            setConfirm(true);
          }}
        >
          <PowerOff data-icon="inline-start" />
          {text.deactivate}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size={size}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            void onToggle(true);
          }}
        >
          <Power data-icon="inline-start" />
          {text.activate}
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={text.title}
        description={consequence}
        confirmLabel={text.deactivate}
        loading={loading}
        onConfirm={async () => {
          await onToggle(false);
          setConfirm(false);
        }}
      />
    </>
  );
}

/** The same Activate / Deactivate (with confirm) as a `RowActions` menu item (`labels` from `useActiveToggleLabels`). */
export function activeToggleAction({
  isActive,
  onToggle,
  loading,
  consequence,
  labels,
}: {
  name?: string;
  isActive: boolean;
  onToggle: (active: boolean) => Promise<unknown>;
  loading?: boolean;
  consequence: string;
  labels: { activate: string; deactivate: string; title: string };
}): RowAction {
  if (!isActive) {
    return { label: labels.activate, icon: Power, disabled: loading, onSelect: () => void onToggle(true) };
  }
  return {
    label: labels.deactivate,
    icon: PowerOff,
    destructive: true,
    confirm: {
      title: labels.title,
      description: consequence,
      confirmLabel: labels.deactivate,
      loading,
      onConfirm: async () => {
        await onToggle(false);
      },
    },
  };
}

/** Shared Activate / Deactivate texts for `activeToggleAction`: `labels(name)`. */
export function useActiveToggleLabels() {
  const t = useT();
  return useCallback(
    (name: string) => ({ activate: t("action.activate"), deactivate: t("action.deactivate"), title: t("masterData.common.deactivateTitle", { name }) }),
    [t],
  );
}
