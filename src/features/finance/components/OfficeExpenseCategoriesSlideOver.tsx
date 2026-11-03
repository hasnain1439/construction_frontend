"use client";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateOfficeExpenseCategoryMutation,
  useDeleteOfficeExpenseCategoryMutation,
  useGetOfficeExpenseCategoriesQuery,
  useRenameOfficeExpenseCategoryMutation,
} from "@/api/services/officeExpenses.api";
import type { OfficeExpenseCategory } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { QueryState } from "@/components/common/QueryState";
import { RowActions } from "@/components/common/RowActions";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";

const MAX_NAME = 60;

/** Rename one category; a name another category already has is refused (CATEGORY_EXISTS). */
function RenameDialog({ category, onClose }: { category: OfficeExpenseCategory; onClose: () => void }) {
  const t = useT();
  const [rename, { isLoading }] = useRenameOfficeExpenseCategoryMutation();
  const run = useMutationToast();
  const [name, setName] = useState(category.name);
  const trimmed = name.trim();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("cashSite.office.renameCategoryTitle", { name: category.name })}
      description={t("cashSite.office.renameCategoryHint")}
      confirmLabel={t("common.save")}
      loading={isLoading}
      confirmDisabled={!trimmed || trimmed === category.name}
      onConfirm={async () => {
        const ok = await run(() => rename({ id: category.id, name: trimmed }).unwrap(), {
          success: t("cashSite.office.categoryRenamed"),
        });
        if (ok) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="office-category-rename">{t("cashSite.office.categoryName")}</Label>
        <Input
          id="office-category-rename"
          value={name}
          maxLength={MAX_NAME}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

/**
 * Office Expenses → Manage categories: the company's own list (Rent, Salaries …). Add, rename or
 * delete; old expenses keep the name of a deleted category. Only for `finance.officeexpense.manage`.
 */
export function OfficeExpenseCategoriesSlideOver({ onClose }: { onClose: () => void }) {
  const t = useT();
  const query = useGetOfficeExpenseCategoriesQuery();
  const [create, { isLoading: adding }] = useCreateOfficeExpenseCategoryMutation();
  const [remove, { isLoading: removing }] = useDeleteOfficeExpenseCategoryMutation();
  const run = useMutationToast();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<OfficeExpenseCategory | null>(null);
  const [deleting, setDeleting] = useState<OfficeExpenseCategory | null>(null);
  const trimmed = name.trim();

  const add = async () => {
    if (!trimmed) return;
    const ok = await run(() => create({ name: trimmed }).unwrap(), {
      success: t("cashSite.office.categoryAdded", { name: trimmed }),
    });
    if (ok) setName("");
  };

  return (
    <>
      <SlideOver
        open
        onOpenChange={(o) => !o && onClose()}
        title={t("cashSite.office.categoriesTitle")}
        description={t("cashSite.office.categoriesDesc")}
      >
        <div className="space-y-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="office-category-new">{t("cashSite.office.newCategory")}</Label>
              <Input
                id="office-category-new"
                value={name}
                maxLength={MAX_NAME}
                placeholder={t("cashSite.office.categoryPlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!trimmed || adding}>
              <Plus data-icon="inline-start" />
              {t("common.add")}
            </Button>
          </form>
          <QueryState query={query}>
            {(categories) =>
              categories.length ? (
                <ul className="divide-y rounded-xl border">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            c.expenseCount === 1 ? "cashSite.office.oneExpense" : "cashSite.office.nExpenses",
                            {
                              n: c.expenseCount,
                            },
                          )}
                        </p>
                      </div>
                      <RowActions
                        name={c.name}
                        actions={[
                          {
                            label: t("cashSite.office.renameCategory"),
                            icon: Pencil,
                            onSelect: () => setRenaming(c),
                          },
                          {
                            label: t("common.delete"),
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeleting(c),
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={t("cashSite.office.noCategories")} icon={Tags} compact />
              )
            }
          </QueryState>
        </div>
      </SlideOver>
      {renaming ? (
        <RenameDialog key={renaming.id} category={renaming} onClose={() => setRenaming(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          tone="danger"
          title={t("cashSite.office.deleteCategoryTitle", { name: deleting.name })}
          description={t("cashSite.office.deleteCategoryDesc")}
          confirmLabel={t("common.delete")}
          loading={removing}
          onConfirm={async () => {
            const ok = await run(() => remove(deleting.id).unwrap(), {
              success: t("cashSite.office.categoryDeleted", { name: deleting.name }),
            });
            if (ok) setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
