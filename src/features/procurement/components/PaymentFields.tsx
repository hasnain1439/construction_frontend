"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { FieldGrid } from "@/components/forms/Form";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import type { PaymentMode } from "@/api/types";
import { useT } from "@/i18n/useT";
import { usePaidFromOptions, usePaymentModeOptions } from "../options";

/** Udhaar / Cash now / Part now, the amount paid now and where it came from. */
export function PaymentFields({ disabled }: { disabled?: boolean }) {
  const t = useT();
  const modeOptions = usePaymentModeOptions();
  const paidFromOptions = usePaidFromOptions();
  const { control } = useFormContext();
  const mode = useWatch({ control, name: "paymentMode" }) as PaymentMode;
  return (
    <div className="space-y-4">
      <SegmentedField<PaymentMode> name="paymentMode" label={t("field.payment")} options={modeOptions} disabled={disabled} />
      {mode !== "UDHAAR" ? (
        <FieldGrid>
          {mode === "PARTIAL" ? <MoneyField name="paidNowPaisa" label={t("procurement.common.paidNow")} required /> : null}
          <SelectField name="paidFrom" label={t("field.paidFrom")} required options={paidFromOptions} disabled={disabled} />
        </FieldGrid>
      ) : (
        <p className="text-sm text-muted-foreground">{t("procurement.payment.allUdhaar")}</p>
      )}
    </div>
  );
}
