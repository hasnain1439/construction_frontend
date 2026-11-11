/**
 * Office staff on a monthly salary (accountant, office boy, driver …), their advances and salaries.
 * Hand-written from the API docs (staff.docs.ts). Every advance and net salary is also an office
 * expense under Salaries.
 */
import type { Id, IsoDate, IsoDateTime, Paisa } from "./common";
import type { FloatMethod } from "./labor";

/** "2026-11" */
export type YearMonth = string;

export interface StaffMember {
  id: Id;
  name: string;
  designation: string | null;
  phone: string | null;
  monthlySalaryPaisa: Paisa;
  joinedOn: IsoDate | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: IsoDateTime;
  /** Advance still to cut from salaries. */
  advanceDuePaisa: Paisa;
  /** Latest month paid (list only). */
  lastPaidMonth?: YearMonth | null;
}

export interface StaffAdvance {
  id: Id;
  date: IsoDate;
  amountPaisa: Paisa;
  paidVia: FloatMethod;
  companyAccountId: Id | null;
  note: string | null;
  officeExpenseId: Id;
  createdAt: IsoDateTime;
}

export interface SalaryPayment {
  id: Id;
  month: YearMonth;
  basicPaisa: Paisa;
  bonusPaisa: Paisa;
  deductionPaisa: Paisa;
  advanceCutPaisa: Paisa;
  netPaisa: Paisa;
  paidOn: IsoDate;
  paidVia: FloatMethod;
  companyAccountId: Id | null;
  note: string | null;
  /** null when the advance cut took the whole salary. */
  officeExpenseId: Id | null;
  createdAt: IsoDateTime;
}

export interface StaffDetail extends StaffMember {
  advances: StaffAdvance[];
  salaries: SalaryPayment[];
}

export interface StaffListMeta {
  activeCount: number;
  monthlyTotalPaisa: Paisa;
}

export interface StaffQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: "true" | "false" | "";
}

export interface SalarySheetRow {
  staff: { id: Id; name: string; designation: string | null; isActive: boolean };
  monthlySalaryPaisa: Paisa;
  advanceDuePaisa: Paisa;
  payment: SalaryPayment | null;
}

export interface SalarySheet {
  month: YearMonth;
  rows: SalarySheetRow[];
  totals: { staff: number; paid: number; salaryPaisa: Paisa; paidNetPaisa: Paisa; advanceCutPaisa: Paisa; unpaidPaisa: Paisa };
}

export interface StaffBody {
  name: string;
  designation?: string | null;
  phone?: string | null;
  monthlySalaryPaisa: Paisa;
  joinedOn?: IsoDate | null;
  bankName?: string | null;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  notes?: string | null;
}
export type StaffPatch = Partial<StaffBody> & { isActive?: boolean };

interface PaidFrom {
  paidVia: FloatMethod;
  companyAccountId?: Id;
  note?: string;
}
export interface StaffAdvanceBody extends PaidFrom {
  date: IsoDate;
  amountPaisa: Paisa;
}
export interface SalaryPaymentBody extends PaidFrom {
  month: YearMonth;
  basicPaisa?: Paisa;
  bonusPaisa?: Paisa;
  deductionPaisa?: Paisa;
  advanceCutPaisa?: Paisa;
  paidOn: IsoDate;
}
