/**
 * Tax (Phase 2 · Step 18): company tax settings, the tax override of a project, WHT certificate.
 * Responses are documented by example in the OpenAPI file, so their shapes are written here once
 * (PHASE_2_3_CONTRACTS.md → Step 18 — Tax). Tax is OFF by default.
 */
import type { Id, RequestBody } from "./common";

export type TaxAuthority = "PRA" | "SRB" | "KPRA" | "ICT";
export type ProjectTaxMode = "INHERIT" | "ON" | "OFF";

export interface TaxAuthorityInfo {
  code: TaxAuthority;
  name: string;
  defaultRatePercent: number;
  defaultLabel: string;
}

export interface TaxSettings {
  enabled: boolean;
  authority: TaxAuthority | null;
  ratePercent: number;
  label: string | null;
  effectiveLabel: string | null;
  ntn: string | null;
  strn: string | null;
  whtDefaultRatePercent: number;
  authorities: TaxAuthorityInfo[];
  adviserNote: string;
}

export interface ProjectTax {
  projectId: Id;
  mode: ProjectTaxMode;
  /** Project overrides (null = the company value). */
  authority: TaxAuthority | null;
  ratePercent: number | null;
  effective: { taxOn: boolean; applies: boolean; authority: TaxAuthority | null; ratePercent: number; label: string | null; source: "COMPANY" | "PROJECT" | "OFF" };
  company: { enabled: boolean; authority: TaxAuthority | null; ratePercent: number; whtDefaultRatePercent: number };
}

export type TaxSettingsBody = RequestBody<"/api/v1/tax/settings", "patch">;
export type ProjectTaxBody = RequestBody<"/api/v1/projects/{id}/tax", "patch">;
export type WhtCertificateBody = RequestBody<"/api/v1/payments/{id}/wht-certificate", "patch">;
