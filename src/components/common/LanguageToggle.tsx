"use client";

import { useT } from "@/i18n/useT";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLanguage, type UiLanguage } from "@/store/slices/uiSlice";
import { SegmentedControl } from "./SegmentedControl";

/** English · Roman Urdu · Urdu for navigation and common UI. */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.ui.language);
  return (
    <SegmentedControl<UiLanguage>
      ariaLabel={t("shell.language")}
      size="sm"
      value={language}
      onChange={(value) => dispatch(setLanguage(value))}
      options={[
        { value: "en", label: "English" },
        { value: "roman-ur", label: "Roman Urdu" },
        { value: "ur", label: "اردو" },
      ]}
      className={className}
    />
  );
}
