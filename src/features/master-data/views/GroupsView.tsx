"use client";

import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateMaterialGroupMutation,
  useDeleteMaterialGroupMutation,
  useGetMaterialGroupsQuery,
  useUpdateMaterialGroupMutation,
} from "@/api/services/masterData.api";
import type { MaterialGroup, MaterialSection } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";

/** Add (group = null) or edit one of the company's own groups. */
function GroupDialog({ group, onClose }: { group: MaterialGroup | null; onClose: () => void }) {
  const t = useT();
  const [create, { isLoading: creating }] = useCreateMaterialGroupMutation();
  const [update, { isLoading: updating }] = useUpdateMaterialGroupMutation();
  const run = useMutationToast();
  const [name, setName] = useState(group?.name ?? "");
  const [section, setSection] = useState<MaterialSection>(group?.section ?? "FINISHING");
  const trimmed = name.trim();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={group ? t("masterData.products.editGroup", { name: group.name }) : t("masterData.products.addGroup")}
      confirmLabel={t("common.save")}
      loading={creating || updating}
      confirmDisabled={trimmed.length < 2 || (trimmed === group?.name && section === group.section)}
      onConfirm={async () => {
        const result = group
          ? await run(() => update({ id: group.id, name: trimmed, section }).unwrap(), { success: t("masterData.products.groupSaved") })
          : await run(() => create({ name: trimmed, section }).unwrap(), { success: t("masterData.common.added", { name: trimmed }) });
        if (result) onClose();
      }}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">{t("masterData.products.groupName")}</Label>
          <Input id="group-name" value={name} maxLength={60} autoFocus placeholder={t("masterData.products.groupPlaceholder")} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("masterData.products.section")}</p>
          <SegmentedControl<MaterialSection>
            value={section}
            onChange={setSection}
            ariaLabel={t("masterData.products.section")}
            options={[
              { value: "CIVIL", label: t("masterData.products.civil") },
              { value: "FINISHING", label: t("masterData.products.finishing") },
            ]}
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}

/** Groups: the system's (read-only) and the company's own (add / edit / delete when empty). */
export function GroupsView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canAdd = useCan("masterdata.material.create") && !readOnly;
  const canManage = useCan("masterdata.material.manage") && !readOnly;
  const { data, isLoading, isFetching, error, refetch } = useGetMaterialGroupsQuery();
  const [remove, { isLoading: removing }] = useDeleteMaterialGroupMutation();
  const run = useMutationToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MaterialGroup | null>(null);
  const [deleting, setDeleting] = useState<MaterialGroup | null>(null);

  const columns: Column<MaterialGroup>[] = [
    { id: "name", header: t("masterData.products.groupName"), sortValue: (g) => g.name, cell: (g) => <span className="font-medium">{g.name}</span> },
    { id: "section", header: t("masterData.products.section"), cell: (g) => (g.section === "CIVIL" ? t("masterData.products.civil") : t("masterData.products.finishing")) },
    {
      id: "type",
      header: t("masterData.materials.source"),
      cell: (g) => <StatusBadge tone={g.isCustom ? "info" : "neutral"} label={g.isCustom ? t("masterData.products.company") : t("masterData.products.system")} />,
    },
    { id: "products", header: t("masterData.products.products"), align: "right", sortValue: (g) => g.productCount ?? 0, cell: (g) => <span className="tabular">{g.productCount ?? 0}</span> },
    { id: "brands", header: t("masterData.products.brandsCount"), align: "right", sortValue: (g) => g.brandCount ?? 0, cell: (g) => <span className="tabular">{g.brandCount ?? 0}</span> },
    {
      ...ACTIONS_COLUMN,
      hidden: !canManage,
      cell: (g) => (
        <RowActions
          name={g.name}
          actions={[
            { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(g), disabled: !g.isCustom, hint: g.isCustom ? undefined : t("masterData.products.systemGroup") },
            {
              label: t("common.delete"),
              icon: Trash2,
              destructive: true,
              disabled: !g.isCustom || (g.productCount ?? 0) > 0,
              hint: !g.isCustom ? t("masterData.products.systemGroup") : (g.productCount ?? 0) > 0 ? t("masterData.products.groupInUse") : undefined,
              onSelect: () => setDeleting(g),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.products.groupsTitle")}
        description={t("masterData.products.groupsDesc")}
        breadcrumbs={[{ label: t("crumb.suppliers") }, { label: t("masterData.products.groupsTitle") }]}
        actions={
          canAdd ? (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("masterData.products.addGroup")}
            </Button>
          ) : null
        }
      />
      <SectionCard flush>
        <DataTable rows={data} columns={columns} getRowId={(g) => g.id} loading={isLoading || isFetching} error={error} onRetry={refetch} clientPageSize={0} empty={{ title: t("masterData.common.empty"), icon: Layers }} />
      </SectionCard>
      {adding ? <GroupDialog group={null} onClose={() => setAdding(false)} /> : null}
      {editing ? <GroupDialog key={editing.id} group={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={t("masterData.common.deleteTitle", { name: deleting?.name ?? "" })}
        confirmLabel={t("common.delete")}
        loading={removing}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await run(() => remove(deleting.id).unwrap(), { success: t("masterData.common.deleted", { name: deleting.name }) });
          if (ok) setDeleting(null);
        }}
      />
    </>
  );
}
