/**
 * Company accounts: where the company receives money. The company makes its own payment groups
 * (Bank, Cash, Online …) and its own accounts in each. Hand-written from the API docs
 * (companyAccounts.docs.ts), like the other modules in this folder.
 */
import type { Id, IsoDateTime } from "./common";

/** How a group behaves: which details its accounts need, and the payment method it records. */
export type CompanyAccountType = "CASH" | "WALLET" | "BANK";

export interface CompanyAccountGroup {
  id: Id;
  name: string;
  type: CompanyAccountType;
  accountCount: number;
}

export interface CompanyAccount {
  id: Id;
  group: { id: Id; name: string; type: CompanyAccountType };
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
  groupId?: Id;
  active?: boolean;
}

/** In a BANK or WALLET group it needs `accountTitle` and `accountNumber`. */
export interface CompanyAccountBody {
  groupId: Id;
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
