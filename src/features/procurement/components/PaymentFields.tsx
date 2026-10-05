"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { FieldGrid } from "@/components/forms/Form";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import type { PaymentMode } from "@/api/types";
import { PAID_FROM_OPTIONS, PAYMENT_MODE_OPTIONS } from "../options";

/** Udhaar / Cash now / Part now, the amount paid now and where it came from. */
export function PaymentFields({ disabled }: { disabled?: boolean }) {
  const { control } = useFormContext();
  const mode = useWatch({ control, name: "paymentMode" }) as PaymentMode;
  return (
    <div className="space-y-4">
      <SegmentedField<PaymentMode> name="paymentMode" label="Payment" options={PAYMENT_MODE_OPTIONS} disabled={disabled} />
      {mode !== "UDHAAR" ? (
        <FieldGrid>
          {mode === "PARTIAL" ? <MoneyField name="paidNowPaisa" label="Paid now" required /> : null}
          <SelectField name="paidFrom" label="Paid from" required options={PAID_FROM_OPTIONS} disabled={disabled} />
        </FieldGrid>
      ) : (
        <p className="text-sm text-muted-foreground">The whole bill goes to this supplier&apos;s udhaar (khata).</p>
      )}
    </div>
  );
}
