"use client";

import { Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";

/** Activate (instant) / Deactivate (with confirm) for suppliers, workers and sub-contractors. */
export function ActiveToggle({
  name,
  isActive,
  onToggle,
  loading,
  consequence,
  size = "sm",
}: {
  name: string;
  isActive: boolean;
  onToggle: (active: boolean) => Promise<unknown>;
  loading?: boolean;
  consequence: string;
  size?: "sm" | "default";
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
          Deactivate
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
          Activate
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Deactivate ${name}?`}
        description={consequence}
        confirmLabel="Deactivate"
        loading={loading}
        onConfirm={async () => {
          await onToggle(false);
          setConfirm(false);
        }}
      />
    </>
  );
}
