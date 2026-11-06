"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import type { PaymentMode } from "@/api/types";
import { CompanyAccountField, type HowPaid } from "@/features/finance/components/CompanyAccountField";
import { useT } from "@/i18n/useT";
import { usePaymentModeOptions } from "../options";

const HOW_PAID: HowPaid = { name: "paidFrom", CASH: "OFFICE_CASH", WALLET: "WALLET", BANK: "BANK", cheque: "CHEQUE", siteCash: "SITE_CASH" };

/** Udhaar / Cash now / Part now, the amount paid now and where it came from. */
export function PaymentFields({ disabled }: { disabled?: boolean }) {
  const t = useT();
  const modeOptions = usePaymentModeOptions();
  const { control } = useFormContext();
  const mode = useWatch({ control, name: "paymentMode" }) as PaymentMode;
  return (
    <div className="space-y-4">
      <SegmentedField<PaymentMode> name="paymentMode" label={t("field.payment")} options={modeOptions} disabled={disabled} />
      {mode !== "UDHAAR" ? (
        <>
          {mode === "PARTIAL" ? <MoneyField name="paidNowPaisa" label={t("procurement.common.paidNow")} required /> : null}
          <CompanyAccountField how={HOW_PAID} label={t("cashSite.accounts.paidFromGroup")} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("procurement.payment.allUdhaar")}</p>
      )}
    </div>
  );
}
