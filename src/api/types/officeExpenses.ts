/**
 * Office expenses: company running costs not tied to a project (rent, bills, salaries …), each in
 * one of the company's own office expense categories. Hand-written from the API docs
 * (officeExpenses.docs.ts) — the generated schema is not refreshed for this module.
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa } from "./common";
import type { FloatMethod } from "./labor";

/** A company-managed category (Rent, Salaries …), A–Z; deleted ones are left out of the list. */
export interface OfficeExpenseCategory {
  id: Id;
  name: string;
  expenseCount: number;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
  updatedBy: NamedRef | null;
  updatedAt: IsoDateTime;
}

export interface OfficeExpense {
  id: Id;
  date: IsoDate;
  /** Still shows the name of a category that was deleted later. */
  category: NamedRef;
  amountPaisa: Paisa;
  paidVia: FloatMethod;
  companyAccountId: Id | null;
  paidTo: string | null;
  description: string;
  attachmentId: Id | null;
  /** Paid from Staff & salaries: changed / deleted there only. */
  fromStaff?: "ADVANCE" | "SALARY" | null;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
  updatedBy: NamedRef | null;
  updatedAt: IsoDateTime;
}

/** Extra `meta` of the list: total and per-category totals over every match (largest first). */
export interface OfficeExpensesMeta {
  totalPaisa: Paisa;
  byCategory: Array<{ categoryId: Id; name: string; totalPaisa: Paisa }>;
}

export interface OfficeExpensesQuery {
  page?: number;
  limit?: number;
  from?: IsoDate;
  to?: IsoDate;
  categoryId?: Id | "";
  paidVia?: FloatMethod | "";
  search?: string;
}

export interface OfficeExpenseBody {
  date: IsoDate;
  categoryId: Id;
  amountPaisa: Paisa;
  paidVia: FloatMethod;
  companyAccountId?: Id;
  paidTo?: string;
  description: string;
  attachmentId?: Id;
}

/** Any subset; `paidTo` / `attachmentId` null clears them. */
export interface OfficeExpensePatch {
  date?: IsoDate;
  categoryId?: Id;
  amountPaisa?: Paisa;
  paidVia?: FloatMethod;
  companyAccountId?: Id | null;
  paidTo?: string | null;
  description?: string;
  attachmentId?: Id | null;
}
