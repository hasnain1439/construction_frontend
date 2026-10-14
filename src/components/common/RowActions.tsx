"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, useRef, useState, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isRtl, useLanguage, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  /** Runs when the item is chosen (not needed for `href` or `confirm` items). */
  onSelect?: () => void;
  /** Red item (deactivate, cancel, bounced …). */
  destructive?: boolean;
  disabled?: boolean;
  /** Left out of the menu (permission / status checks). */
  hidden?: boolean;
  /** Renders the item as a link. */
  href?: string;
  /** Draws a divider above this item. */
  separatorBefore?: boolean;
  /** Small second line under the label, e.g. why an item is disabled. */
  hint?: string;
  /**
   * Ask first: choosing the item opens a confirm dialog, `confirm.onConfirm` runs on confirm and
   * the dialog closes once it resolves (it stays open if it throws).
   */
  confirm?: Omit<ConfirmDialogProps, "open" | "onOpenChange">;
}

export interface RowActionsProps {
  actions: RowAction[];
  /** Row name for the trigger's accessible label ("Actions for Ali Town"). */
  name?: string;
  /** Overrides the trigger's accessible label. */
  label?: string;
  className?: string;
}

/** Shared props of a DataTable "actions" column: narrow, end-aligned, header only for screen readers. */
export const ACTIONS_COLUMN = {
  id: "actions",
  header: <ActionsHeader />,
  align: "right",
  className: "w-28 whitespace-nowrap px-2",
  headerClassName: "w-28",
} as const;

/** Screen-reader-only "Actions" header (a component so it follows the language). */
function ActionsHeader() {
  const t = useT();
  return <span className="sr-only">{t("common.actions")}</span>;
}

const stop = (e: SyntheticEvent) => e.stopPropagation();

/**
 * One "⋯" button at the end of a table row that opens a menu with all of the row's actions.
 * Renders nothing when no action is visible. Clicks and keys never reach the row (`onRowClick`).
 */
export function RowActions({ actions, name, label, className }: RowActionsProps) {
  const t = useT();
  const language = useLanguage();
  const [confirming, setConfirming] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  const confirmAction = confirming ? visible.find((a) => a.label === confirming && a.confirm) : undefined;
  const triggerLabel = label ?? (name ? t("common.rowActionsFor", { name }) : t("common.actions"));

  return (
    <div className={cn("flex justify-end", className)} onClick={stop} onKeyDown={stop}>
      <DropdownMenu modal={false} dir={isRtl(language) ? "rtl" : "ltr"}>
        <DropdownMenuTrigger asChild>
          {/* A labelled button ("Actions ⌄") in solid brand sand, like the highlighted dashboard tile (charcoal while its menu is open). */}
          <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full bg-sand px-3 text-xs font-semibold text-charcoal shadow-sm hover:bg-sand/85 hover:text-charcoal dark:hover:bg-sand/85 dark:hover:text-charcoal data-[state=open]:bg-charcoal data-[state=open]:text-white dark:data-[state=open]:bg-foreground dark:data-[state=open]:text-background" aria-label={triggerLabel} data-testid="row-actions">
            {t("common.actions")}
            <ChevronDown className="size-3.5 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          ref={contentRef}
          align="end"
          className="w-auto min-w-40"
          onCloseAutoFocus={(e) => {
            // An item opened a dialog / slide-over that took focus: don't pull it back to the trigger.
            const active = document.activeElement;
            if (active && active !== document.body && !contentRef.current?.contains(active)) e.preventDefault();
          }}
        >
          {visible.map((action, index) => {
            const Icon = action.icon;
            const body = (
              <>
                {Icon ? <Icon aria-hidden /> : null}
                {action.hint ? (
                  <span className="flex flex-col">
                    <span>{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.hint}</span>
                  </span>
                ) : (
                  action.label
                )}
              </>
            );
            const variant = action.destructive ? "destructive" : "default";
            return (
              <Fragment key={`${action.label}-${index}`}>
                {action.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
                {action.href && !action.disabled ? (
                  <DropdownMenuItem asChild variant={variant}>
                    <Link href={action.href}>{body}</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant={variant}
                    disabled={action.disabled}
                    onSelect={() => {
                      if (action.confirm) setConfirming(action.label);
                      else action.onSelect?.();
                    }}
                  >
                    {body}
                  </DropdownMenuItem>
                )}
              </Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmAction?.confirm ? (
        <ConfirmDialog
          {...confirmAction.confirm}
          open
          onOpenChange={(open) => (!open ? setConfirming(null) : undefined)}
          onConfirm={async () => {
            try {
              await confirmAction.confirm!.onConfirm();
              setConfirming(null);
            } catch {
              // Keep the dialog open so the user can retry; the caller shows the error.
            }
          }}
        />
      ) : null}
    </div>
  );
}
