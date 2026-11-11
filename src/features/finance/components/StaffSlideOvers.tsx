"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import {
  useCreateStaffMutation,
  useGetStaffAttendanceMonthQuery,
  useGetStaffDesignationsQuery,
  useGiveStaffAdvanceMutation,
  usePaySalaryMutation,
  useUpdateStaffMutation,
} from "@/api/services/staff.api";
import type { StaffMember } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { PhoneField } from "@/components/forms/PhoneInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { CompanyAccountField, useCompanyAccountCheck, type HowPaid } from "@/features/finance/components/CompanyAccountField";
import { PAID_VIA_VALUES } from "@/features/finance/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { formatPKR } from "@/lib/money";
import { optionalAnyPhoneSchema, requiredText } from "@/lib/validation";

const HOW_PAID: HowPaid = { name: "paidVia", CASH: "CASH", WALLET: "WALLET", BANK: "BANK" };

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || v.length >= min, msg("masterData.v.tooShort", { n: min }))
    .max(max, msg("validation.tooLongPlain"));

const money = (label: "cashSite.staff.monthlySalary" | "field.amount") =>
  z
    .string()
    .nullable()
    .refine((v): v is string => v !== null && Number(v) > 0, msg("validation.moreThanZero", { label }));

const optionalMoney = z.string().nullable();
const blankToNull = (v: string) => (v.trim() ? v.trim() : null);

// ─── Add / change a staff member ─────────────────────────────────────────────

export const staffSchema = z.object({
  name: requiredText("field.name", 2, 80),
  designationId: z.string().nullable(),
  phone: optionalAnyPhoneSchema,
  monthlySalaryPaisa: money("cashSite.staff.monthlySalary"),
  joinedOn: z.string(),
  bankName: text(2, 60),
  accountTitle: text(2, 80),
  accountNumber: text(4, 40),
  iban: text(4, 40),
  notes: text(1, 500),
  isActive: z.boolean(),
});
type StaffValues = z.input<typeof staffSchema>;

/** Add (staff = null) or change one staff member. Mount it only while open. */
export function StaffSlideOver({ staff, onClose }: { staff: StaffMember | null; onClose: () => void }) {
  const t = useT();
  const designations = useGetStaffDesignationsQuery();
  const designationOptions = (designations.data ?? []).map((d) => ({ value: d.id, label: d.name }));
  // A designation deleted later stays on the person until another one is picked.
  if (staff?.designationId && staff.designation && !designationOptions.some((o) => o.value === staff.designationId)) {
    designationOptions.push({ value: staff.designationId, label: staff.designation });
  }
  const [create, { isLoading: creating }] = useCreateStaffMutation();
  const [update, { isLoading: updating }] = useUpdateStaffMutation();
  const run = useMutationToast();
  const busy = creating || updating;
  const form = useForm<StaffValues, unknown, z.output<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: staff?.name ?? "",
      designationId: staff?.designationId ?? null,
      phone: staff?.phone ? formatPhone(staff.phone) : "",
      monthlySalaryPaisa: staff?.monthlySalaryPaisa ?? null,
      joinedOn: staff?.joinedOn ?? "",
      bankName: staff?.bankName ?? "",
      accountTitle: staff?.accountTitle ?? "",
      accountNumber: staff?.accountNumber ?? "",
      iban: staff?.iban ?? "",
      notes: staff?.notes ?? "",
      isActive: staff?.isActive ?? true,
    },
  });

  const onSubmit = async (v: z.output<typeof staffSchema>) => {
    const fields = {
      name: v.name,
      designationId: v.designationId,
      phone: v.phone ?? null,
      monthlySalaryPaisa: v.monthlySalaryPaisa,
      joinedOn: v.joinedOn || null,
      bankName: blankToNull(v.bankName),
      accountTitle: blankToNull(v.accountTitle),
      accountNumber: blankToNull(v.accountNumber),
      iban: blankToNull(v.iban),
      notes: blankToNull(v.notes),
    };
    const ok = staff
      ? await run(() => update({ id: staff.id, body: { ...fields, isActive: v.isActive } }).unwrap(), {
          setError: form.setError,
          success: t("cashSite.staff.saved", { name: v.name }),
        })
      : await run(
          () => create(Object.fromEntries(Object.entries(fields).filter(([, x]) => x !== null)) as typeof fields).unwrap(),
          { setError: form.setError, success: t("cashSite.staff.added", { name: v.name }) },
        );
    if (ok) onClose();
  };

  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={staff ? t("cashSite.staff.editTitle", { name: staff.name }) : t("cashSite.staff.add")}
      description={t("cashSite.staff.formDesc")}
      busy={busy}
      footer={<FormActions formId="staff-form" submitLabel={staff ? t("common.saveChanges") : t("cashSite.staff.add")} loading={busy} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="staff-form">
        <TextField name="name" label={t("field.name")} required />
        <FieldGrid>
          <SelectField
            name="designationId"
            label={t("cashSite.staff.designation")}
            options={designationOptions}
            disabled={designations.isLoading}
            placeholder={t("cashSite.staff.chooseDesignation")}
            hint={t("cashSite.staff.designationHint")}
          />
          <PhoneField name="phone" label={t("field.phone")} allowLandline />
        </FieldGrid>
        <FieldGrid>
          <MoneyField name="monthlySalaryPaisa" label={t("cashSite.staff.monthlySalary")} required />
          <DateField name="joinedOn" label={t("cashSite.staff.joinedOn")} max={todayPK()} />
        </FieldGrid>
        <FormSection title={t("cashSite.staff.accountSection")}>
          <FieldGrid>
            <TextField name="bankName" label={t("masterData.payee.bankName")} placeholder={t("masterData.payee.bankPlaceholder")} />
            <TextField name="accountTitle" label={t("masterData.payee.accountTitle")} />
          </FieldGrid>
          <FieldGrid>
            <TextField name="accountNumber" label={t("masterData.payee.accountNumber")} dir="ltr" />
            <TextField name="iban" label={t("cashSite.accounts.iban")} dir="ltr" />
          </FieldGrid>
        </FormSection>
        <TextareaField name="notes" label={t("field.notes")} rows={2} />
        {staff ? <ToggleField name="isActive" label={t("cashSite.staff.activeLabel")} description={t("cashSite.staff.activeHint")} /> : null}
      </Form>
    </SlideOver>
  );
}

// ─── Give an advance ─────────────────────────────────────────────────────────

const paidFields = {
  paidVia: z.enum(PAID_VIA_VALUES),
  groupId: z.string().nullable(),
  companyAccountId: z.string().nullable(),
  note: text(1, 300),
};

export const advanceSchema = z.object({ date: z.string().min(1, msg("validation.dateRequired")), amountPaisa: money("field.amount"), ...paidFields });
type AdvanceValues = z.input<typeof advanceSchema>;

export function StaffAdvanceSlideOver({ staff, onClose }: { staff: Pick<StaffMember, "id" | "name">; onClose: () => void }) {
  const t = useT();
  const [give, { isLoading }] = useGiveStaffAdvanceMutation();
  const run = useMutationToast();
  const form = useForm<AdvanceValues, unknown, z.output<typeof advanceSchema>>({
    resolver: zodResolver(advanceSchema),
    defaultValues: { date: todayPK(), amountPaisa: null, paidVia: "CASH", groupId: null, companyAccountId: null, note: "" },
  });
  const checkAccount = useCompanyAccountCheck(form);
  const onSubmit = async (v: z.output<typeof advanceSchema>) => {
    if (!checkAccount(v)) return;
    const ok = await run(
      () =>
        give({
          staffId: staff.id,
          body: {
            date: v.date,
            amountPaisa: v.amountPaisa,
            paidVia: v.paidVia,
            ...(v.companyAccountId ? { companyAccountId: v.companyAccountId } : {}),
            ...(v.note.trim() ? { note: v.note.trim() } : {}),
          },
        }).unwrap(),
      { setError: form.setError, codeFields: { FUTURE_DATE: "date" }, success: t("cashSite.staff.advanceGiven") },
    );
    if (ok) onClose();
  };
  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("cashSite.staff.advanceTitle", { name: staff.name })}
      description={t("cashSite.staff.advanceDesc")}
      busy={isLoading}
      footer={<FormActions formId="staff-advance-form" submitLabel={t("cashSite.staff.giveAdvance")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="staff-advance-form">
        <FieldGrid>
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
        </FieldGrid>
        <CompanyAccountField how={HOW_PAID} label={t("cashSite.accounts.paidFromGroup")} />
        <TextField name="note" label={t("cashSite.staff.note")} />
      </Form>
    </SlideOver>
  );
}

// ─── Pay a month's salary ────────────────────────────────────────────────────

export const salarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, msg("validation.required", { label: "cashSite.staff.month" })),
  basicPaisa: money("cashSite.staff.monthlySalary"),
  bonusPaisa: optionalMoney,
  deductionPaisa: optionalMoney,
  advanceCutPaisa: optionalMoney,
  paidOn: z.string().min(1, msg("validation.dateRequired")),
  ...paidFields,
});
type SalaryValues = z.input<typeof salarySchema>;

const ZERO = BigInt(0);
const big = (v: string | null | undefined) => BigInt(v && /^\d+$/.test(v) ? v : "0");

/** Net = salary + bonus − deduction − advance cut (empty cut = all the advance due, up to the salary). */
export function salaryNet(v: { basicPaisa: string | null; bonusPaisa: string | null; deductionPaisa: string | null; advanceCutPaisa: string | null }, advanceDuePaisa: string) {
  const before = big(v.basicPaisa) + big(v.bonusPaisa) - big(v.deductionPaisa);
  const due = big(advanceDuePaisa);
  const cut = v.advanceCutPaisa ? big(v.advanceCutPaisa) : due > ZERO && before > ZERO ? (due < before ? due : before) : ZERO;
  return before - cut;
}

export function SalarySlideOver({
  staff,
  month,
  onClose,
}: {
  staff: Pick<StaffMember, "id" | "name" | "monthlySalaryPaisa" | "advanceDuePaisa">;
  month?: string;
  onClose: () => void;
}) {
  const t = useT();
  const [pay, { isLoading }] = usePaySalaryMutation();
  const run = useMutationToast();
  const form = useForm<SalaryValues, unknown, z.output<typeof salarySchema>>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      month: month ?? todayPK().slice(0, 7),
      basicPaisa: staff.monthlySalaryPaisa,
      bonusPaisa: null,
      deductionPaisa: null,
      advanceCutPaisa: null,
      paidOn: todayPK(),
      paidVia: "CASH",
      groupId: null,
      companyAccountId: null,
      note: "",
    },
  });
  const values = useWatch({ control: form.control }) as SalaryValues;
  const net = salaryNet(
    { basicPaisa: values.basicPaisa ?? null, bonusPaisa: values.bonusPaisa ?? null, deductionPaisa: values.deductionPaisa ?? null, advanceCutPaisa: values.advanceCutPaisa ?? null },
    staff.advanceDuePaisa,
  );
  const monthOk = /^\d{4}-\d{2}$/.test(values.month ?? "");
  const attendance = useGetStaffAttendanceMonthQuery({ month: values.month ?? "", staffId: staff.id }, { skip: !monthOk });
  const counts = attendance.data?.rows[0]?.totals;
  const suggested = counts ? suggestedDeduction(values.basicPaisa ?? null, counts.absent, counts.halfDay, attendance.data!.daysInMonth) : null;
  const checkAccount = useCompanyAccountCheck(form);
  const onSubmit = async (v: z.output<typeof salarySchema>) => {
    if (!checkAccount(v)) return;
    const ok = await run(
      () =>
        pay({
          staffId: staff.id,
          body: {
            month: v.month,
            ...(v.basicPaisa !== staff.monthlySalaryPaisa ? { basicPaisa: v.basicPaisa } : {}),
            ...(v.bonusPaisa ? { bonusPaisa: v.bonusPaisa } : {}),
            ...(v.deductionPaisa ? { deductionPaisa: v.deductionPaisa } : {}),
            ...(v.advanceCutPaisa !== null ? { advanceCutPaisa: v.advanceCutPaisa } : {}),
            paidOn: v.paidOn,
            paidVia: v.paidVia,
            ...(v.companyAccountId ? { companyAccountId: v.companyAccountId } : {}),
            ...(v.note.trim() ? { note: v.note.trim() } : {}),
          },
        }).unwrap(),
      {
        setError: form.setError,
        codeFields: { FUTURE_DATE: "paidOn", FUTURE_MONTH: "month", SALARY_ALREADY_PAID: "month", ADVANCE_CUT_TOO_HIGH: "advanceCutPaisa", NET_BELOW_ZERO: "deductionPaisa" },
        success: t("cashSite.staff.salaryPaid"),
      },
    );
    if (ok) onClose();
  };
  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("cashSite.staff.payTitle", { name: staff.name })}
      description={t("cashSite.staff.payDesc")}
      busy={isLoading}
      footer={<FormActions formId="salary-form" submitLabel={t("cashSite.staff.paySalary")} loading={isLoading} disabled={net < ZERO} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="salary-form">
        <FieldGrid>
          <TextField name="month" type="month" label={t("cashSite.staff.month")} required />
          <DateField name="paidOn" label={t("cashSite.staff.paidOn")} required max={todayPK()} />
        </FieldGrid>
        <FieldGrid>
          <MoneyField name="basicPaisa" label={t("cashSite.staff.basic")} hint={t("cashSite.staff.basicHint")} required />
          <MoneyField name="bonusPaisa" label={t("cashSite.staff.bonus")} />
        </FieldGrid>
        <FieldGrid>
          <MoneyField name="deductionPaisa" label={t("cashSite.staff.deduction")} hint={t("cashSite.staff.deductionHint")} />
          <MoneyField name="advanceCutPaisa" label={t("cashSite.staff.advanceCut")} hint={t("cashSite.staff.advanceCutHint", { amount: formatPKR(staff.advanceDuePaisa) })} />
        </FieldGrid>
        {counts && (counts.absent || counts.halfDay || counts.leave) ? (
          <InlineAlert
            tone="warning"
            action={
              suggested && suggested !== "0" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => form.setValue("deductionPaisa", suggested, { shouldDirty: true })}>
                  {t("cashSite.staff.useSuggestion")}
                </Button>
              ) : undefined
            }
          >
            {t("cashSite.staff.attendanceLine", { absent: counts.absent, half: counts.halfDay, leave: counts.leave })}
            {suggested && suggested !== "0" ? ` ${t("cashSite.staff.suggestDeduction", { amount: formatPKR(suggested) })}` : ""}
          </InlineAlert>
        ) : null}
        <InlineAlert tone={net < ZERO ? "danger" : "info"}>{t("cashSite.staff.netLine", { amount: formatPKR(net.toString()) })}</InlineAlert>
        <CompanyAccountField how={HOW_PAID} label={t("cashSite.accounts.paidFromGroup")} />
        <TextField name="note" label={t("cashSite.staff.note")} />
      </Form>
    </SlideOver>
  );
}

/**
 * Suggested cut for absences: (absent days + half days ÷ 2) × salary ÷ days in the month, in whole
 * rupees. Leave is paid, so it is not cut. Only a suggestion: the user decides.
 */
export function suggestedDeduction(basicPaisa: string | null, absent: number, halfDays: number, daysInMonth: number) {
  if (!basicPaisa || !/^\d+$/.test(basicPaisa) || !daysInMonth) return null;
  const halves = BigInt(absent * 2 + halfDays);
  const paisa = (BigInt(basicPaisa) * halves) / BigInt(daysInMonth * 2);
  return ((paisa / BigInt(100)) * BigInt(100)).toString();
}
