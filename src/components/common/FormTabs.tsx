"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/useT";

/** Inactive tabs stay mounted (form fields keep their state and errors), just hidden. */
export const TAB_CONTENT_CLASS = "space-y-5 data-[state=inactive]:hidden";

export interface FormTab {
  value: string;
  label: string;
  /** Shows a red dot: this tab holds validation errors. */
  error?: boolean;
}

/** Tab strip of a multi-tab form (e.g. Details | Roles); a tab with errors gets a dot. */
export function FormTabsList({ tabs }: { tabs: FormTab[] }) {
  const t = useT();
  return (
    <TabsList className="w-full sm:w-fit">
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value} className="sm:min-w-32">
          {tab.label}
          {tab.error ? (
            <span
              className="size-2 shrink-0 rounded-full bg-danger"
              role="img"
              aria-label={t("roles.tabHasErrors")}
              data-testid={`${tab.value}-tab-error`}
            />
          ) : null}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
