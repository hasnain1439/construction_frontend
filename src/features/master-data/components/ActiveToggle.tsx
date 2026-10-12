"use client";

import { Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import type { RowAction } from "@/components/common/RowActions";
import { Button } from "@/components/ui/button";

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
  /** Translated button / dialog texts (English by default). */
  labels?: { activate: string; deactivate: string; title: string };
}) {
  const [confirm, setConfirm] = useState(false);
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
          {labels?.deactivate ?? "Deactivate"}
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
          {labels?.activate ?? "Activate"}
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={labels?.title ?? `Deactivate ${name}?`}
        description={consequence}
        confirmLabel={labels?.deactivate ?? "Deactivate"}
        loading={loading}
        onConfirm={async () => {
          await onToggle(false);
          setConfirm(false);
        }}
      />
    </>
  );
}

/** The same Activate / Deactivate (with confirm) as a `RowActions` menu item. */
export function activeToggleAction({
  name,
  isActive,
  onToggle,
  loading,
  consequence,
  labels,
}: {
  name: string;
  isActive: boolean;
  onToggle: (active: boolean) => Promise<unknown>;
  loading?: boolean;
  consequence: string;
  labels?: { activate: string; deactivate: string; title: string };
}): RowAction {
  if (!isActive) {
    return { label: labels?.activate ?? "Activate", icon: Power, disabled: loading, onSelect: () => void onToggle(true) };
  }
  return {
    label: labels?.deactivate ?? "Deactivate",
    icon: PowerOff,
    destructive: true,
    confirm: {
      title: labels?.title ?? `Deactivate ${name}?`,
      description: consequence,
      confirmLabel: labels?.deactivate ?? "Deactivate",
      loading,
      onConfirm: async () => {
        await onToggle(false);
      },
    },
  };
}
