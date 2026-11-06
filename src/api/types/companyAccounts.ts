/**
 * Company accounts: where the company receives money, in three fixed groups. Hand-written from the
 * API docs (companyAccounts.docs.ts), like the other modules in this folder.
 */
import type { Id, IsoDateTime } from "./common";

export type CompanyAccountType = "CASH" | "WALLET" | "BANK";

export interface CompanyAccount {
  id: Id;
  type: CompanyAccountType;
  name: string;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  branch: string | null;
  note: string | null;
  /** Off: not on the payment form; its payments stay. */
  isActive: boolean;
  paymentCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CompanyAccountsQuery {
  type?: CompanyAccountType;
  active?: boolean;
}

/** WALLET and BANK need `accountTitle` and `accountNumber`. */
export interface CompanyAccountBody {
  type: CompanyAccountType;
  name: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
  branch?: string;
  note?: string;
}

/** Any subset; null clears an optional field. The group cannot change. */
export interface CompanyAccountPatch {
  name?: string;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  branch?: string | null;
  note?: string | null;
  isActive?: boolean;
}
