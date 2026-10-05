"use client";

import { createContext, useContext, useEffect } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { ProjectDetail } from "@/api/types";

export const WIZARD_FORM_ID = "project-wizard-form";

export interface WizardContextValue {
  projectId: string | null;
  project: ProjectDetail | null;
  /** Sections can't change (closeout / handed over / closed / read-only). */
  locked: boolean;
  /** Tabs call this after a successful save; the shell moves on or stays (draft). */
  onSaved: (project?: ProjectDetail) => void;
  /** Tabs report their form state so the shell can warn and show progress. */
  setFormState: (state: { dirty: boolean; submitting: boolean }) => void;
  goTo: (tab: number) => void;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside the project wizard");
  return ctx;
}

/** Mirrors a tab form's dirty / submitting flags into the wizard shell. */
export function useReportForm<T extends FieldValues, C, O extends FieldValues>(form: UseFormReturn<T, C, O>) {
  const { setFormState } = useWizard();
  const { isDirty, isSubmitting } = form.formState;
  useEffect(() => {
    setFormState({ dirty: isDirty, submitting: isSubmitting });
  }, [isDirty, isSubmitting, setFormState]);
  useEffect(() => () => setFormState({ dirty: false, submitting: false }), [setFormState]);
}
