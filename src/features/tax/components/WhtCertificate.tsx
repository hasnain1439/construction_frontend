"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useSetWhtCertificateMutation } from "@/api/services/tax.api";
import type { ClientPayment } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { whtCertificateSchema, type WhtCertificateValues } from "../schemas";

/** Payments → WHT certificate: the client's withholding certificate arrives weeks after the payment. */
export function WhtCertificateSlideOver({ payment, onClose }: { payment: ClientPayment; onClose: () => void }) {
  const t = useT();
  const [save, { isLoading }] = useSetWhtCertificateMutation();
  const run = useMutationToast();
  const current = payment.whtCertificate;
  const form = useForm<WhtCertificateValues, unknown, z.output<typeof whtCertificateSchema>>({
    resolver: zodResolver(whtCertificateSchema),
    defaultValues: { certificateNo: current?.number ?? "", certificateDate: current?.date ?? "", file: null },
  });
  const onSubmit = async (v: z.output<typeof whtCertificateSchema>) => {
    const ok = await run(
      () =>
        save({
          id: payment.id,
          body: { certificateNo: v.certificateNo, ...(v.certificateDate ? { certificateDate: v.certificateDate } : {}), ...(v.file ? { attachmentId: v.file.id } : {}) },
        }).unwrap(),
      { success: t("tax.payment.certificateSaved"), setError: form.setError, codeFields: { FUTURE_DATE: "certificateDate", INVALID_ATTACHMENT: "file" } },
    );
    if (ok) onClose();
  };
  const remove = async () => {
    const ok = await run(() => save({ id: payment.id, body: { certificateNo: null } }).unwrap(), { success: t("tax.payment.certificateRemoved") });
    if (ok) onClose();
  };
  return (
    <SlideOver
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t("tax.payment.certificateTitle", { number: payment.number })}
      description={t("tax.payment.certificateDesc", { amount: formatPKR(payment.whtDeductedPaisa) })}
      busy={isLoading}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {current ? (
            <Button variant="destructive-soft" size="sm" onClick={() => void remove()} disabled={isLoading}>
              {t("tax.payment.removeCertificate")}
            </Button>
          ) : (
            <span />
          )}
          <FormActions formId="wht-certificate-form" submitLabel={t("common.save")} loading={isLoading} onCancel={onClose} />
        </div>
      }
    >
      <Form form={form} onSubmit={onSubmit} id="wht-certificate-form">
        <FieldGrid>
          <TextField name="certificateNo" label={t("tax.payment.certNo")} required maxLength={40} />
          <DateField name="certificateDate" label={t("tax.payment.certDate")} max={todayPK()} />
        </FieldGrid>
        <AttachmentField name="file" label={t("tax.payment.certFile")} kind="DOCUMENT" />
      </Form>
    </SlideOver>
  );
}
