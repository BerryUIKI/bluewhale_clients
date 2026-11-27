import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryDto, CategoryGroupDto, CategoryKindDto, MasterDataDto } from "@bluewhale/ipc";
import {
  useCategoryGroupUpdate,
  useCategoryUpdate,
  useMasterData,
} from "../../lib/master-data-queries";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryGroupFormDialog } from "./category-group-form-dialog";
import { categoryGroupUpdateRequest, categoryUpdateRequest } from "./requests";
import { MasterDataBoundary, MasterDataErrorAlert, PageHeader, ShowArchived } from "./shared";

type GroupDialogState = { kind: CategoryKindDto; group: CategoryGroupDto | null };
type CategoryDialogState = { kind: CategoryKindDto; category: CategoryDto | null };

/** Lists the two-level expense and income categories with archive controls. */
export function CategoriesPage() {
  const { t } = useTranslation();
  const query = useMasterData();
  const updateGroup = useCategoryGroupUpdate();
  const updateCategory = useCategoryUpdate();
  const [showArchived, setShowArchived] = useState(false);
  const [groupDialog, setGroupDialog] = useState<GroupDialogState | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState | null>(null);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("categories.title")} subtitle={t("categories.subtitle")} />

      <MasterDataBoundary query={query}>
        {(data) => (
          <>
            {updateGroup.isError ? <MasterDataErrorAlert error={updateGroup.error} /> : null}
            {updateCategory.isError ? <MasterDataErrorAlert error={updateCategory.error} /> : null}

            <div className="flex justify-end">
              <ShowArchived checked={showArchived} onChange={setShowArchived} />
            </div>

            <CategoryKindSection
              kind="expense"
              data={data}
              showArchived={showArchived}
              updatePending={updateGroup.isPending || updateCategory.isPending}
              onNewGroup={() => setGroupDialog({ kind: "expense", group: null })}
              onEditGroup={(group) => setGroupDialog({ kind: "expense", group })}
              onNewCategory={() => setCategoryDialog({ kind: "expense", category: null })}
              onEditCategory={(category) => setCategoryDialog({ kind: "expense", category })}
              onToggleGroup={(group) =>
                updateGroup.mutate(categoryGroupUpdateRequest(group, !group.isArchived))
              }
              onToggleCategory={(category) =>
                updateCategory.mutate(categoryUpdateRequest(category, !category.isArchived))
              }
            />
            <CategoryKindSection
              kind="income"
              data={data}
              showArchived={showArchived}
              updatePending={updateGroup.isPending || updateCategory.isPending}
              onNewGroup={() => setGroupDialog({ kind: "income", group: null })}
              onEditGroup={(group) => setGroupDialog({ kind: "income", group })}
              onNewCategory={() => setCategoryDialog({ kind: "income", category: null })}
              onEditCategory={(category) => setCategoryDialog({ kind: "income", category })}
              onToggleGroup={(group) =>
                updateGroup.mutate(categoryGroupUpdateRequest(group, !group.isArchived))
              }
              onToggleCategory={(category) =>
                updateCategory.mutate(categoryUpdateRequest(category, !category.isArchived))
              }
            />

            {groupDialog ? (
              <CategoryGroupFormDialog
                key={groupDialog.group?.id ?? `new-${groupDialog.kind}`}
                open
                onOpenChange={(open) => {
                  if (!open) {
                    setGroupDialog(null);
                  }
                }}
                group={groupDialog.group}
                kind={groupDialog.kind}
              />
            ) : null}
            {categoryDialog ? (
              <CategoryFormDialog
                key={categoryDialog.category?.id ?? `new-${categoryDialog.kind}`}
                open
                onOpenChange={(open) => {
                  if (!open) {
                    setCategoryDialog(null);
                  }
                }}
                category={categoryDialog.category}
                kind={categoryDialog.kind}
                groups={data.categoryGroups}
              />
            ) : null}
          </>
        )}
      </MasterDataBoundary>
    </section>
  );
}

function CategoryKindSection({
  kind,
  data,
  showArchived,
  updatePending,
  onNewGroup,
  onEditGroup,
  onNewCategory,
  onEditCategory,
  onToggleGroup,
  onToggleCategory,
}: {
  kind: CategoryKindDto;
  data: MasterDataDto;
  showArchived: boolean;
  updatePending: boolean;
  onNewGroup: () => void;
  onEditGroup: (group: CategoryGroupDto) => void;
  onNewCategory: () => void;
  onEditCategory: (category: CategoryDto) => void;
  onToggleGroup: (group: CategoryGroupDto) => void;
  onToggleCategory: (category: CategoryDto) => void;
}) {
  const { t } = useTranslation();
  const groups = data.categoryGroups.filter((group) => group.kind === kind);
  const categories = data.categories.filter((category) => category.kind === kind);
  const visibleCategories = categories.filter((category) => showArchived || !category.isArchived);
  const visibleGroups = groups.filter(
    (group) =>
      showArchived ||
      !group.isArchived ||
      visibleCategories.some((category) => category.groupId === group.id),
  );
  const ungrouped = visibleCategories.filter((category) => !category.groupId);
  const headingId = `category-kind-${kind}`;

  const row = (category: CategoryDto) => (
    <li key={category.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{category.name}</span>
        {category.isArchived ? (
          <span className="badge badge-danger">{t("masterData.archived")}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onEditCategory(category)}
        >
          {t("masterData.edit")}
        </button>
        <button
          type="button"
          className="text-sm font-medium text-accent underline"
          disabled={updatePending}
          onClick={() => onToggleCategory(category)}
        >
          {category.isArchived ? t("masterData.restore") : t("masterData.archive")}
        </button>
      </div>
    </li>
  );

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {t(`categories.${kind}`)}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button" onClick={onNewCategory}>
            {t("categories.addCategory")}
          </button>
          <button type="button" className="button button-secondary" onClick={onNewGroup}>
            {t("categories.addGroup")}
          </button>
        </div>
      </div>

      {visibleGroups.length === 0 && ungrouped.length === 0 ? (
        <p className="text-sm text-muted">{t("categories.empty")}</p>
      ) : null}

      {visibleGroups.map((group) => {
        const groupCategories = visibleCategories.filter(
          (category) => category.groupId === group.id,
        );
        return (
          <div key={group.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{group.name}</h3>
                {group.isArchived ? (
                  <span className="badge badge-danger">{t("masterData.archived")}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onEditGroup(group)}
                >
                  {t("masterData.edit")}
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-accent underline"
                  disabled={updatePending}
                  onClick={() => onToggleGroup(group)}
                >
                  {group.isArchived ? t("masterData.restore") : t("masterData.archive")}
                </button>
              </div>
            </div>
            {groupCategories.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("categories.noCategoriesInGroup")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">{groupCategories.map(row)}</ul>
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 ? (
        <div className="rounded-lg border border-line bg-surface p-5">
          <h3 className="font-semibold">{t("categories.ungrouped")}</h3>
          <ul className="mt-3 divide-y divide-line">{ungrouped.map(row)}</ul>
        </div>
      ) : null}
    </section>
  );
}
