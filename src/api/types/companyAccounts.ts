/**
 * Company accounts: where the company receives money. The company makes its own payment groups
 * (Bank, Cash, Online …) and its own accounts in each. Hand-written from the API docs
 * (companyAccounts.docs.ts), like the other modules in this folder.
 */
import type { Id, IsoDateTime, Paisa } from "./common";

/** How a group behaves: which details its accounts need, and the payment method it records. */
export type CompanyAccountType = "CASH" | "WALLET" | "BANK";

export interface CompanyAccountGroup {
  id: Id;
  name: string;
  type: CompanyAccountType;
  accountCount: number;
  /** Its accounts added up; null for who only picks an account. */
  balancePaisa: Paisa | null;
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
  /** Null for who only picks an account (they see the last digits of the number too). */
  balancePaisa: Paisa | null;
  openingBalancePaisa: Paisa | null;
  /** Movements, the opening balance left out. */
  paymentCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** One movement on a statement: + money in, − money out, and the balance after it. */
export interface CompanyAccountEntry {
  id: Id;
  type: string;
  amountPaisa: Paisa;
  description: string;
  refId: Id | null;
  projectId: Id | null;
  occurredAt: IsoDateTime;
  balancePaisa: Paisa;
}

export interface CompanyAccountsQuery {
  groupId?: Id;
  active?: boolean;
}

/** In a BANK or WALLET group it needs `accountTitle` and `accountNumber`. */
export interface CompanyAccountBody {
  groupId: Id;
  name: string;
  openingBalancePaisa?: Paisa;
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
  openingBalancePaisa?: Paisa;
}
